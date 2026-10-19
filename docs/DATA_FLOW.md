# Data Flow — UI → service → storage

`[SOURCE-VERIFIED]` unless noted. Mermaid source: [diagrams/data-flow.mmd](diagrams/data-flow.mmd).

## 1. Local data (read)

1. `App.tsx` mounts `MainPopup` (popup entry) or `SettingsModal` (settings entry).
2. `MainPopup.loadData` (epoch-guarded) calls `db.ts` repository functions — `getAllSnippets`, `getCategoriesWithCounts`, `getPreferences` — and sets component state.
3. A filter effect (`MainPopup.tsx`, deps `[snippets, activeFilter, selectedCategoryId, debouncedQuery, categoriesMap, preferences]`) re-derives `filteredSnippets` via `db.ts:filterAndRankSnippets` (Title > Content > Category priority).
4. Cards render from `filteredSnippets`; selection/preview state stays in `MainPopup`.

## 2. Local data (write)

- Editor save / favorite toggle / copy (`lastUsedAt`) / category edits / preference changes call `db.ts` mutators, then re-read via `loadData` or targeted `getAllSnippets` (`MainPopup.tsx:246`).
- `db.ts:savePreferences` mirrors preferences to `chrome.storage.local.user_preferences` (`db.ts:831`) for cross-entry availability.

## 3. Refresh button (turn 17/18 semantics)

1. Click → `createPopupRefresh(...).refresh()` (`src/popupRefresh.ts`): single-flight guard → `onBegin` (spinner + `aria-busy`).
2. `Promise.allSettled([deps.loadData(), deps.probe()])` runs the **local IndexedDB reload concurrently** with the **silent Drive probe**; a `minDurationMs` floor (450 ms) keeps feedback visible without delaying data.
3. First rejection goes to `onError` (toast); `onEnd` always fires. Drive failure never suppresses local data.

## 4. Drive paths (all user-initiated)

- **Probe/mount/refresh**: `runPopupProbe` sets `checking` → `connection.ts` reads `gdriveUserDisconnected`; if set → immediate `disconnected` (zero auth/network). Otherwise silent token (`auth.ts`) → `GET drive/v3/about` → `connected{account}` / `not-connected` / error class.
- **Backup**: `SettingsView` → `gather.ts` (db.ts deps) → `snapshot.ts` (serialize, filename) → `backup.ts:createCloudBackup` → `driveClient.ts` multipart `files.create` (appDataFolder).
- **Browse/delete/download**: `SettingsView` → `driveClient.ts` files.list / files.delete / files.get(alt=media).
- **Restore**: download snapshot → `conflict.ts:computeRestorePreview` (vs local + `snapshotStore` metadata) → user resolves conflicts → `applyResolutions` → `db.ts:restoreBackupData` writes → UI reloads.

## Cache vs source of truth

IndexedDB is the **only** source of truth for user data. `chrome.storage.local` holds: preferences mirror (`user_preferences`), settings UI mirrors, floating-window state, and the disconnect intent (`gdriveUserDisconnected`). `snapshotStore.ts` caches last-snapshot metadata for conflict previews only — never treated as cloud truth.

## Stale-async protection

`MainPopup` epochs each `loadData` run and ignores stale resolutions; the refresh orchestrator is single-flight. `[INFERRED]` for the remaining modal flows: modals are unmounted after completion, which bounds their async writes.
