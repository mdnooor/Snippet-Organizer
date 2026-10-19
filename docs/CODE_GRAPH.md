# Code Graph — deliverables, completeness, and how to read the diagrams

`[SOURCE-VERIFIED]` where edges are cited from source; `[INFERRED]` where marked. No heavyweight graph tooling is used: the project has no call-graph generator dependency, and the session environment's GitNexus/Graphify tooling is unavailable (per project `AGENTS.md` §3). Therefore this graph is **module/flow-level, hand-verified against source** — it is explicitly NOT a complete function-level call graph. The companion static map lives at [`project-knowledge/code-graph/metadata.md`](project-knowledge/code-graph/metadata.md).

## Deliverables

| Diagram | File | Level |
|---|---|---|
| System components | [diagrams/system-architecture.mmd](diagrams/system-architecture.mmd) | Chrome surfaces → UI → services → storage |
| Module dependencies | [diagrams/module-dependencies.mmd](diagrams/module-dependencies.mmd) | `src/` file-level imports (verified) |
| Data flow | [diagrams/data-flow.mmd](diagrams/data-flow.mmd) | UI → db.ts → IndexedDB; refresh path |
| Google Drive flow | [diagrams/google-drive-flow.mmd](diagrams/google-drive-flow.mmd) | OAuth silent/interactive + disconnect guard |
| Backup/restore flow | [diagrams/backup-restore-flow.mmd](diagrams/backup-restore-flow.mmd) | gather→serialize→upload; list/download/delete/restore+conflicts |
| Test coverage map | [diagrams/test-coverage-map.mmd](diagrams/test-coverage-map.mmd) | suites → modules pinned |

## Verified module-dependency facts (source-cited)

- `db.ts` imports `types.ts`, `shortcutUtils.ts`; exports all repository functions used by UI (`App.tsx`, `MainPopup.tsx`, `SettingsView.tsx`, `SnippetEditorModal.tsx`) — `db.ts` is the single IndexedDB accessor (grep-verified: no other `indexedDB` usage in `src/`).
- `MainPopup.tsx` imports `filterAndRankSnippets` from `db.ts` and `createPopupRefresh` from `popupRefresh.ts`; the refresh orchestrator receives `loadData`/`probe` as injected deps (no direct gdrive import) — a deliberate composition seam pinned by `tests/popup-refresh.test.ts`.
- `connection.ts` → `auth.ts` (`createAuthController`, `DRIVE_APPDATA_SCOPE`); `connection.ts` is the only reader of `chrome.storage.local.gdriveUserDisconnected`.
- `backup.ts` / `restore.ts` take `CloudBackupDeps`-style injected Drive clients (see exported interfaces above) — tests inject fakes; production wires `driveClient.ts`.
- `public/service-worker.js` imports nothing from `src/` (plain module, message-driven); it shares only `chrome.storage.local` keys with the popup (`isFloatingMode`, `floatingWindowId`, `floatingWindowPosition`).

`[INFERRED]` edges: exact call sites inside large UI components (`MainPopup.tsx` ~800 lines, `SettingsView.tsx`) are summarized at module level; treat intra-component sequencing as verified only where a test or a cited line pins it (e.g. refresh effect deps `MainPopup.tsx:237`).

## Regeneration & maintenance

No automatic graph generation ships with the project. When modules change, update: this file, the `.mmd` diagrams, `project-knowledge/code-graph/metadata.md`, and `generated/source-inventory.md` (via `node scripts/generate-doc-inventory.mjs`). Keep edge claims honest — mark anything you did not re-verify as `[INFERRED]`.
