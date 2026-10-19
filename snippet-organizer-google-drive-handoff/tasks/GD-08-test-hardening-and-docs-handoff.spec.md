# GD-08 — Test Hardening, Documentation, and Final Handoff

- Status: backlog
- Depends on: GD-00–GD-07 verified or explicitly blocked/deferred
- Scope: verification/security/docs only

## Verification matrix
Run actual commands discovered in GD-00; do not invent commands. Record exact results for lint/typecheck/build; schema/serializer/integrity/Drive/auth/conflict tests; Settings UI; local backup/import/restore regressions; extension smoke test if supported; real OAuth/Drive E2E; offline/expired auth/rate limit/network interruption; restore Merge/Replace/rollback; sync idempotence/conflicts/deletions if enabled; permissions/token leakage review.

## Evidence labels
- `STATICALLY VERIFIED`: source inspection only
- `UNIT TESTED`: isolated automated tests passed
- `BUILD VERIFIED`: actual build command succeeded
- `EXTENSION SMOKE TESTED`: extension loaded and screens exercised
- `OAUTH VERIFIED`: real OAuth flow completed with configured test client
- `DRIVE E2E VERIFIED`: real upload/list/download/restore tested against a test Drive account
- `SYNC E2E VERIFIED`: real sync/conflict path tested if enabled

Mocks do not prove OAuth/Drive E2E; a build does not prove runtime. If setup/test account unavailable, mark runtime unverified/blocked.

## Security review
Confirm least privilege; search source/logs/tests/docs for tokens/secrets; ensure tokens do not reach content scripts/web pages; validate untrusted Drive data before mutation; no snippet contents/tokens in logs; cloud delete cannot delete local data; Replace/conflicts are explicit and recoverable; no remote executable code introduced.

## Canonical docs
Update existing canonical project overview/handoff, architecture/file structure, features, data model/storage, backup/import/restore, MV3 permissions/security/privacy, development/testing, roadmap/backlog, Chrome Web Store readiness/release notes as relevant. Do not create competing duplicate docs.

Document OAuth flow/scopes, manual Cloud setup and client ID location, schema/migration, Drive file organization/versioning, Merge/Replace/conflicts, sync direction/limits, disconnect/token behavior, offline fallback, evidence and known limits.

## Acceptance
- [ ] In-scope criteria verified or explicitly blocked.
- [ ] Local feature regressions pass.
- [ ] No secrets/tokens committed.
- [ ] Docs match actual code.
- [ ] Backlog and known limits updated.
- [ ] Final report lists files, commands/results, setup steps, evidence levels.
- [ ] No production-ready claim without real configured runtime testing.
