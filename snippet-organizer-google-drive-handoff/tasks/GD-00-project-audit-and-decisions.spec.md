# GD-00 — Project Audit and Decisions

- Status: backlog
- Depends on: none
- Type: audit/reconciliation only; **no product code changes**
- UI: none

## Goal
Establish an evidence-backed view of the existing project and identify decisions needed before implementing Drive features. This prevents assumptions about stack, data schema, paths, or restore behavior.

## Read
This package; repository instructions/AGENTS.md; README/handoff/project context; architecture/file structure; features and data model/storage; local backup/import/restore; MV3/permissions/service worker/extension identity; security/privacy; development/testing/build; roadmap/backlog/ADRs. Locate actual equivalents; do not fabricate missing docs.

## Audit
1. Repository tree, entry points, package manager, real build/test/lint commands.
2. Manifest, MV3, service worker, settings/options route, extension ID/build strategy, CSP and permissions.
3. Settings → Backup & Data UI, reusable controls/dialogs/toasts/loading states, existing visual conventions.
4. Entities, IDs, relationships, timestamps, categories, favorites, Trash/recovery, storage API and transaction/rollback support.
5. Actual backup format, schema, validation, Merge/Replace rules, duplicate handling, error paths and tests.
6. Token/secret handling, content-script boundaries, logs and data exposure.
7. Existing test framework, fixtures and manual test procedure.
8. Canonical docs and source/docs mismatches.

## Deliverables
Create/update `docs/google-drive-integration/audit.md` or the canonical equivalent, an ADR/decision log if the repo uses one, and `BACKLOG.md`. Include file paths/symbols as evidence; exact commands discovered; existing backup behavior; entities/stable IDs; permissions and purpose; unknowns/blockers; proposed module map. Do not modify app source.

## Decisions to record
- Supported MV3 OAuth flow, extension ID/redirect setup.
- Narrowest Drive scope compatible with chosen backup discovery/storage model.
- Token location/lifecycle and contexts allowed to access it.
- App-owned backup location (e.g. dedicated user-visible folder vs app data area): compare user discoverability, least privilege, and recovery.
- Snapshot schema/migrations and backup naming/identity.
- Merge conflict detection and rules.
- Whether current data model supports safe sync, edits/deletes/tombstones.
- Atomic writes/rollback for restore.
- Canonical docs to update.

## Acceptance
- [ ] Actual source/docs inspected.
- [ ] No application source files changed.
- [ ] Facts, inference, and open questions clearly separated.
- [ ] Local backup/restore behavior documented with evidence.
- [ ] OAuth, scope, storage, sync decisions and risks listed.
- [ ] Backlog updated; actual commands recorded.
- [ ] No claims about uninspected files.

## Stop conditions
If source is unavailable or a data-loss/privacy/permission decision cannot be resolved, report a blocker. Do not proceed to GD-01 automatically.
