# Google Drive Integration

`[SOURCE-VERIFIED]` from `src/gdrive/*` and `public/manifest.json` (2026-10-20). Canonical contracts: [`google-drive-integration/oauth-contract.md`](google-drive-integration/oauth-contract.md) and [`google-drive-integration/data-contract.md`](google-drive-integration/data-contract.md).

## Configuration

- `public/manifest.json` → `oauth2.client_id` (extension OAuth client; public identifier) and `oauth2.scopes: ["https://www.googleapis.com/auth/drive.appdata"]` — the **only** scope requested. `DRIVE_APPDATA_SCOPE` / `OAUTH_SCOPES` in `src/gdrive/auth.ts` mirror it and are checked at runtime (`resolveOAuthConfig` → `not-configured` for placeholder client ids).
- `permissions: ["storage", "identity"]` — nothing else. No `identity.email`, no broader Drive scopes, no tabs/host permissions.

## Endpoints & operations actually used

| Operation | Call | Where |
|---|---|---|
| Connection probe + identity | `GET https://www.googleapis.com/drive/v3/about?fields=...` (`user/userDisplayName`) | `connection.ts:63` |
| Create snapshot | `POST https://www.googleapis.com/upload/drive/v3/files` (multipart, `parents: [appDataFolder]`) | `driveClient.ts` / `backup.ts` |
| List snapshots | `GET https://www.googleapis.com/drive/v3/files` with `q='appDataFolder' in parents` | `driveClient.ts` (browse) |
| Download snapshot | `GET .../files/{id}?alt=media` | `driveClient.ts` / restore path |
| Delete snapshot | `DELETE .../files/{id}` | `driveClient.ts` |

`appDataFolder` is application-private data: it never appears in the user's normal My Drive listing, and other apps cannot see it.

## Error handling

- `auth.ts:classifyAuthError` maps raw `chrome.identity`/token failures to typed results: `not-configured` (placeholder client id / missing manifest oauth2 or `identity` permission), `interaction-required` (silent token needs user gesture), `error`.
- `connection.ts` classifies probe outcomes: `connected` (with account display name), `not-connected` (no cached grant / 401), `network`, `error`; HTTP 401 triggers token-cache eviction + one silent retry (`removeCachedAuthToken` edge case documented in source comments).
- Backup/browse/restore surfaces toast/inline errors and never mutates local data on failure (restore applies only after explicit resolution).

## What does NOT exist

- **Automatic sync** (GD-06) — deferred; no background upload/download, no service-worker Drive code, no sync-conflict automation.
- Any fabricated status: GD-07 bans "Synced / Last synced" claims; the footer shows only probe-verified states.
- Any use of Drive outside `appDataFolder`.

## Testing

`tests/gdrive-connection.test.ts` (19) — probe states, disconnect guard; `gdrive-auth.test.ts` (22) — config resolution, token flows, error classification; `gdrive-backup.test.ts` (28) — gather/serialize/upload; `gdrive-browse.test.ts` (23) — list/download/delete; `gdrive-restore.test.ts` (28) — preview/conflicts/apply. All use injected fakes — no live network in tests.

Manual verification requires Chrome + a Google account in OAuth testing mode (tokens may expire per Google's testing configuration — external behavior): [AUTH_AND_DISCONNECT.md](AUTH_AND_DISCONNECT.md).
