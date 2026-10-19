# Authentication & Disconnect — flows and the critical invariant

`[SOURCE-VERIFIED]` from `src/gdrive/auth.ts`, `src/gdrive/connection.ts`, `tests/gdrive-{auth,connection}.test.ts` (2026-10-20).

## OAuth mechanism

`chrome.identity.getAuthToken` (the documented MV3 path). Config resolution (`resolveOAuthConfig`) validates the manifest `oauth2` block (client id present & not the placeholder) and the `identity` permission, returning typed problems otherwise. Requested scope: **only** `https://www.googleapis.com/auth/drive.appdata`.

## Startup & silent path

1. Popup open (and every Refresh) triggers the silent probe (`connection.ts` → `createConnectionProbe`).
2. Probe reads `chrome.storage.local.gdriveUserDisconnected` **first**: if set → returns `disconnected` immediately — **zero** token requests, zero network.
3. Otherwise: silent `getAuthToken({ interactive: false })` → `GET drive/v3/about` → `connected` (account display name) / `not-connected` / `network` / typed errors. The footer reflects exactly this state (GD-07 truth-only).

## Interactive path (user-initiated only)

The **Connect** control in Settings is the only interactive authorization entry (`getAuthToken({ interactive: true })` via `authorize`). Errors surface typed messages (e.g. interaction-required, misconfiguration). A successful connect clears the disconnect intent **only by explicit user action**.

## Disconnect semantics (critical invariant)

- Explicit Disconnect: `removeCachedAuthToken` evicts the cached token, and `gdriveUserDisconnected` is persisted to `chrome.storage.local`.
- While that flag is set, **every** Drive entry point short-circuits: probe returns `disconnected` with no auth/network; backup/browse/restore guards refuse to run; no interactive prompt may appear from passive paths (popup open, Refresh).
- Only the explicit Connect control may clear the flag. The footer keeps showing the neutral disconnected state (slate dot + "Google Drive not connected"); the Drive logo appears only for probe-verified connected/checking states.
- Pinned by tests: `gdrive-connection.test.ts` (disconnect guard cases), `popup-refresh.test.ts` (refresh never clears the flag / never prompts).

**For future agents**: do not "fix" perceived staleness by re-authorizing behind the user's back; reconnecting is a deliberate user action by design.

## Identity display

`drive/v3/about` supplies the account display name; Settings shows it for a verified `connected` state only. The popup footer intentionally shows **no** account identity — connection state only.

## Token lifetime caveat

OAuth **testing-mode** tokens may expire on Google's schedule (external configuration behavior, not code). Expired/revoked tokens surface as `not-connected` or 401-classified errors; the user reconnects via Connect. This is documented as external behavior — the extension does not and must not auto-refresh its way around an explicit disconnect.
