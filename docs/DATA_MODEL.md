# Data Model & Persistence

`[SOURCE-VERIFIED]` from `src/types.ts`, `src/db.ts` (2026-10-20). No schema guessing.

## Entities (`src/types.ts`)

- **Snippet**: `id: string`, `title`, `content` (rich-text HTML string), `categoryId`, `isFavorite: boolean`, `createdAt`, `updatedAt`, `lastUsedAt` (epoch ms), `deletedAt: Date | null` (**soft delete**), `version: number` (bumped on edit — conflict detection uses it).
- **Category**: `id`, `name`, `color` (swatch from the locked ADR-009 palette).
- **CategoryWithCount**: category + live snippet count (excluding deleted).
- **Preferences**: search fields, sort order, and `uiShortcuts` (per-action shortcut bindings) + `globalCommandShortcut`; normalized on load by `shortcutUtils.normalizeUiShortcuts`.
- **BackupData**: full-backup envelope (snippets + categories + preferences + generated timestamp/version) used both for Drive snapshots and local backup/restore paths.

Relationships: Category 1—N Snippet (`snippet.categoryId`); preferences are singleton-ish (single stored record). Deletion of a category reassigns/validates snippets through `db.ts` guards (see `deleteCategory` handling in the repository function).

## IndexedDB

- Database **`snippet-organizer`**, version **1** (`db.ts:4-5`). **No migrations exist yet** — any store/index change must introduce `onupgradeneeded` handling (currently only the initial create).
- Object stores: **`snippets`** (keyPath `id`), **`categories`** (keyPath `id`), **`preferences`** (fixed-record store).
- Seeding: on empty DB, 4 default categories (`default`, `shipping`, `billing`, `account`) and 5 demo snippets are inserted (`db.ts:10-78`); defaults are product content, not user data.

## Repository (`db.ts`) — responsibilities

All reads/writes (create/get/getAll/save/soft-delete/restore-from-trash/permanent-delete, category CRUD with counts, preferences get/save, `buildBackupData`, `restoreBackupData`, `filterAndRankSnippets`). The UI never opens IndexedDB directly (grep-verified single accessor).

## chrome.storage.local keys

| Key | Writer | Purpose |
|---|---|---|
| `user_preferences` | `db.ts:831` | Preferences mirror for cross-entry reads |
| `gdriveUserDisconnected` | `gdrive/connection.ts` (explicit Disconnect) | **Persisted disconnect intent** — authoritative guard for all Drive paths |
| `isFloatingMode`, `floatingWindowId`, `floatingWindowPosition` | `public/service-worker.js` | Floating-window lifecycle/bounds lock |
| settings UI mirrors (e.g. active settings tab) | `SettingsView.tsx` | UX continuity |

## Lifecycle & deletion

- Snippet delete = `deletedAt` timestamp (recoverable from Trash); permanent delete removes the record. Category deletion guards against orphaning snippets (repository-level handling).
- Uninstall clears everything (browser-owned). Drive snapshots are independent copies — deleting local data does not touch Drive, and vice versa.

## Backup serialization

`buildBackupData` snapshots the live model into `BackupData` (JSON). Drive snapshots store this JSON via multipart upload; restore parses + validates before `restoreBackupData` writes. Field-level rules and conflict semantics: [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) and the canonical contract [`google-drive-integration/data-contract.md`](google-drive-integration/data-contract.md).

## Migration risks

- Introducing DB v2 later must handle: existing v1 stores, seeded defaults already present, and `user_preferences` mirrors diverging from IndexedDB.
- `version`/`deletedAt`/`updatedAt` are load-bearing for restore conflicts — never drop them casually.

Tests pinning this area: `tests/gdrive-contract.test.ts` (27) — data contract; `tests/gdrive-restore.test.ts` (28) — restore/conflict semantics; `tests/gdrive-backup.test.ts` (28) — serialization/upload.
