# GD-03 Completion Report — Create and Version Cloud Backups

- **Task ID / Title**: GD-03 — Create and version cloud backups
- **Date**: 2026-10-18 (Asia/Dhaka)
- **Status**: `implemented-unverified` — code, contract, and offline tests complete; real Drive interaction NOT exercised (blocked on the GD-02 user-owned Google Cloud configuration; end-to-end gate is GD-08)

---

## 1. Summary

GD-03 delivers the ability to create a named, full-fidelity cloud snapshot of the snippet library in the user's own Drive `appDataFolder`, with versioning that can never silently overwrite a previous snapshot. Flow: interactive authorization (GD-02) → read-only local gathering (active **and** trashed snippets, categories, preferences — tombstones preserved, no purge side effect) → v2 envelope build (GD-01 contract: deterministic `backupId`, UTC filename, SHA-256 integrity digest) → upload of a **new** Drive file (multipart ≤5 MB, resumable >5 MB) whose app-private `appProperties` carry the unique `backupId` for later identification. Success is declared only after Drive confirms and returns the file id. Ambiguous network failures are reconciled by the unique backup ID before any retry. Duplicate display names are allowed by contract; nothing is ever overwritten or deleted; no retention policy is invented; the operation is strictly explicit user-initiated (D6). Boundary respected: no GD-04 browse/download UI, no GD-05 restore, no unrelated changes, no new dependencies.

## 2. Every file created/modified and why

**New application code**
- `src/gdrive/gather.ts` — local library gathering with injected readers: trash-inclusive, id-sorted (deterministic digests), pure (copies, no mutation), counts surfaced.
- `src/gdrive/driveClient.ts` — injectable-fetch Drive client: multipart/resumable upload of the serialized envelope to `appDataFolder`, typed results (`ok` / `unauthorized` / `forbidden` / `network-error`(ambiguous) / `error`), and the `listSnapshotFiles` reconciliation primitive. No token or content logging.
- `src/gdrive/backup.ts` — `createCloudBackup(deps, options)` orchestrator: typed outcomes for every failure mode; 401 → clear cached token + silent re-auth + retry ONCE; network-ambiguous → reconcile by backupId (1 = reconciled success, 0 = typed retryable failure, ≥2 = typed ambiguous, never auto-deletes); `displayName` passthrough (spec: user-entered name).

**Modified application code**
- `src/db.ts` — added `getAllSnippetsIncludingTrash()`: read-only `getAll()`, tombstones preserved, id-sorted, **no `purgeExpiredTrash` side effect** (deliberately unlike `getAllSnippets`/`getTrashedSnippets`). No existing function changed; local export/import untouched.

**New tests**
- `tests/gdrive-backup.test.ts` — 22 tests: gathering (tombstones, determinism, no mutation, reader-contract violations), DB helper export marker, Drive client request shapes (multipart URL/auth/metadata/media; resumable init→Location→PUT; list query syntax; 401/403/500/throw mapping), orchestrator (confirmed success + counts; tombstone fidelity end-to-end via `parseCloudSnapshot`; no credentials in payload; distinct repeated backups; deterministic same-second backupId; 401 retry-once; persistent-401; reconcile 1/0/≥2; not-configured short-circuit; denied/gather-failure; 403; single read-only gather).

**Documentation**
- `docs/google-drive-integration/data-contract.md` — §14 GD-03 addendum (gathering rules; upload form incl. multipart ≤5 MB / resumable; appProperties reconciliation; ambiguity policy; duplicate-name policy; no retention) + §13 open-items line corrected (gather helper delivered in GD-03, not GD-05).
- `docs/tasks/BACKLOG.md` — GD-03 row (after GD-02) + "Current Active Task" note.
- `snippet-organizer-google-drive-handoff/BACKLOG.md` — GD-03 row → `implemented-unverified` + Records entry.
- `snippet-organizer-google-drive-handoff/tasks/active.md` — reset to no-active; GD-04 gated on explicit go-ahead.
- `snippet-organizer-google-drive-handoff/tasks/completed.md` — GD-03 record (GD-02-style).
- `reports/DOCUMENTATION_CHANGELOG.md` — GD-03 entry prepended.
- `reports/GD-03-completion-report.md` — this report (created per the new mandatory rule; **no** retroactive GD-01/GD-02 reports created).

## 3. Decisions and ADRs followed (none new)

- **D1** (per-user, own-account OAuth) and **D3** (`drive.appdata`) — unchanged; the client touches only `appDataFolder`.
- **D4/D5** (v2 snapshot contract, UTC naming, tombstones preserved, `id` + content-hash identity, never silently overwrite) — gathering uses the trash-inclusive read; uploads are strictly additive; `backupId` remains the deterministic application-level identity.
- **D6** (explicit user-initiated only) — `createCloudBackup` is a plain async function with no background scheduler; UI invocation belongs to GD-04/GD-07.
- **ADR-010/011/012** — carried forward, unchanged. No new ADR: nothing deviates from closed decisions; GD-03-specific contract details were recorded as data-contract.md §14 instead of duplicating GD-01/GD-02 docs.
- **Spec requirements honored**: approved payload only (no tokens/secrets/logs); independently identifiable snapshots (unique file + backupId + appProperties); duplicate names follow policy (allowed, never overwrite by name); Drive revisions are not the versioning mechanism (each snapshot is its own immutable file); no invented retention limits; failures preserve local data and never fake success.

## 4. Exact commands run and actual results

| Command | Actual result |
|---|---|
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors `[COMMAND-VERIFIED]` (three intermediate runs surfaced 2 syntax/type issues; each was fixed and re-run to green) |
| `npx.cmd tsx tests/gdrive-backup.test.ts` | 22 pass, 0 fail, exit 0 `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-contract.test.ts` | 27 pass, 0 fail, exit 0 (regression) `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-auth.test.ts` | 21 pass, 0 fail, exit 0 (regression) `[COMMAND-VERIFIED]` |
| Live doc verification (Playwright) of `developers.google.com`: files/create reference, manage-uploads guide, files resource reference, search-files guide | pages fetched and conclusions extracted on 2026-10-18 `[SOURCE-VERIFIED]` |

## 5. Verified vs inferred vs unknown

**Verified with evidence**
- Drive upload URI `POST https://www.googleapis.com/upload/drive/v3/files`, `uploadType=multipart` semantics, and the **official ≤5 MB multipart limit**; resumable init request (metadata body, `Content-Type: application/json; charset=UTF-8`, `X-Upload-Content-Type/-Length`) → 200 + `Location` session URI → data PUT; `appProperties` = app-private key/value metadata readable only authenticated; query syntax `appProperties has { key='backupId' and value='…' }` and `name` terms; `spaces=appDataFolder`. `[SOURCE-VERIFIED]` (live page fetches, 2026-10-18)
- All 70 offline tests (22+27+21) and clean lint. `[COMMAND-VERIFIED]`
- Existing GD-01/GD-02 module contracts re-read from source before wiring (`BuildSnapshotInput`, `buildCloudSnapshot`, `parseCloudSnapshot`, `exportAllData`, purge side effects in `getAllSnippets`/`getTrashedSnippets`). `[SOURCE-VERIFIED]` (repo source)

**Inferred (reasonable but not independently proven)**
- Exact multipart boundary serialization (part ordering/`Content-Type` per part) follows the documented Google multipart convention; the body structure is asserted by our own tests, not by a live Drive response. `[INFERRED]`
- `Content-Length` intentionally not set manually (browser-controlled forbidden header); `X-Upload-Content-Length` set per docs. Server acceptance `[INFERRED]`.
- `size` parsing tolerates both string and number JSON forms (v3 typically returns strings). `[INFERRED]`

**Unknown / not verified**
- Any real Drive interaction: upload, reconcile, 401-retry, quota behavior — requires the GD-02 user-owned Cloud configuration (stable extension ID `key`, OAuth client ID "Chrome Extension", consent/Audience, Drive API enabled); ultimately GD-08. `[UNKNOWN]`
- `getAllSnippetsIncludingTrash` runtime behavior under real IndexedDB — not executable in node:test; type-checked only (in Node it resolves `[]` by design, which the marker test asserts). `[UNKNOWN]` in-app
- Extension version resolution via `chrome.runtime.getManifest()` at runtime (default path; tests inject versions). `[UNKNOWN]` in-app

## 6. Blockers, risks, configuration, deferred items

- **Blocker (carried from GD-02)**: live authorization and therefore live upload verification require the user-owned Google Cloud configuration; exact steps remain in `docs/google-drive-integration/oauth-contract.md` §6. Nothing fabricated; placeholder client ID unchanged.
- **Risks**: (a) duplicate `backupId` files are possible when identical content is backed up within the same second — by design; surfacing/dedupe is GD-04; the orchestrator reports a typed `ambiguous` outcome rather than auto-deleting. (b) Snapshot >50 MB is rejected by the GD-01 parse guard only on read; upload has no additional cap (Drive limits apply; multipart automatically avoided >5 MB). (c) Resumable session URIs expire after one week (official docs) — irrelevant to the single-shot flow but relevant to future GD-04 resume features.
- **Configuration**: none added. Manifest untouched in GD-03 (GD-02's `identity` + `oauth2` suffice; `drive.appdata` is the only scope).
- **Deferred by scope**: backup list UI/download (GD-04), restore + conflict resolution (GD-05), explicit sync (GD-06), Settings UI/footer cleanup (GD-07), E2E with real account (GD-08), deletion/retention management (GD-04+, noting appDataFolder files cannot be trashed — deletions are permanent).

## 7. Boundary confirmation

Implemented **only** snapshot gathering, building, uploading, and versioning identity. Not implemented: GD-04 browse/download/manage UI, GD-05 restore, GD-06 sync, GD-07 footer/UI work, GD-08 live E2E. No background sync of any kind (D6). Local `exportAllData`/`importData` behavior unchanged. No new dependencies. No user questions asked; closed decisions were not reopened.

## 8. Recommended next task (not started)

**GD-04 — Browse/download/manage backups** (handoff spec: `snippet-organizer-google-drive-handoff/tasks/GD-04-*.spec.md`). It consumes `listSnapshotFiles` + `SnapshotListEntry` hydration and the Settings UI home from the GD-03 spec. Per the master prompt, GD-04 has **not** been started and awaits explicit user go-ahead.
