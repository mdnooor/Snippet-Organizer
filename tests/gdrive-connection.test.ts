/**
 * PR-1 tests — Drive connection probe (src/gdrive/connection.ts).
 *
 * Covers the real-state lifecycle the UI now depends on:
 *  - startup verification WITHOUT prompting (silent getAuthToken only);
 *  - cached-grant persistence semantics (restart ⇒ still connected);
 *  - revoked/expired tokens ⇒ one silent retry after cache clear, then honest
 *    'disconnected' (Connect is offered, nothing is fabricated);
 *  - account identity via Drive about.get with the EXISTING drive.appdata
 *    scope (no extra scopes/permissions) — email/photo parsed, https-only;
 *  - precise Drive failure reasons (rate limit ≠ permissions ≠ offline).
 *
 * Run: npx.cmd tsx tests/gdrive-connection.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PLACEHOLDER_CLIENT_ID, DRIVE_APPDATA_SCOPE, type AuthResult, type ManifestLike } from '../src/gdrive/auth';
import { createConnectionProbe, createChromeConnectionIntentStore, USER_DISCONNECTED_STORAGE_KEY, type ConnectionIntentStore, type ConnectionProbeDeps } from '../src/gdrive/connection';

const REAL_CLIENT_ID = '1234567890-abcdefabcdefabcdefabcdefabcdef.apps.googleusercontent.com';
const ABOUT_HOST = 'https://www.googleapis.com/drive/v3/about';

function configuredManifest(clientId: string = REAL_CLIENT_ID): ManifestLike {
  return { oauth2: { client_id: clientId, scopes: [DRIVE_APPDATA_SCOPE] }, permissions: ['storage', 'identity'] };
}

interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
}

interface ProbeStub {
  deps: ConnectionProbeDeps;
  authorizeCalls: Array<{ interactive: boolean }>;
  removedTokens: string[];
  requests: RecordedRequest[];
}

interface StubOptions {
  manifest?: ManifestLike | null;
  /** Auth results returned in order (last one repeats). */
  auth?: AuthResult[];
  /** Drive about.get responder. */
  respond?: (req: RecordedRequest, index: number) => Response;
  /** Make the underlying fetch throw instead of responding. */
  fetchThrows?: Error;
  /** Persisted user disconnect intent (PR-1b). */
  intent?: ConnectionIntentStore;
}

function makeProbeStub(options: StubOptions = {}): ProbeStub {
  const authResults = options.auth ?? [{ status: 'authorized', token: 'tok-1' } as AuthResult];
  let authIndex = 0;
  const stub: ProbeStub = {
    authorizeCalls: [],
    removedTokens: [],
    requests: [],
    deps: {
      authorize: async (opts) => {
        stub.authorizeCalls.push({ interactive: opts.interactive });
        const result = authResults[Math.min(authIndex, authResults.length - 1)]!;
        authIndex += 1;
        return result;
      },
      getManifest: () => (options.manifest === undefined ? configuredManifest() : options.manifest),
      removeCachedAuthToken: async (details) => {
        stub.removedTokens.push(details.token);
      },
      connectionIntent: options.intent,
      fetchImpl: async (input, init) => {
        if (options.fetchThrows) throw options.fetchThrows;
        const req: RecordedRequest = {
          url: String(input),
          method: init?.method ?? 'GET',
          headers: Object.fromEntries(Object.entries(init?.headers ?? {}).map(([k, v]) => [k, String(v)])),
        };
        const index = stub.requests.push(req) - 1;
        return options.respond ? options.respond(req, index) : new Response('{}', { status: 200 });
      },
    },
  };
  return stub;
}

function aboutOk(user: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ user }), { status: 200 });
}

// ---------------------------------------------------------------------------
// Config gate + never-prompt contract
// ---------------------------------------------------------------------------

test('probe: missing/placeholder manifest → setup-needed, zero Chrome account calls', async () => {
  for (const manifest of [null, configuredManifest(PLACEHOLDER_CLIENT_ID), { oauth2: {} } as ManifestLike]) {
    const stub = makeProbeStub({ manifest });
    const state = await createConnectionProbe(stub.deps).probe();
    assert.equal(state.status, 'setup-needed');
    assert.equal(stub.authorizeCalls.length, 0, 'no auth call when config is broken');
    assert.equal(stub.requests.length, 0);
  }
});

test('probe: EVERY auth call is non-interactive — startup check can never prompt', async () => {
  const stub = makeProbeStub({
    auth: [{ status: 'interaction-required', message: 'Interaction required.' } as AuthResult],
  });
  await createConnectionProbe(stub.deps).probe();
  assert.ok(stub.authorizeCalls.length >= 1);
  for (const call of stub.authorizeCalls) assert.equal(call.interactive, false);
});

// ---------------------------------------------------------------------------
// Startup lifecycle: cached grant, denied, silent failure
// ---------------------------------------------------------------------------

test('probe: valid cached grant + working Drive → connected with identity (restart scenario)', async () => {
  const stub = makeProbeStub({
    respond: () =>
      aboutOk({ emailAddress: 'person@example.com', displayName: 'Test Person', photoLink: 'https://lh3.googleusercontent.com/a/ac=ABCD' }),
  });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.deepEqual(state, {
    status: 'connected',
    account: { email: 'person@example.com', displayName: 'Test Person', photoUrl: 'https://lh3.googleusercontent.com/a/ac=ABCD' },
  });
  // One silent token check + exactly one Drive identity call, authorized.
  assert.equal(stub.authorizeCalls.length, 1);
  assert.equal(stub.requests.length, 1);
  const req = stub.requests[0]!;
  assert.ok(req.url.startsWith(ABOUT_HOST), req.url);
  // URLSearchParams encodes parens/commas in the fields expression — assert
  // the exact runtime-encoded form; Drive decodes it identically server-side.
  assert.ok(req.url.includes('fields=user%28displayName%2CemailAddress%2CphotoLink%29'), req.url);
  assert.equal(req.method, 'GET');
  assert.equal(req.headers['Authorization'], 'Bearer tok-1');
});

test('probe: previously denied → disconnected (reason denied), no Drive call', async () => {
  const stub = makeProbeStub({ auth: [{ status: 'denied' } as AuthResult] });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.deepEqual(state, { status: 'disconnected', reason: 'denied', message: null });
  assert.equal(stub.requests.length, 0);
});

test('probe: silent auth needs interaction (never auto-prompted) → disconnected with re-confirm hint', async () => {
  const stub = makeProbeStub({ auth: [{ status: 'interaction-required', message: 'Interaction required.' } as AuthResult] });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.equal(state.status, 'disconnected');
  if (state.status === 'disconnected') {
    assert.equal(state.reason, 'interaction-required');
    assert.match(state.message ?? '', /re-confirm/i);
  }
});

test('probe: silent auth hard error → disconnected (reason error, message preserved)', async () => {
  const stub = makeProbeStub({ auth: [{ status: 'error', message: 'OAuth client was deleted.' } as AuthResult] });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.deepEqual(state, { status: 'disconnected', reason: 'error', message: 'OAuth client was deleted.' });
});

// ---------------------------------------------------------------------------
// Revoked/expired cached token: clear + one silent retry, then honest failure
// ---------------------------------------------------------------------------

test('probe: about.get 401 → cached token cleared, silent re-auth retried once, then connected', async () => {
  const stub = makeProbeStub({
    auth: [
      { status: 'authorized', token: 'stale-token' } as AuthResult,
      { status: 'authorized', token: 'fresh-token' } as AuthResult,
    ],
    respond: (_req, index) =>
      index === 0
        ? new Response(JSON.stringify({ error: { code: 401, message: 'Invalid Credentials', errors: [{ reason: 'authError' }] } }), { status: 401 })
        : aboutOk({ emailAddress: 'person@example.com' }),
  });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.equal(state.status, 'connected');
  if (state.status === 'connected') assert.equal(state.account.email, 'person@example.com');
  assert.deepEqual(stub.removedTokens, ['stale-token']);
  assert.equal(stub.authorizeCalls.length, 2);
  for (const call of stub.authorizeCalls) assert.equal(call.interactive, false);
  assert.equal(stub.requests[1]!.headers['Authorization'], 'Bearer fresh-token');
});

test('probe: 401 and silent re-auth cannot recover → disconnected (Connect offered honestly)', async () => {
  const stub = makeProbeStub({
    auth: [
      { status: 'authorized', token: 'stale-token' } as AuthResult,
      { status: 'interaction-required', message: 'Interaction required.' } as AuthResult,
    ],
    respond: () => new Response(JSON.stringify({ error: { code: 401, message: 'Invalid Credentials' } }), { status: 401 }),
  });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.deepEqual(state, {
    status: 'disconnected',
    reason: 'interaction-required',
    message: 'Google needs you to re-confirm access — click Connect.',
  });
  assert.deepEqual(stub.removedTokens, ['stale-token']);
});

test('probe: 401 persists through the one retry → disconnected, no endless loop', async () => {
  const stub = makeProbeStub({
    auth: [
      { status: 'authorized', token: 'tok-a' } as AuthResult,
      { status: 'authorized', token: 'tok-b' } as AuthResult,
    ],
    respond: () => new Response(JSON.stringify({ error: { code: 401, message: 'Invalid Credentials' } }), { status: 401 }),
  });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.equal(state.status, 'disconnected');
  assert.equal(stub.authorizeCalls.length, 2, 'exactly one silent retry');
  assert.equal(stub.requests.length, 2, 'exactly two Drive calls');
});

// ---------------------------------------------------------------------------
// Precise Drive failures (Task: not every error is "permissions")
// ---------------------------------------------------------------------------

test('probe: 403 insufficientPermissions → connection-error with Drive-API/test-user guidance', async () => {
  const stub = makeProbeStub({
    respond: () =>
      new Response(JSON.stringify({ error: { code: 403, message: 'The user does not have sufficient permissions', errors: [{ reason: 'insufficientPermissions' }] } }), { status: 403 }),
  });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.equal(state.status, 'connection-error');
  if (state.status === 'connection-error') assert.match(state.message, /Drive API|Test user/i);
});

test('probe: 403 rateLimitExceeded → connection-error with rate-limit message (NOT permissions)', async () => {
  const stub = makeProbeStub({
    respond: () =>
      new Response(JSON.stringify({ error: { code: 403, message: 'Rate limit exceeded', errors: [{ reason: 'rateLimitExceeded' }] } }), { status: 403 }),
  });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.equal(state.status, 'connection-error');
  if (state.status === 'connection-error') {
    assert.match(state.message, /rate limit/i);
    assert.doesNotMatch(state.message, /permission/i);
  }
});

test('probe: unknown 403 reason surfaces the reason verbatim; 5xx surfaces HTTP status', async () => {
  const forbidden = await createConnectionProbe(
    makeProbeStub({
      respond: () =>
        new Response(JSON.stringify({ error: { code: 403, message: 'Denied', errors: [{ reason: 'appNotAuthorizedForFile' }] } }), { status: 403 }),
    }).deps,
  ).probe();
  assert.equal(forbidden.status, 'connection-error');
  if (forbidden.status === 'connection-error') assert.match(forbidden.message, /appNotAuthorizedForFile/);

  const serverError = await createConnectionProbe(
    makeProbeStub({
      respond: () => new Response(JSON.stringify({ error: { code: 500, message: 'Backend Error' } }), { status: 500 }),
    }).deps,
  ).probe();
  assert.equal(serverError.status, 'connection-error');
  if (serverError.status === 'connection-error') assert.match(serverError.message, /500|Backend/);
});

test('probe: offline (fetch throws) → connection-error, NOT falsely disconnected', async () => {
  const stub = makeProbeStub({ fetchThrows: new Error('Failed to fetch') });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.equal(state.status, 'connection-error');
  if (state.status === 'connection-error') assert.match(state.message, /reach Google Drive|connection/i);
});

// ---------------------------------------------------------------------------
// Identity hygiene
// ---------------------------------------------------------------------------

test('probe: identity fields missing or non-https photo → nulls, still connected', async () => {
  const stub = makeProbeStub({
    respond: () => aboutOk({ emailAddress: '', photoLink: 'http://insecure.example/pic.jpg', displayName: 'Only Name' }),
  });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.deepEqual(state, {
    status: 'connected',
    account: { email: null, displayName: 'Only Name', photoUrl: null },
  });
});

// ---------------------------------------------------------------------------
// PR-1b — persisted user-requested disconnect beats Chrome's token cache
// ---------------------------------------------------------------------------

function recordingIntentStore(initial: boolean): ConnectionIntentStore & { writes: boolean[] } {
  let value = initial;
  const writes: boolean[] = [];
  return {
    writes,
    get: async () => value,
    set: async (v: boolean) => {
      value = v;
      writes.push(v);
    },
  };
}

test('PR-1b probe: persisted user disconnect wins over a valid cached token — zero auth, zero network', async () => {
  const intent = recordingIntentStore(true);
  const stub = makeProbeStub({ intent });
  // The silent token path would SUCCEED here (grant still valid at Google —
  // exactly the reported bug); the persisted intent must short-circuit it.
  const state = await createConnectionProbe(stub.deps).probe();
  assert.deepEqual(state, {
    status: 'disconnected',
    reason: 'user-requested',
    message: 'You disconnected Google Drive. Click Connect to reconnect.',
  });
  assert.equal(stub.authorizeCalls.length, 0, 'no token lookup may run while the user is disconnected');
  assert.equal(stub.requests.length, 0, 'no Drive call may run while the user is disconnected');
  assert.equal(stub.removedTokens.length, 0);
});

test('PR-1b: a freshly minted silent token cannot override the persisted disconnect (popup-reopen simulation)', async () => {
  // Simulates the full bug: disconnect persisted → popup closes (all UI state
  // gone) → popup reopens and probes with a FRESH probe instance. Chrome hands
  // out a brand-new silent token (auth stub returns authorized) — still must
  // not reconnect.
  const intent = recordingIntentStore(true);
  const deps: ConnectionProbeDeps = makeProbeStub({ intent, respond: () => aboutOk({ emailAddress: 'person@example.com' }) }).deps;
  const firstOpen = await createConnectionProbe(deps).probe();
  assert.equal(firstOpen.status, 'disconnected');
  // Reopen = brand-new probe object, same persisted store.
  const reopened = await createConnectionProbe(deps).probe();
  assert.equal(reopened.status, 'disconnected');
  if (reopened.status === 'disconnected') assert.equal(reopened.reason, 'user-requested');
});

test('PR-1b: explicit Connect clears the persisted intent and permits reconnection', async () => {
  const intent = recordingIntentStore(true);
  const stub = makeProbeStub({ intent, respond: () => aboutOk({ emailAddress: 'person@example.com' }) });
  const before = await createConnectionProbe(stub.deps).probe();
  assert.equal(before.status, 'disconnected');
  // The Connect click clears the intent (UI handler) BEFORE authorizing.
  await intent.set(false);
  assert.deepEqual(intent.writes, [false]);
  const after = await createConnectionProbe(stub.deps).probe();
  assert.equal(after.status, 'connected');
  if (after.status === 'connected') assert.equal(after.account.email, 'person@example.com');
});

test('PR-1b probe: storage read failure is treated as NOT disconnected — probe proceeds honestly', async () => {
  const failingIntent: ConnectionIntentStore = {
    get: () => Promise.reject(new Error('storage unavailable')),
    set: async () => {},
  };
  const stub = makeProbeStub({ intent: failingIntent, respond: () => aboutOk({ emailAddress: 'person@example.com' }) });
  const state = await createConnectionProbe(stub.deps).probe();
  assert.equal(state.status, 'connected');
});

test('PR-1b chrome intent store: roundtrip via chrome.storage.local; missing/broken API degrades safely', async () => {
  // 1. No chrome API (plain node) → false, set never throws.
  const bare = createChromeConnectionIntentStore();
  assert.equal(await bare.get(), false);
  await assert.doesNotReject(bare.set(true));
  assert.equal(await bare.get(), false);

  // 2. Fake chrome.storage.local — real roundtrip.
  const saved: Array<Record<string, unknown>> = [];
  (globalThis as unknown as { chrome?: unknown }).chrome = {
    storage: {
      local: {
        get: (keys: string[], cb: (items: Record<string, unknown>) => void) => {
          const hit: Record<string, unknown> = {};
          for (const key of keys) {
            const last = saved[saved.length - 1];
            if (last && key in last) hit[key] = last[key];
          }
          cb(hit);
        },
        set: (items: Record<string, unknown>, cb: () => void) => {
          saved.push(items);
          cb();
        },
      },
    },
  };
  try {
    const store = createChromeConnectionIntentStore();
    assert.equal(await store.get(), false, 'unset key reads false');
    await store.set(true);
    assert.equal(await store.get(), true, 'flag roundtrips through storage');
    assert.deepEqual(saved[0], { [USER_DISCONNECTED_STORAGE_KEY]: true });
    await store.set(false);
    assert.equal(await store.get(), false, 'Connect clears the flag');

    // 3. Callback throws → get resolves false instead of rejecting.
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: { local: { get: () => { throw new Error('boom'); } } },
    };
    const broken = createChromeConnectionIntentStore();
    assert.equal(await broken.get(), false);
    await assert.doesNotReject(broken.set(true));
  } finally {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  }
});
