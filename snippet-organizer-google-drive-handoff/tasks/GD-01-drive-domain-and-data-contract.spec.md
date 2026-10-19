# GD-01 — Drive Domain and Data Contract

- Status: backlog
- Depends on: GD-00 verified
- UI changes: none

## Goal
Define a stable cloud snapshot envelope, validation/migration rules, conflict vocabulary, and sync metadata feasibility before API/UI work.

## Inputs
Read GD-00 audit and canonical data/backup docs. Stop if audit findings are missing or unverified.

## Requirements
- Reuse current serializer/validator where practical; do not create a parallel format without an ADR.
- Define schema version, stable backup ID, display name, timestamp, app/schema version if available, size, digest/checksum, and payload using fields grounded in the actual model.
- Distinguish app backup ID from Drive file ID.
- Define compatibility behavior for malformed, older, and newer schema versions.
- Define exact duplicate vs same ID/different content vs same name/different ID.
- Define sync feasibility from stable IDs, change detection, delete semantics and relationships.
- Keep validation pure: no local mutation during parse/preview.
- Treat cloud data as untrusted; never render raw fields as HTML.
- A digest detects accidental corruption; do not claim authenticity unless keyed/signed.

Conceptual envelope only; adapt to audited format:
```json
{
  "format": "snippet-organizer-backup",
  "schemaVersion": 1,
  "backupId": "unique-id",
  "displayName": "user label",
  "createdAt": "ISO-8601",
  "payload": {},
  "integrity": {"algorithm": "sha256", "digest": "..."}
}
```

## Required decisions
Schema migration/rejection policy; duplicate names; integrity calculation; unsupported version handling; merge conflict choices; whether tombstones/change metadata are required and supported; privacy/logging rules.

## Tests
Valid snapshot; malformed JSON/envelope; missing fields; unsupported future version; migration if applicable; digest mismatch; duplicate/conflict classification; limits/invalid values.

## Acceptance
- [ ] Schema documented and grounded in real model.
- [ ] Validation causes no local mutation.
- [ ] Conflict vocabulary explicit and tested.
- [ ] Sync feasibility evidence-backed.
- [ ] Canonical docs/ADR updated without duplicate sources.
- [ ] Tests/results recorded honestly.
