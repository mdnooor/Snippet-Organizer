# Codebase Map — module responsibilities & feature lookup

`[SOURCE-VERIFIED]` (2026-10-20). Paths relative to repo root. "Tests" column names the suites in `tests/` that pin the module (run: `npx.cmd tsx tests/<file>`).

## Module responsibility table

| Module | Responsibility | Called by | Reads / writes | External touch | Tests | Failure modes / constraints |
|---|---|---|---|---|---|---|
| `src/db.ts` | IndexedDB repository + schema v1 + seeding + search/rank + backup serialization + restore write | `App.tsx`, `MainPopup.tsx`, `SettingsView.tsx`, `EditorModal`, `gather/restore` via injected deps | IndexedDB `snippet-organizer` v1; `chrome.storage.local.user_preferences` mirror | IndexedDB only | contract (27), backup (28), restore (28), browse (23) indirectly | Schema is v1 — no migrations exist; any store change needs an upgrade path |
| `src/types.ts` | Shared types (`Snippet`, `Category`, `Preferences`, `BackupData`, …) | everything | — | — | compiled by all | Types drift = compile error (tsc gate) |
| `src/shortcutUtils.ts` | `normalizeUiShortcuts` (load-time migration of shortcut prefs) | `db.ts`, `SettingsView.tsx` | preferences object | — | contract indirectly | Must tolerate legacy/missing keys |
| `src/popupRefresh.ts` | Refresh orchestrator: single-flight, concurrent local+probe (`allSettled`), error funnel, `minDurationMs` floor | `MainPopup.tsx` | none (injected deps) | none | popup-refresh (8) | Must never throw; `onEnd` always fires |
| `src/components/MainPopup.tsx` | Main screen state & composition: loadData (epoch-guarded), filtering effect, keyboard nav, bulk select, refresh wiring | `App.tsx` | via `db.ts` | silent probe (connection.ts) | popup-refresh (behavior) | Large component — change carefully; epoch guard prevents stale async writes |
| `src/components/SearchAndFilters.tsx` | Search field, Favorites toggle, category tab row, category dropdown portal | `MainPopup.tsx` | — | — | — (UI) | Portal must keep shared `.nm-scrollbar`; dropdown positioning math |
| `src/components/SnippetCard.tsx` | Card display, copy button, favorite toggle, bulk-select checkbox | `MainPopup.tsx` | via callbacks | clipboard | — (UI) | Copy failure must toast, not throw |
| `src/components/SnippetEditorModal.tsx` | Create/edit snippet, rich content, validation | `MainPopup.tsx` | via `db.ts` | — | — (UI) | Unsaved-change guard |
| `src/components/SnippetPreviewModal.tsx` | Read-only preview | `MainPopup.tsx` | — | — | — (UI) | — |
| `src/components/SettingsModal.tsx` / `SettingsView.tsx` | Settings tabs: preferences, shortcuts (rebind capture), Drive panel (connect/disconnect, snapshots, restore preview), trash | `App.tsx` (settings entry), `MainPopup.tsx` | via `db.ts` + gdrive services | Drive REST via services | auth, connection, backup, browse, restore | Rebind capture must persist real `preferences.uiShortcuts` |
| `src/components/Footer.tsx` | Connection status line + attribution; Google Drive logo states | `MainPopup.tsx`, `App.tsx` (settings) | — | none (receives status) | — (UI) | Never imply connection when `driveStatus !== 'connected'` |
| `src/components/GoogleDriveLogo.tsx` | Official Drive logo inline SVG | `Footer.tsx` | — | none | — (UI) | `aria-hidden` — label carries meaning |
| `src/components/Header.tsx` | Title bar (floating/docked aware) | `App.tsx` | — | — | — | — |
| `src/gdrive/auth.ts` | OAuth config resolution, `getAuthToken` silent/interactive, error classification | connection.ts, SettingsView, backup/browse/restore (deps) | manifest `oauth2` | `chrome.identity` | auth (22) | Placeholder client id → `not-configured` |
| `src/gdrive/connection.ts` | Silent probe (`drive/v3/about`), identity, connect/disconnect, disconnect-intent guard, token-cache eviction | MainPopup, SettingsView | `chrome.storage.local.gdriveUserDisconnected` | `chrome.identity`, Drive about | connection (19) | 401 vs network vs unconfigured classification |
| `src/gdrive/driveClient.ts` | Drive REST v3 fetch wrapper (list/create/get/delete, appDataFolder) | backup, browse/restore paths | — | `www.googleapis.com` | backup/browse/restore via injected deps | 401/404/network mapping |
| `src/gdrive/gather.ts`, `snapshot.ts`, `snapshotStore.ts`, `backup.ts` | Local data gather → snapshot serialize → filename/timestamps → upload; last-snapshot metadata | SettingsView | via db.ts deps | Drive files.create (multipart) | backup (28), contract | Must serialize exactly the local model; no auto triggers |
| `src/gdrive/restore.ts`, `conflict.ts` | Restore preview, conflict classification & resolutions, quarantine count, write plan | SettingsView | via db.ts deps | Drive files.get (alt=media) | restore (28), browse (23) | Deleted-locally vs changed conflicts; keep-local default |
| `public/manifest.json` | MV3 manifest: permissions `storage`+`identity`, oauth2 (drive.appdata), commands, SW | Chrome | — | — | connection/auth (manifest checks) | `key` unpinned — CWS blocker |
| `public/service-worker.js` | Floating window lifecycle, bounds lock, toggle command, action popup | Chrome events | `chrome.storage.local` window keys | `chrome.windows/action/runtime` | — (manual verify scripts) | Outer-size lock; no Drive/db access by design |
| `scripts/pack-extension.js` | Zip dist → public+dist zip | `npm run build/pack` | files | — | — | Requires `python3` (missing on this box) |
| `scripts/verify-floating-mode.js`, `verify-web-preview.js` | Manual verification helpers | developer | — | — | — | — |

## Feature → file lookup

| Feature | Primary files | Notes / tests |
|---|---|---|
| Snippet CRUD + trash | `SnippetEditorModal.tsx`, `MainPopup.tsx`, `db.ts` | soft delete via `deletedAt`; contract suite |
| Search & ranking | `MainPopup.tsx`, `db.ts` (`filterAndRankSnippets`) | debounced query; Title > Content > Category |
| Categories & swatches | `SettingsView.tsx`, `db.ts`, `index.css` (ADR-009 palette) | locked 8-color swatch set |
| Favorites | `SnippetCard.tsx`, `MainPopup.tsx`, `db.ts` | tab filter + card star |
| Copy to clipboard | `SnippetCard.tsx` (+ `handleCopy` in `MainPopup.tsx`) | toast feedback, `lastUsedAt` update |
| Refresh button | `MainPopup.tsx`, `SearchAndFilters.tsx`, `src/popupRefresh.ts` | popup-refresh (8) |
| Floating window | `public/service-worker.js`, `popup.tsx`, `Header.tsx` | `verify-floating-mode.js` manual |
| Keyboard shortcuts | `SettingsView.tsx`, `shortcutUtils.ts`, `MainPopup.tsx`, manifest `commands` | rebind persists to preferences |
| Connect / Disconnect | `SettingsView.tsx`, `gdrive/connection.ts`, `gdrive/auth.ts`, `Footer.tsx` | connection (19), auth (22) |
| Snapshot create/list/download/delete | `SettingsView.tsx`, `gdrive/{gather,snapshot,snapshotStore,backup,driveClient}.ts` | backup (28), browse (23) |
| Restore + conflicts | `SettingsView.tsx`, `gdrive/{restore,conflict}.ts` | restore (28) |
| Footer status + Drive logo | `Footer.tsx`, `GoogleDriveLogo.tsx` | truth-only (GD-07) |

## Known rough edges (documented, not changed)

`MainPopup.tsx` and `SettingsView.tsx` are large single components (state-heavy) — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md). Root-level legacy artifacts are listed in the root [README](../README.md).
