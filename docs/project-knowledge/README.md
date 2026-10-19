# Project Knowledge Base — Snippet Organizer

Welcome to the canonical engineering knowledge base for **Snippet Organizer**.
This directory is the authoritative starting point and operating reference for any coding agent or software engineer continuing work on this project in a fresh session.

---

## 1. Quick Start & Mandatory Reading Order

Every new coding agent must read the project documentation in the following sequence before modifying files:

1. **`AGENTS.md`** (repository root) — Operating guide and non-negotiable rules for coding agents.
2. **`docs/project-knowledge/README.md`** (this document) — Knowledge base overview, rules of engagement, and maintenance contract.
3. **`docs/project-knowledge/PROJECT_BRIEF.md`** — High-level product summary, target users, confirmed requirements, and current status.
4. **`docs/project-knowledge/DECISIONS.md`** — Approved architectural decision records (ADRs) and non-negotiable scope locks (incl. **ADR-009**: locked Red Glass-Claymorphism design system).
5. **`docs/project-knowledge/ARCHITECTURE.md`** — Implemented technical architecture, runtime entry points, IndexedDB schema, styling architecture, and data flows.
6. **`docs/project-knowledge/FEATURES.md`** — Comprehensive inventory of implemented features, state dependencies, and known edge cases.
7. **`docs/design/DESIGN_SYSTEM.md`** (for any UI-adjacent task) — Canonical Red Glass-Claymorphism reference: locked values, actual selectors, component map, exceptions.
8. **`docs/project-knowledge/UI_REGISTRY.md`** & **`docs/design/SCREEN_REGISTRY.md`** — UI element mapping, handlers, design-treatment map, and screen layouts.
9. **`docs/tasks/BACKLOG.md`** — Historical and active task status index.

**Current project state snapshot**: the UI is fully reskinned to the locked Red Glass-Claymorphism system (task UI-CLAY-03; ADR-009). Locked CSS values live verbatim in `src/index.css` and must not be changed without explicit user approval. Handoff entry point for continuing agents: `docs/tasks/UI-CLAY-03/HANDOFF.md`.

---

## 2. Authoritative Information Sources

| Information Need | Authoritative Source Document |
|---|---|
| Project purpose, boundaries, and current status | `docs/project-knowledge/PROJECT_BRIEF.md` |
| System architecture, modules, and data flow | `docs/project-knowledge/ARCHITECTURE.md` |
| Feature behavior and edge case handling | `docs/project-knowledge/FEATURES.md` |
| Architectural decisions and confirmed constraints | `docs/project-knowledge/DECISIONS.md` |
| External APIs, Chrome permissions, and boundaries | `docs/project-knowledge/INTEGRATIONS.md` |
| UI elements, DOM triggers, and event handlers | `docs/project-knowledge/UI_REGISTRY.md` |
| Visual styling tokens and component variants | `docs/design/DESIGN_SYSTEM.md` |
| Screen routes and modal presentation modes | `docs/design/SCREEN_REGISTRY.md` |
| Complex state transitions and interaction sequences | `docs/design/INTERACTION_FLOWS.md` |
| Task status, backlog, and roadmap | `docs/tasks/BACKLOG.md` |
| Code graph provenance and dependency tooling | `docs/project-knowledge/code-graph/metadata.md` |
| Chronological changelog of modifications | `reports/DOCUMENTATION_CHANGELOG.md` |

---

## 3. Evidence and Confidence Tagging Standard

To prevent hallucinations, unverified assumptions, and regressions, every factual statement and documentation entry must be tagged using the following confidence standard:

- `[SOURCE-VERIFIED]` — Direct evidence exists in checked repository source code, types, or configuration.
- `[COMMAND-VERIFIED]` — Confirmed by running an automated tool or command (e.g. `npm run lint`, `tsc --noEmit`, test suite).
- `[RUNTIME-VERIFIED]` — Confirmed by observing active server responses, IndexedDB execution, or runtime behavior.
- `[INFERRED]` — A reasonable engineering deduction supported by context, but requiring explicit verification before being treated as fact.
- `[UNKNOWN]` — Information is absent, ambiguous, or lacks verifiable evidence.

Task-report status vocabularies (IMPLEMENTED / STATICALLY_VERIFIED / TEST_VERIFIED / RUNTIME_VERIFIED / PARTIAL / NOT_IMPLEMENTED / UNVERIFIED / BLOCKED) map onto these tags: STATICALLY_VERIFIED ≈ `[SOURCE-VERIFIED]`, TEST_VERIFIED ≈ `[COMMAND-VERIFIED]`, RUNTIME_VERIFIED ≈ `[RUNTIME-VERIFIED]`. The statuses are not interchangeable: a passing build does not prove visual fidelity, a selector in source does not prove runtime application, and a screenshot does not prove all interactions work.

---

## 3.1 Known Documentation Caveats `[SOURCE-VERIFIED]`

- `snippet-organizer-document/` is a **stale archive** of early copies (`CHANGELOG.md`, `UI_ELEMENT_REGISTRY.md`, last updated 2026-10-12). It is superseded by `reports/DOCUMENTATION_CHANGELOG.md` and `docs/project-knowledge/UI_REGISTRY.md`; do not update it.
- `docs/engineering-knowledge/` contains early-era files kept for history; its `UI_ELEMENT_REGISTRY.md` is a subset of the canonical registry and carries a supersession banner.
- Repository-root `README.md`, `PROJECT_BRIEF.md`, `manifest.json`, `popup.html`, `service-worker.js`, `settings.html`, and `index.html` coexist with legacy artifacts (`*-1.*` duplicates, stray `200` / `350` files from an earlier export). The root HTML/manifest files are the active Vite build entries; the `*-1.*`, `200`, and `350` files are unexplained legacy copies — cleanup requires a separate approved task.

---

## 4. Documentation Maintenance Contract

Whenever a future coding agent completes a task, the agent **MUST** uphold this maintenance contract:

### A. Before Making Code Changes
1. Inspect the actual working tree and current uncommitted diff (`git status` or file inspection).
2. Read the relevant documents in this knowledge base according to the reading order.
3. Confirm that the intended change does not violate any approved decision in `DECISIONS.md`.
4. Inspect source files before modifying them; never write code based on stale memory or assumptions.

### B. After Verifying Code Changes
1. Run automated checks (`npm run lint`, `compile_applet`, `npm run build`).
2. Update **only the affected documents** in `docs/project-knowledge/`, `docs/design/`, or `docs/tasks/`.
   - Update `FEATURES.md` if user-visible behavior changed.
   - Update `ARCHITECTURE.md` if modules, dependencies, or runtime patterns changed.
   - Update `DECISIONS.md` if a new architectural decision was approved or revised.
   - Update `INTEGRATIONS.md` if Chrome permissions or external APIs changed.
   - Update `UI_REGISTRY.md` if interactive controls, IDs, or event handlers changed.
   - Update `BACKLOG.md` with the new task status.
3. Append a structured verification log entry to `reports/DOCUMENTATION_CHANGELOG.md`.
4. Never mark a task `VERIFIED` without executing and reporting real command output.
5. Never mark a task `ACCEPTED` without explicit user sign-off.

---

## 5. Scope Protection & Repository Non-Negotiables

1. **TypeScript source in `src/` is the development source of truth**: The extension is authored in TypeScript (`src/`) and compiled via Vite (`vite build`) to `dist/`. The packaged extension is created by `scripts/pack-extension.js`.
2. **Fixed Viewport Dimensions**: Both the docked Chrome toolbar popup and the detached floating window must use one **fixed 480 × 600 px application viewport** (the entire outer window — UI-WINDOW-LOCK-01/02/03/04, ADR-002 Amendment 3, 2026-10-16), with the raised popup inset on an exact 25 px flat-background ring on all four sides. No responsive resizing; the floating window's size is enforced by the service worker with runtime frame compensation (`chrome.windows` sizes are outer dimensions — the page reports the frame delta and the worker enforces layout + delta as a soft lock), and the popup layout keeps the footer pinned with scrolling confined to the snippet list.
3. **No Network Telemetry / Secrets**: The extension operates completely offline using IndexedDB and `chrome.storage.local`. Never introduce external telemetry, analytics, or exposed credentials.
4. **Preserve User Work**: Do not run destructive Git operations or wipe untracked user state.
