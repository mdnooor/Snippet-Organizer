# AGENTS.md — Snippet Organizer

**Operating Guide for Coding Agents** `[SOURCE-VERIFIED]`

---

## 1. Read First (Mandatory Sequence)

1. **[`docs/project-knowledge/README.md`](docs/project-knowledge/README.md)** — Mandatory agent entry point, reading order, and maintenance contract.
2. **[`docs/project-knowledge/PROJECT_BRIEF.md`](docs/project-knowledge/PROJECT_BRIEF.md)** — Current project state, capabilities, and boundaries.
3. **[`docs/project-knowledge/DECISIONS.md`](docs/project-knowledge/DECISIONS.md)** — Approved architectural decisions (ADRs) and scope locks.
4. **[`docs/project-knowledge/ARCHITECTURE.md`](docs/project-knowledge/ARCHITECTURE.md)** — Implemented architecture, entry points, and IndexedDB schema.
5. **[`docs/tasks/BACKLOG.md`](docs/tasks/BACKLOG.md)** — Task index and active work status.

---

## 2. Non-Negotiables & Rules of Engagement

- **Read Canonical Documentation First**: Follow the mandatory reading order in `docs/project-knowledge/README.md` before changing anything. Inspect actual source files before editing them; never write code or documentation from memory or assumption.
- **TypeScript Source in `src/`**: The application is actively authored in TypeScript under `src/` and compiled by Vite into `dist/`.
- **Target Viewport Dimensions**: Both the docked Chrome toolbar popup and the detached floating window must use one **fixed 480 × 600 px application viewport** (the entire outer window; UI-WINDOW-LOCK-01/02/03/04, ADR-002 Amendment 3, 2026-10-16 — supersedes the earlier 712 × 512 / 732 × 532 / 772 × 572 / 480 × 560 / 480 × 580 layouts). The raised popup (`w-[430px] h-[550px]`) sits inset on an exact 25 px flat-background ring on all four sides. No responsive sizing in either mode. The floating window is frame-compensated and size-locked by the service worker: `chrome.windows.create/update` sizes are OUTER dimensions including the browser frame, so the floating page reports its measured frame delta (`CALIBRATE_FLOATING_FRAME`) and the worker enforces layout + delta via `onBoundsChanged` (soft lock — `chrome.windows` has no `resizable` option); the docked action popup is content-sized and not user-resizable. Do not introduce dynamic dimension changes.
- **Design System Lock (ADR-009)**: The current visual system is the **locked Red Glass-Claymorphism** specification (`docs/design/DESIGN_SYSTEM.md` Sections 2–4, implemented in `src/index.css`). Do not alter locked values, the `nm-*` class-name API, the 8 category swatch colors, or success/warning/info/danger semantics without explicit user approval. Keep reference duplicates (`.clay-btn`/`.clay-decor` vs `.nm-primary-raised`/`.nm-logo-raised`) in sync. Refer to the system as **Red Glass-Claymorphism**, not as a blue/indigo neumorphic theme.
- **Scope Lock**: Change only what the active task requires. No unrequested refactors, redesigns, or dependency changes. **Documentation-only tasks must never modify application source code** — record defects as findings with evidence instead.
- **Preserve User Work**: No destructive git operations. The application directory is untracked inside the parent repo.
- **Honesty & Verification**: Never claim a test, lint, or build passed unless you actually ran and observed the command output. Never mark a task VERIFIED without real command/runtime evidence, and never ACCEPTED without explicit user sign-off. Tag claims `[SOURCE-VERIFIED]`, `[COMMAND-VERIFIED]`, `[RUNTIME-VERIFIED]`, `[INFERRED]`, or `[UNKNOWN]` per `docs/project-knowledge/README.md`. Build success does not prove visual fidelity; a selector in source does not prove runtime application.
- **Avoid Duplicate Documentation**: One canonical document per topic (`docs/project-knowledge/`, `docs/design/`, `docs/tasks/`). Reference the design system rather than copying its values; do not create parallel doc systems.
- **Documentation Maintenance**: After verifying a meaningful change, update the affected canonical docs in `docs/project-knowledge/` (and `docs/design/DESIGN_SYSTEM.md` for any styling change) and record an entry in `reports/DOCUMENTATION_CHANGELOG.md`.

---

## 3. Tooling & Verification Commands `[COMMAND-VERIFIED]`

- **Lint & Type Check**: `npm run lint` (`tsc --noEmit`)
- **Compilation**: `compile_applet`
- **Build & Package**: `npm run build` (`vite build && node scripts/pack-extension.js`)
- **Dev Server**: `npm run dev` (Vite on port 3000)
- **Graph Tooling Status**: Graphify and GitNexus are unavailable in this environment; static AST dependency mapping is maintained in `docs/project-knowledge/code-graph/metadata.md`.

---

# Addendum — V1 Baseline Working Rules (2026-10-20 audit)

The rules above remain binding. This addendum adds the operational detail a new agent needs; the stable overview lives in `docs/ARCHITECTURE.md`, the module map in `docs/CODEBASE_MAP.md`, and the documentation index in `docs/README.md`.

## Before you edit anything

1. Run `git status` and read the existing diff — the application directory is **untracked inside the parent workspace repo** (branch `master`, zero commits as of 2026-10-20), so there is no commit history to rely on; the docs and reports are the history.
2. Read the current source of the feature you touch **and** its tests (`docs/TESTING.md` has the change→suite mapping). Old reports describe the past; **source code is the only truth** — if a document contradicts the code, trust the code and fix the document.
3. Never edit blind from diagram or summary alone; diagrams in `docs/diagrams/` are module-level and partially `[INFERRED]` (labeled in `docs/CODE_GRAPH.md`).

## How to trace a feature

UI component (`src/components/`) → orchestration (`src/popupRefresh.ts`, `src/gdrive/*` factories with injected deps) → repository (`src/db.ts`, the only IndexedDB accessor) → storage (IndexedDB `snippet-organizer` v1 / `chrome.storage.local` keys — inventory in `docs/STORAGE_AND_PERSISTENCE.md`). Drive flows: `docs/GOOGLE_DRIVE_INTEGRATION.md`, `docs/BACKUP_AND_RESTORE.md`.

## Non-negotiable invariants (violating any of these is a defect, not a cleanup)

- `gdriveUserDisconnected` is read-only for every path except the explicit Connect control; no silent reconnection, no interactive OAuth from passive paths (popup open, Refresh), no Drive auth/network while the flag is set.
- No automatic sync (GD-06 deferred) — no background Drive work in `service-worker.js` or anywhere else; no sync-status claims (GD-07).
- `db.ts` stays the single IndexedDB writer; service worker never touches snippet data.
- Locked values: 480×600 outer windows (ADR-002 Am. 3), ADR-009 design tokens/`nm-*` API, single OAuth scope `drive.appdata`, permissions `storage`+`identity`.
- Soft delete (`deletedAt`) semantics and `version` fields are load-bearing for restore conflicts.

## Investigating bugs

Reproduce mentally from source + tests first; add or extend the failing test in the mapped suite before changing code; prefer injected-fake unit coverage at the service/orchestrator seam; UI-only issues are verified manually in Chrome (say so honestly in your report).

## Reporting results

Evidence tags (`[SOURCE-VERIFIED]`, `[COMMAND-VERIFIED]`, `[RUNTIME-VERIFIED]`, `[INFERRED]`, `[UNKNOWN]`) per `docs/project-knowledge/README.md`. Never claim a command passed without its output; never claim Chrome verification that was not performed; distinguish environment failures (e.g. missing `python3` for packaging — workaround in `docs/BUILD_AND_RELEASE.md`) from test failures. Record meaningful changes in `reports/DOCUMENTATION_CHANGELOG.md` and the affected canonical docs. Do not commit, push, or publish — that remains user-owned.
