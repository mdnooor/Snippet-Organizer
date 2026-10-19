# Code Graph Report (Version 1)

Date: 2026-10-20. Deliverables live in [`docs/CODE_GRAPH.md`](../docs/CODE_GRAPH.md) + [`docs/diagrams/*.mmd`](../docs/diagrams/) + generated inventories ([`docs/generated/`](../docs/generated/), via `node scripts/generate-doc-inventory.mjs`, `[COMMAND-VERIFIED: exit 0]`).

## Completeness statement (read this before trusting the graph)

- **Level**: module/flow-level. Edges were hand-verified against source (imports, exported factories, injected dependencies, storage keys, endpoints).
- **NOT** a complete function-level call graph: no static call-graph generator exists in the project toolchain, and the session environment's GitNexus/Graphify tooling is unavailable (project `AGENTS.md` §3). Intra-component call sequences inside `MainPopup.tsx` (~800 lines) and `SettingsView.tsx` are summarized, with the refresh-effect dependency array as a cited exception.
- Edge classification: plain arrows = verified `[SOURCE-VERIFIED]`; anything unverified is explicitly tagged `[INFERRED]` in `docs/CODE_GRAPH.md` (e.g., dashed edges in `module-dependencies.mmd`).

## Machine-generated facts (2026-10-20 run)

- 157 tracked files (excluding `node_modules/`, `dist/`, `.git/`, `docs/generated/`).
- 41 source/config files under `src|public|scripts|tests` (`.ts/.tsx/.js/.css/.html/.json`), 15,817 lines.
- 21 `package.json` dependencies; import scan attributes each to consuming files or flags "none found in src/ imports" (build tooling vs template leftovers) — see `generated/dependency-inventory.md`.

## Key verified edges (source-cited)

- `db.ts` → `types.ts`, `shortcutUtils.ts`; consumed by `App/MainPopup/SettingsView/EditorModal`; exports `filterAndRankSnippets` (used by `MainPopup.tsx:216`).
- `MainPopup.tsx` → `popupRefresh.ts` (injected `loadData`/`probe` — no direct gdrive import).
- `connection.ts` → `auth.ts`; sole reader/writer of `gdriveUserDisconnected`.
- `backup.ts` → `gather/snapshot/driveClient`; `restore.ts` → `conflict.ts` + `driveClient`; both take injected deps.
- `service-worker.js` imports nothing from `src/`; shares `chrome.storage.local` keys only.

## Maintenance rule

When modules change: update the six `.mmd` diagrams, `docs/CODE_GRAPH.md`, `project-knowledge/code-graph/metadata.md`, rerun `node scripts/generate-doc-inventory.mjs`, and re-tag anything you did not re-verify as `[INFERRED]`.
