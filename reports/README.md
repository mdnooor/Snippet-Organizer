# Reports Index

`reports/` holds the Version 1 audit evidence (new, 2026-10-20) and the preserved historical task reports (unchanged).

## Current — Version 1 final audit set `[COMMAND-VERIFIED]` unless noted

| Report | Contents |
|---|---|
| [VERSION_1_FINAL_AUDIT.md](VERSION_1_FINAL_AUDIT.md) | Executive audit: what V1 is, evidence summary, acceptance status |
| [ARCHITECTURE_AUDIT.md](ARCHITECTURE_AUDIT.md) | Architecture verification against source (layers, boundaries, invariants) |
| [CODE_GRAPH_REPORT.md](CODE_GRAPH_REPORT.md) | Graph deliverables, verified vs inferred edges, completeness limits |
| [TEST_AND_BUILD_REPORT.md](TEST_AND_BUILD_REPORT.md) | Exact commands, exit codes, test counts, packaging evidence |
| [SECURITY_AND_PRIVACY_AUDIT.md](SECURITY_AND_PRIVACY_AUDIT.md) | Permissions/scopes/data-flow findings, severity-labeled |
| [DOCUMENTATION_AUDIT.md](DOCUMENTATION_AUDIT.md) | Documentation completeness checklist + drift corrections made |
| [KNOWN_ISSUES_AND_DEFERRED_WORK.md](KNOWN_ISSUES_AND_DEFERRED_WORK.md) | Consolidated issues, debt, deferrals (nothing fixed in audit) |
| [DOCUMENTATION_CHANGELOG.md](DOCUMENTATION_CHANGELOG.md) | **Canonical chronological change log** (live — updated every turn) |

## Historical (preserved verbatim — describe past states, superseded where noted)

| Report | Stage | Status |
|---|---|---|
| [GD-03-completion-report.md](GD-03-completion-report.md) | Cloud snapshot create/versioning | Historical — implemented; behavior now also pinned by `gdrive-backup` suite |
| [GD-04-completion-report.md](GD-04-completion-report.md) | Browse/download/manage snapshots | Historical — implemented; see `gdrive-browse` suite |
| [GD-05-completion-report.md](GD-05-completion-report.md) | Restore preview & conflicts | Historical — implemented; see `gdrive-restore` suite |
| [GD-06-completion-report.md](GD-06-completion-report.md) | Explicit sync & sync conflicts | **Deferred by decision** — report documents the deferral; no sync code exists |
| [GD-07-completion-report.md](GD-07-completion-report.md) | Settings UI & truth-only status | Historical — implemented (truth-only status is a standing invariant) |
| [GD-08-completion-report.md](GD-08-completion-report.md) | Test hardening & docs handoff | Historical — superseded in parts by later UI turns; tests remain valid |
| [PR1-production-readiness-report.md](PR1-production-readiness-report.md) | Drive connection probe + refresh + production pass | Historical — implemented; refresh semantics extended in turns 17–18 (see changelog) |

Rule: historical reports are never edited to look current. Where later work changed behavior, the [DOCUMENTATION_CHANGELOG.md](DOCUMENTATION_CHANGELOG.md) entry and the current docs govern.
