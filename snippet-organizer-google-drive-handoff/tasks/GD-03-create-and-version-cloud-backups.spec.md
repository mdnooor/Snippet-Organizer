# GD-03 — Create and Version Cloud Backups

- Status: backlog
- Depends on: GD-01 verified; GD-02 verified
- UI: Settings → Backup & Data

## Goal
Create separately named cloud snapshots; repeated backups must not silently overwrite previous snapshots.

## Workflow
1. User connects Drive first.
2. Select `Create cloud backup`.
3. Enter a name unless audited UX conventions specify otherwise; explain included data.
4. Serialize using approved local format and GD-01 envelope.
5. Validate and compute approved digest.
6. Upload a new file with unique identity and timestamp.
7. Show success only after Drive confirms the upload and required metadata is returned. For ambiguous timeout, reconcile by unique backup ID before retrying.

## Requirements
- Include only approved payload data. Preserve Trash/recovery/relationships if local backup includes them. Never include OAuth tokens, secrets, logs, or unrelated settings.
- Every snapshot is independently identifiable and restorable.
- Duplicate names follow approved policy; never overwrite based only on name.
- Version metadata is user-visible. Drive revisions cannot be the only versioning unless explicitly approved.
- Do not invent retention limits; absent an approved policy, retain until user deletion subject to Drive limits.
- Failures preserve local data and never show false success/fake progress.

## Tests
Two backups stay distinct; duplicate-name policy; envelope/digest correct; upload failure/timeout/retry reconciliation; no credentials in payload; local data unchanged.

## Acceptance
- [ ] Named snapshot creation works with real service.
- [ ] Repeated backups create separate snapshots.
- [ ] Version metadata/integrity stored and validated.
- [ ] Failure does not mutate local data or report false success.
- [ ] Tests/docs updated.
