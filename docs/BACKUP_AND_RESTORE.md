# Backup & Restore (manual, Google Drive `appDataFolder`)

`[SOURCE-VERIFIED]` from `src/gdrive/{gather,snapshot,snapshotStore,backup,driveClient,restore,conflict}.ts`, `src/db.ts`, and the suites `gdrive-backup` (28), `gdrive-browse` (23), `gdrive-restore` (28), `gdrive-contract` (27) (2026-10-20).

## Lifecycle

| Stage | Trigger | Implementation |
|---|---|---|
| Create snapshot | Settings → "Create backup" (user click) | `gather.ts` assembles live data via `db.ts` deps → `snapshot.ts` serializes `BackupData` JSON with timestamped filename → `backup.ts:createCloudBackup` multipart-uploads to `appDataFolder` (`driveClient.ts`) |
| Browse | Settings → Drive panel | `driveClient` files.list (`'appDataFolder' in parents`); metadata list (name, size, modifiedTime, id) |
| Download | per-snapshot control | `files.get?alt=media` |
| Delete | per-snapshot control | `files.delete` |
| Restore | per-snapshot "Restore" | download → `conflict.ts:computeRestorePreview` → user resolves → `applyResolutions` → `db.ts:restoreBackupData` → UI reload |

There are **no automatic triggers**: the service worker has no Drive code; nothing runs on install/startup/timer (GD-06 deferral preserved).

## Serialization & format

`BackupData` JSON: snippets (full records incl. `version`, `deletedAt`), categories, preferences, envelope metadata (generated-at, app version). Canonical field-level contract: [`google-drive-integration/data-contract.md`](google-drive-integration/data-contract.md). Filenames embed a timestamp (`snapshot.ts`) so listing order is human-meaningful; `modifiedTime` comes from Drive metadata.

## Restore validation & conflicts

- `computeRestorePreview` compares incoming snapshot vs local state (+ `snapshotStore.ts` last-snapshot metadata) and classifies per snippet: unchanged, `content-conflict` (both sides changed — `version`/`updatedAt`/content hash via `contentHashOfSnippet`), `deletion-state-conflict` (deleted on one side), duplicates by `normalizeTitle`.
- The user resolves per-conflict: `keep-local` (default) / `take-incoming` / `keep-both`; `applyResolutions` produces a write plan executed through `db.ts:restoreBackupData`; `countQuarantined` reports skipped/unparseable entries.
- Restore never partially writes on transport failure: parsing/validation completes before any local mutation; failures toast and leave local data untouched.

## Disconnect-related guards

Every Drive panel action re-checks the persisted disconnect intent (`gdriveUserDisconnected`) before touching tokens or network — after an explicit disconnect, create/list/download/delete/restore are refused until the user explicitly reconnects (same invariant as [AUTH_AND_DISCONNECT.md](AUTH_AND_DISCONNECT.md)).

## Edge cases pinned by tests

Empty snapshot, oversized content, malformed JSON, 404-during-delete, 401-mid-flow, duplicate titles, deletion-state conflicts, keep-both naming, restore-into-empty-local. See the suites above (fake-injected, no live network).
