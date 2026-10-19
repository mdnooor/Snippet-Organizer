/**
 * POPUP-REFRESH-01 — Popup refresh orchestrator.
 *
 * A small, framework-free seam so the popup's Refresh button can be unit
 * tested with the project's node:test setup (no React test framework is
 * allowed). It composes the EXISTING data-loading path (MainPopup's loadData
 * — snippets/categories/preferences from IndexedDB) and the EXISTING silent
 * Drive connection probe (src/gdrive/connection.ts), and guarantees:
 *
 *  - ONE refresh at a time: a second call while running resolves false and
 *    never starts duplicate work (concurrency guard);
 *  - onBegin/onEnd fire EXACTLY once per attempt, including on failure, so
 *    spinners and button states always recover;
 *  - loadData and probe failures are funneled to onError — the orchestrator
 *    itself never throws and never leaves the popup stuck;
 *  - the probe (and therefore Google Drive) is only ever touched through the
 *    caller-provided probe — the non-interactive one that honors the
 *    persisted `gdriveUserDisconnected` intent. The orchestrator has no
 *    knowledge of storage, tokens, or Drive and cannot mutate anything.
 */

export interface PopupRefreshDeps {
  /** Re-read the UI's source of truth (existing MainPopup.loadData). */
  loadData(): Promise<void>;
  /** Silent connection re-probe (existing createConnectionProbe().probe). */
  probe(): Promise<unknown>;
  /** Begin a refresh attempt (show spinner / disable button). */
  onBegin(): void;
  /** Always called once per attempt — success or failure. */
  onEnd(): void;
  /** Called at most once per failed attempt with the first failure. */
  onError?(error: unknown): void;
}

export interface PopupRefreshController {
  /** True while a refresh attempt is in flight. */
  isRunning(): boolean;
  /**
   * Run one refresh attempt. Resolves true on success, false when skipped
   * (already running) or when loadData/probe failed (onError already called).
   * Never rejects.
   */
  refresh(): Promise<boolean>;
}

export interface PopupRefreshOptions {
  /**
   * TURN-18: minimum visual duration for the loading feedback, in ms.
   * When Drive is disconnected the probe returns instantly (zero work) and
   * IndexedDB reads finish in milliseconds — the whole refresh could settle
   * before the spinner is perceivable, which users read as "refresh did
   * nothing / behaves differently when disconnected". The floor keeps the
   * feedback visible for a consistent moment in EVERY connection state.
   * It never delays the data itself: loadData applies UI state the moment it
   * resolves; only the end of the visual feedback waits out the floor.
   */
  minDurationMs?: number;
}

export function createPopupRefresh(deps: PopupRefreshDeps, options: PopupRefreshOptions = {}): PopupRefreshController {
  const minDurationMs = options.minDurationMs ?? 450;
  let running = false;

  return {
    isRunning: () => running,
    async refresh(): Promise<boolean> {
      // Duplicate-click guard: an in-flight refresh is never restarted.
      if (running) return false;
      running = true;
      deps.onBegin();
      let failure: unknown = null;
      try {
        // TURN-17 (POPUP-REFRESH-01): local and cloud/connection refresh run
        // CONCURRENTLY via allSettled — the local IndexedDB reload must never
        // be serialized behind (or blocked by) a slow/failing Drive check,
        // and one failure must not prevent the other from completing.
        // TURN-18: a connection-state-independent minimum duration keeps the
        // visual feedback perceivable on near-instant (disconnected) refreshes.
        // Drive safety unchanged: the probe is the injected non-interactive
        // one that honors `gdriveUserDisconnected` (zero auth/network while
        // the flag is set); the orchestrator itself touches nothing else.
        const [settleResults] = await Promise.all([
          Promise.allSettled([deps.loadData(), deps.probe()]),
          new Promise((resolve) => setTimeout(resolve, minDurationMs)),
        ]);
        const results = settleResults as PromiseSettledResult<unknown>[];
        if (results[0].status === 'rejected') failure = results[0].reason;
        if (results[1].status === 'rejected') failure = failure ?? results[1].reason;
      } finally {
        running = false;
        deps.onEnd();
      }
      if (failure !== null) deps.onError?.(failure);
      return failure === null;
    },
  };
}
