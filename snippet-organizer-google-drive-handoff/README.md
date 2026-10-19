# Snippet Organizer — Google Drive Integration Handoff Package

**Target:** DeepSeek Harness + GLM. **Status:** Specs only; no application code inspected or changed here.

## Use it
1. Extract/copy this entire folder into the **root of the Snippet Organizer repository/workspace**, keeping the `tasks/` folder.
2. Copy/paste `HARNESS_MASTER_PROMPT.md` into DeepSeek Harness.
3. Run **GD-00 only** first. Review the audit, then ask the agent to execute each subsequent task one at a time.
4. Review diffs, tests, and task evidence before proceeding.
5. Configure Google Cloud OAuth only after GD-00/GD-02 document the exact project-specific setup. Never paste tokens or secrets into prompts.

**Copy-paste alone is not enough** for the full workflow because the prompt references the detailed `tasks/*.spec.md` files. Add this folder to the workspace. Fallback: paste the master prompt plus the current task spec manually.

## Source of truth
The actual repository and its canonical docs are authoritative. The agent must inspect the actual equivalents of README/handoff, AGENTS.md, architecture/file structure, features/data model/storage, backup/import/restore, MV3/permissions, security/privacy, tests/build, roadmap, and ADRs. Do not claim a file exists unless found. Reconcile contradictions before coding.

## Execution order
| Order | ID | Spec | Outcome | Depends on |
|---:|---|---|---|---|
| 1 | GD-00 | `tasks/GD-00-project-audit-and-decisions.spec.md` | Audit and decisions; no product code changes | — |
| 2 | GD-01 | `tasks/GD-01-drive-domain-and-data-contract.spec.md` | Backup schema, validation, conflicts, sync feasibility | GD-00 |
| 3 | GD-02 | `tasks/GD-02-google-oauth-and-drive-client.spec.md` | Secure connect/disconnect and Drive client | GD-00, GD-01 |
| 4 | GD-03 | `tasks/GD-03-create-and-version-cloud-backups.spec.md` | Named, separate, versioned snapshots | GD-01, GD-02 |
| 5 | GD-04 | `tasks/GD-04-browse-download-and-manage-backups.spec.md` | List/download/delete cloud snapshots | GD-03 |
| 6 | GD-05 | `tasks/GD-05-restore-preview-and-conflict-resolution.spec.md` | Preview, Merge/Replace, conflict handling | GD-01, GD-03, GD-04 |
| 7 | GD-06 | `tasks/GD-06-explicit-sync-and-sync-conflicts.spec.md` | Real sync only if safe; otherwise blocked/deferred | GD-01, GD-02, GD-05 |
| 8 | GD-07 | `tasks/GD-07-settings-ui-and-accessibility.spec.md` | Minimal UI in Settings → Backup & Data | GD-02–GD-06 |
| 9 | GD-08 | `tasks/GD-08-test-hardening-and-docs-handoff.spec.md` | Regression, security, docs, final handoff | GD-00–GD-07 |

## Guardrails
- Preserve existing local snippets, categories, favorites, Trash/recovery, and local backup/import/restore.
- Preserve the approved Red Glass-Claymorphism UI; all Drive controls go in **Settings → Backup & Data**.
- Google Drive only; other providers are out of scope.
- Separate backup snapshots are not sync. Do not call snapshot upload “sync.”
- No silent background sync or automatic destructive conflict winner unless explicitly approved.
- Do not invent retention limits, scopes, OAuth IDs, file paths, commands, or data fields.
- Keep local-only use working when Drive is disconnected/offline.
- Mark verification accurately; mocks/builds do not prove real OAuth or Drive E2E.

## Final deliverables
Implementation report by task ID; changed files; exact commands/results; manual Cloud Console setup; permission/scope rationale; runtime verification level; known limitations/backlog; confirmation no secrets committed.
