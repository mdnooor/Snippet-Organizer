/**
 * POPUP-REFRESH-01 tests — the popup Refresh orchestrator (src/popupRefresh.ts).
 *
 * The project's test framework is node:test with no React testing layer, so
 * TSX rendering/clicks are covered by lint+build+manual steps instead. What
 * IS unit-tested here is the refresh behavior contract:
 *   - refresh runs loadData + probe exactly once per click;
 *   - concurrent refreshes are single-flight (duplicate clicks are no-ops);
 *   - onBegin/onEnd fire exactly once per attempt, including on failure
 *     (spinners/button state always recover);
 *   - loadData and probe failures are funneled to onError without throwing
 *     and without blocking the other step;
 *   - the orchestrator never touches the Drive intent store, tokens, or
 *     snapshots — Drive access is ONLY the injected probe (the non-interactive
 *     one honoring `gdriveUserDisconnected`; pinned by gdrive-connection
 *     tests). The stubs below assert zero extra calls beyond the injected ones.
 *
 * Run: npx.cmd tsx tests/popup-refresh.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createPopupRefresh, type PopupRefreshDeps } from '../src/popupRefresh';

interface Harness {
  loadDataCalls: number;
  probeCalls: number;
  beginCalls: number;
  endCalls: number;
  errors: unknown[];
  failLoadData: Error | null;
  failProbe: Error | null;
  /** TURN-18: wall-clock ms when loadData's work actually finished applying. */
  loadDataSettledAt: number;
  controller: ReturnType<typeof createPopupRefresh>;
}

function makeHarness(options: { holdLoadData?: Promise<void>; holdProbe?: Promise<void> } = {}): Harness {
  const h: Harness = {
    loadDataCalls: 0,
    probeCalls: 0,
    beginCalls: 0,
    endCalls: 0,
    errors: [],
    failLoadData: null,
    failProbe: null,
    loadDataSettledAt: 0,
    controller: null as unknown as ReturnType<typeof createPopupRefresh>,
  };
  const deps: PopupRefreshDeps = {
    loadData: async () => {
      h.loadDataCalls += 1;
      if (options.holdLoadData) await options.holdLoadData;
      if (h.failLoadData) throw h.failLoadData;
      h.loadDataSettledAt = Date.now();
    },
    probe: async () => {
      h.probeCalls += 1;
      if (options.holdProbe) await options.holdProbe;
      if (h.failProbe) throw h.failProbe;
    },
    onBegin: () => {
      h.beginCalls += 1;
    },
    onEnd: () => {
      h.endCalls += 1;
    },
    onError: (error) => {
      h.errors.push(error);
    },
  };
  h.controller = createPopupRefresh(deps);
  return h;
}

test('refresh: runs loadData + probe once and reports success; begin/end fire once', async () => {
  const h = makeHarness();
  const result = await h.controller.refresh();
  assert.equal(result, true);
  assert.equal(h.loadDataCalls, 1);
  assert.equal(h.probeCalls, 1);
  assert.equal(h.beginCalls, 1);
  assert.equal(h.endCalls, 1);
  assert.deepEqual(h.errors, []);
  assert.equal(h.controller.isRunning(), false, 'state must recover after success');
});

test('refresh: is single-flight — a concurrent second click is a no-op', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const h = makeHarness({ holdLoadData: gate });
  const first = h.controller.refresh(); // starts; loadData is held open
  assert.equal(h.controller.isRunning(), true);

  const second = await h.controller.refresh(); // duplicate click while running
  assert.equal(second, false, 'duplicate refresh must be skipped, not queued');
  assert.equal(h.loadDataCalls, 1, 'no second loadData while the first runs');
  // TURN-17: local and cloud steps now run CONCURRENTLY (allSettled), so the
  // probe legitimately starts while loadData is still in flight — the point
  // is that NEITHER operation is started twice.
  assert.equal(h.probeCalls, 1, 'exactly one probe (started concurrently)');
  assert.equal(h.beginCalls, 1, 'no extra spinner state for the skipped click');

  release();
  const firstResult = await first;
  assert.equal(firstResult, true);
  assert.equal(h.endCalls, 1);
  assert.equal(h.controller.isRunning(), false);
});

test('refresh: local and cloud steps run concurrently — a hung probe never blocks the local reload', async () => {
  let releaseProbe!: () => void;
  const probeGate = new Promise<void>((resolve) => {
    releaseProbe = resolve;
  });
  const h = makeHarness({ holdProbe: probeGate });
  const pending = h.controller.refresh();
  // Give the microtask queue a tick so both steps have actually started.
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(h.loadDataCalls, 1, 'local reload started immediately');
  assert.equal(h.probeCalls, 1, 'cloud/connection check started immediately');
  assert.equal(h.controller.isRunning(), true, 'still settling the hung probe');

  releaseProbe();
  const result = await pending;
  assert.equal(result, true, 'both steps succeeded once the probe settled');
  assert.equal(h.endCalls, 1);
});

test('refresh: TURN-18 regression — a near-instant disconnected-style refresh still shows a visible spinner window', async () => {
  // Simulates State B: probe honors the disconnect flag (instant, zero work)
  // and IndexedDB reads resolve in milliseconds. Without a floor the whole
  // refresh settles before the rotation is perceivable — the reported
  // "no reliable feedback while disconnected" defect.
  const floorMs = 120;
  const h = makeHarness();
  const startedAt = Date.now();
  const result = await createPopupRefresh(
    {
      loadData: async () => {
        h.loadDataCalls += 1;
        h.loadDataSettledAt = Date.now();
      },
      probe: async () => {
        h.probeCalls += 1;
      },
      onBegin: () => {
        h.beginCalls += 1;
      },
      onEnd: () => {
        h.endCalls += 1;
      },
    },
    { minDurationMs: floorMs },
  ).refresh();
  const elapsed = Date.now() - startedAt;
  assert.equal(result, true);
  assert.equal(h.loadDataCalls, 1, 'the REAL local read still ran (no timer-only fake)');
  assert.equal(h.probeCalls, 1);
  assert.ok(elapsed >= floorMs, `feedback must stay visible >= ${floorMs}ms, was ${elapsed}ms`);
  assert.equal(h.endCalls, 1);
});

test('refresh: TURN-18 — the minimum duration never delays the data itself', async () => {
  const floorMs = 120;
  const h = makeHarness();
  const startedAt = Date.now();
  const controller = createPopupRefresh(
    {
      loadData: async () => {
        h.loadDataCalls += 1;
        h.loadDataSettledAt = Date.now();
      },
      probe: async () => {
        h.probeCalls += 1;
      },
      onBegin: () => {
        h.beginCalls += 1;
      },
      onEnd: () => {
        h.endCalls += 1;
      },
    },
    { minDurationMs: floorMs },
  );
  await controller.refresh();
  const elapsed = Date.now() - startedAt;
  // Data applied long before the visual floor elapsed:
  assert.ok(h.loadDataSettledAt - startedAt < floorMs, 'loadData must settle before the floor');
  assert.ok(elapsed >= floorMs, 'feedback end waits out the floor');
  assert.equal(h.loadDataCalls, 1);
  assert.equal(h.probeCalls, 1);
});

test('refresh: loadData failure → onError once, probe still attempted, state recovers', async () => {
  const h = makeHarness();
  h.failLoadData = new Error('db closed');
  const result = await h.controller.refresh();
  assert.equal(result, false);
  assert.equal(h.probeCalls, 1, 'connection refresh must not be blocked by a data failure');
  assert.equal(h.beginCalls, 1);
  assert.equal(h.endCalls, 1, 'loading indicator must always stop');
  assert.equal(h.errors.length, 1);
  assert.equal((h.errors[0] as Error).message, 'db closed');
  // A later refresh works again — the popup is never permanently disabled.
  h.failLoadData = null;
  assert.equal(await h.controller.refresh(), true);
});

test('refresh: probe failure → onError once, no throw, state recovers', async () => {
  const h = makeHarness();
  h.failProbe = new Error('probe exploded');
  const result = await h.controller.refresh();
  assert.equal(result, false);
  assert.deepEqual(
    h.errors.map((e) => (e as Error).message),
    ['probe exploded'],
  );
  assert.equal(h.endCalls, 1);
  assert.equal(h.controller.isRunning(), false);
});

test('refresh: Drive safety by composition — the orchestrator only calls the injected steps', async () => {
  const h = makeHarness();
  await h.controller.refresh();
  // Total external interactions of a refresh attempt: exactly one loadData and
  // one probe. Nothing else exists for it to call — no intent-store access, no
  // authorize, no Drive fetch, no snapshot create/delete/restore/upload.
  assert.deepEqual(
    { loadData: h.loadDataCalls, probe: h.probeCalls, begin: h.beginCalls, end: h.endCalls },
    { loadData: 1, probe: 1, begin: 1, end: 1 },
  );
  assert.deepEqual(h.errors, []);
});
