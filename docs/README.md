# Documentation Index — Snippet Organizer (Version 1)

Every document below is grounded in the current source (`src/`, `public/`, `scripts/`, `tests/`) as of 2026-10-20. Historical evidence lives in `reports/` and `snippet-organizer-google-drive-handoff/` and is clearly labeled there. **If any document contradicts the source code, the source wins** — report the drift instead of trusting the doc.

## Core

| Document | Purpose |
|---|---|
| [PRODUCT_OVERVIEW.md](PRODUCT_OVERVIEW.md) | What the product is, user workflows, V1 scope |
| [QUICK_START.md](QUICK_START.md) | Clone → run → verify, fastest path |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layered architecture, entry points, boundaries |
| [CODEBASE_MAP.md](CODEBASE_MAP.md) | Module responsibility tables, feature→file lookup |
| [CODE_GRAPH.md](CODE_GRAPH.md) | Code-graph deliverables, completeness statement |
| [DATA_FLOW.md](DATA_FLOW.md) | UI → service → storage flows |

## Data & integrations

| Document | Purpose |
|---|---|
| [DATA_MODEL.md](DATA_MODEL.md) | Entities, IndexedDB schema, backup serialization |
| [STORAGE_AND_PERSISTENCE.md](STORAGE_AND_PERSISTENCE.md) | IndexedDB + `chrome.storage.local` key inventory |
| [GOOGLE_DRIVE_INTEGRATION.md](GOOGLE_DRIVE_INTEGRATION.md) | Drive operations, endpoints, error handling |
| [AUTH_AND_DISCONNECT.md](AUTH_AND_DISCONNECT.md) | OAuth flow, silent vs interactive, disconnect invariant |
| [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) | Snapshot lifecycle end-to-end |

## UI, quality, operations

| Document | Purpose |
|---|---|
| [UI_COMPONENTS.md](UI_COMPONENTS.md) | Components, interactions, accessibility |
| [TESTING.md](TESTING.md) | Suites, conventions, coverage boundaries |
| [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md) | Build, packaging (incl. Windows workaround), release checklist |
| [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) | Permissions, scopes, data handling, findings |
| [CONFIGURATION.md](CONFIGURATION.md) | Manifest, Vite, TS config, env vars |

## State of the project

| Document | Purpose |
|---|---|
| [VERSION_1_BASELINE.md](VERSION_1_BASELINE.md) | Verified V1 functionality (evidence-tagged) |
| [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) | Current limits and gaps |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | Debt inventory (no code changed in this audit) |
| [ROADMAP.md](ROADMAP.md) | Deferred work & V2 proposals (proposals ≠ agreements) |
| [GLOSSARY.md](GLOSSARY.md) | Project terms |
| [CHANGELOG.md](CHANGELOG.md) | Points to the canonical change log (no duplicate) |

## Diagrams

`diagrams/system-architecture.mmd`, `module-dependencies.mmd`, `data-flow.mmd`, `google-drive-flow.mmd`, `backup-restore-flow.mmd`, `test-coverage-map.mmd` — Mermaid sources; rendered inline where embedded. See [CODE_GRAPH.md](CODE_GRAPH.md) for verified-vs-inferred edge labeling.

## Generated inventories

`generated/repository-tree.md`, `generated/source-inventory.md`, `generated/dependency-inventory.md` — produced by `node scripts/generate-doc-inventory.mjs` (Node `fs` only, no new dependencies). Regenerate after structural changes.

## Pre-existing canonical documentation (preserved, still authoritative for their topics)

These predate this audit and remain canonical; the new documents link to them rather than copying:

- [`docs/project-knowledge/`](project-knowledge/README.md) — agent entry point, reading order, evidence-tagging contract, `ARCHITECTURE.md` (living session-level architecture log), `DECISIONS.md` (ADRs — including the 480×600 window lock and GD-06 deferral), `FEATURES.md`, `INTEGRATIONS.md`, `UI_REGISTRY.md`, `code-graph/metadata.md` (static dependency map).
- [`docs/design/DESIGN_SYSTEM.md`](design/DESIGN_SYSTEM.md) — locked Red Glass-Claymorphism spec (ADR-009); plus `INTERACTION_FLOWS.md`, `SCREEN_REGISTRY.md`.
- [`docs/google-drive-integration/`](google-drive-integration/audit.md) — OAuth contract, Drive data contract, integration audit.
- [`docs/engineering-knowledge/`](engineering-knowledge/CHANGELOG.md), [`docs/tasks/`](tasks/BACKLOG.md) — task index & per-task specs/handoffs.

## Deliberately not duplicated

- `docs/CHANGELOG.md` is a pointer, not a copy: the canonical chronological change log is [`reports/DOCUMENTATION_CHANGELOG.md`](../reports/DOCUMENTATION_CHANGELOG.md).
- No `docs/DEPLOYMENT.md`: there is no deployment target — this is a Chrome extension loaded unpacked (see [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md)).
- Root `PROJECT_BRIEF.md` duplicates `docs/project-knowledge/PROJECT_BRIEF.md`; the docs/ copy is canonical (root copy flagged in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).
