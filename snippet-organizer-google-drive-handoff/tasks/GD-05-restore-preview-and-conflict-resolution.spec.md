# GD-05 — Restore Preview and Conflict Resolution

- Status: backlog
- Depends on: GD-01 verified; GD-03 verified; GD-04 verified
- Risk: high data-loss risk
- UI: Settings → Backup & Data

## Goal
Restore safely with a read-only preview, existing Merge/Replace semantics, explicit conflict handling, validation before mutation, and rollback/recovery.

## Workflow
1. Select Restore for a snapshot.
2. Download and validate envelope/schema/required fields/size/digest/relationships without local mutation.
3. Preview name/time/compatibility and counts/differences only when accurately computable.
4. Choose existing Merge or Replace semantics.
5. For Merge, review supported conflicts and choose resolution where needed.
6. For Replace, explain replacement scope and require explicit confirmation.
7. Create a safety checkpoint/local backup if supported. If no safe rollback is possible, block destructive Replace until a decision is approved.
8. Commit safely; report success only after writes and post-restore checks succeed.

## Conflicts
Distinguish exact duplicate; same stable ID/different content; same title/name but different IDs; missing/deleted records; category/relationship mismatch; malformed records; schema migration. Same name does not mean same record unless the actual model defines it.

## Merge
Reuse existing semantics. Exact duplicates follow established policy (normally skip). Same-ID/different-content must not silently overwrite; offer supported choices such as keep local/use backup/skip/duplicate. Preserve category links, favorites, Trash and relationships.

## Replace
Never clear storage before full validation. Require confirmation. Preserve settings not in backup unless existing contract says otherwise. If write fails, rollback/recover or block the operation; no silent partial restore.

## Tests
Malformed/unsupported/corrupt snapshot never mutates local data; duplicate/conflict cases; Replace cancel unchanged; successful Replace matches current semantics; injected write failure rollback; relationships preserved; checkpoint failure blocks destructive restore; accurate counts.

## Acceptance
- [ ] Preview is read-only.
- [ ] Existing semantics preserved or explicitly approved.
- [ ] Conflicts deterministic, visible and tested.
- [ ] Replace confirmed and recoverable.
- [ ] Validation precedes mutation.
- [ ] No silent partial restore.
- [ ] Tests/docs updated.
