# Storage & Persistence Inventory

`[SOURCE-VERIFIED]` (2026-10-20). Companion to [DATA_MODEL.md](DATA_MODEL.md) — this file is the key/store inventory; the data model doc explains semantics.

## IndexedDB (source of truth for user data)

| Store | Key | Records | Writer |
|---|---|---|---|
| `snippets` | `id` | user snippets + 5 seeds | `db.ts` only |
| `categories` | `id` | user categories + 4 defaults | `db.ts` only |
| `preferences` | fixed record | search fields, sort, `uiShortcuts`, `globalCommandShortcut` | `db.ts` only |

DB `snippet-organizer`, version 1, created with seed data when empty. **No migration framework** — v1 only.

## chrome.storage.local

| Key | Set by | Read by | Purpose |
|---|---|---|---|
| `gdriveUserDisconnected` | explicit Disconnect (`gdrive/connection.ts`) | probe paths (mount, Refresh, pre-Drive-operation checks) | persisted disconnect intent; blocks all Drive auth/network until explicit Connect |
| `user_preferences` | `db.ts` | settings/popup bootstrapping | preferences mirror |
| `isFloatingMode` | service worker | `popup.tsx` | floating vs docked rendering |
| `floatingWindowId` / `floatingWindowPosition` | service worker | service worker | window reuse + bounds lock |
| settings-tab mirrors | `SettingsView.tsx` | itself | UI continuity |

## chrome.storage.sync

Not used by application code (verified by search). Reserved — do not introduce silently; it would change data residency expectations (see [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md)).

## Google Drive (remote, opt-in)

- Scope-limited to `appDataFolder` — a per-user, per-application hidden area. Files there **do not appear in the normal My Drive listing** (common user/agent confusion; documented in [`google-drive-integration/data-contract.md`](google-drive-integration/data-contract.md)).
- Only user-initiated operations exist: create snapshot, list, download, delete, restore source. No background jobs (SW has no Drive code).

## Cache-vs-truth summary

- Truth: IndexedDB.
- Mirrors/caches: `user_preferences` (mirror), snapshot metadata cache (`snapshotStore.ts`, conflict previews only), service-worker window keys (ephemeral state).
- None of the mirrors are authoritative; the disconnect intent is the one `chrome.storage.local` value with **security semantics** (see [AUTH_AND_DISCONNECT.md](AUTH_AND_DISCONNECT.md)).

## Deletion behavior

Local: soft delete (`deletedAt`) → Trash → restore or permanent delete (repository functions in `db.ts`). Drive: explicit per-snapshot delete from Settings. Uninstall: browser clears local storage; Drive `appDataFolder` files persist until user deletes them (extension-namespace data survives only while installed for that user+client pairing).
