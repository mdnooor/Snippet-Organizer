# Google Drive Backup — Cloud Snapshot Data Contract (GD-01)

**Status**: IMPLEMENTED-UNVERIFIED (contract code + tests delivered; real Chrome/Drive runtime verification belongs to GD-02+)
**Date**: 2026-10-18
**Canonicality**: This document is the single canonical specification of the cloud snapshot contract. `src/gdrive/types.ts` is the authoritative type source; this doc explains and constrains it. Supersedes the *proposals* D3–D6 in `docs/google-drive-integration/audit.md` §10, which the user finalized on 2026-10-18 (see ADR-010/ADR-011 in `docs/project-knowledge/DECISIONS.md`).

---

## 1. Scope and boundaries

GD-01 delivers the **data contract only**: schema, validation/migration rules, integrity, content hashing, conflict vocabulary, and restore-preview semantics — as pure, dependency-free code with tests.

Explicitly **out of scope** (later tasks): OAuth flow and Google Cloud configuration (GD-02), any Drive API call or network access (GD-02/03), snapshot browsing UI (GD-04), the restore **transaction** and preview UI (GD-05 — GD-01 only produces the pure write *plan*), any UI or manifest change (GD-07), E2E test hardening (GD-08).

## 2. Identity and tenancy (final decisions D1 + D3)

- The extension is a **universal multi-user product**: every user independently authorizes their **own** Google account. No developer account, token, or credential is ever embedded or shipped as a product identity.
- Backups live in each user's own Drive **appDataFolder** (`drive.appdata` scope, hidden from the user's Drive UI, not shareable). Per-user isolation is provided by Google per authorization — the developer provisions nothing per user.
- **Application configuration ≠ user identity**: OAuth Client ID, extension ID, redirect URI, Cloud project, and consent-screen branding identify the *application* and are GD-02 setup concerns. They are never a user's identity, and no `client_secret` may ever ship in the extension bundle.
- This module performs no OAuth and holds no tokens. Local-first behavior (ADR-001) is unchanged; cloud backup is an explicit, user-initiated surface.

## 3. Envelope schema v2

One file = one point-in-time snapshot. Authoritative shape: `CloudSnapshotEnvelope` in `src/gdrive/types.ts`.

| Field | Type | Rules |
|---|---|---|
| `format` | `"snippet-organizer-backup"` | Constant; envelope recognition marker |
| `schemaVersion` | `2` | Envelope version. Payload stays BackupData-v1-shaped (`payload.version: 1`) |
| `backupId` | string | **Application-level stable ID**, deterministic: `bk-<compactUtc>-<digest8>` (digest = payload integrity digest, first 8 hex chars). Same inputs ⇒ same ID. Distinct from Drive's file ID |
| `displayName` | string | User-facing label; default = file base name. **Duplicates allowed** (Drive file ID disambiguates; listing must too) |
| `createdAt` | string | ISO-8601 **UTC** |
| `appVersion` | string | Extension version at creation; `"unknown"` for migrated legacy files |
| `payload` | `SnapshotPayload` | BackupData v1 shape (`version:1`, `exportedAt` epoch-ms, `appName`, `snippets`, `categories`, `preferences?`) with two contract differences: `snippets` **includes trashed records** (tombstones preserved); `preferences` is **optional** (absent ⇒ local preferences untouched on restore) |
| `integrity` | `{algorithm:"sha256", digest}` | SHA-256 hex over `canonicalJson(payload)` — see §4 |

- **`backupId` vs Drive file ID**: the envelope carries only `backupId`. Drive assigns its own resource ID per uploaded file; it appears only in `SnapshotListEntry` (browse metadata, GD-04) together with `sizeBytes` (byte length of the stored file). Size is deliberately **external metadata** — it cannot live inside the file it measures.
- **Naming (D4)**: UTC only — `snippet-organizer-snapshot-YYYYMMDDTHHMMSSZ.json` (`createSnapshotFileName`). Local file export naming/format is **unchanged**.
- Local `BackupData` remains structurally assignable to `SnapshotPayload` (type-level compatibility is checked in `src/gdrive/types.ts`).

## 4. Integrity

`integrity.digest = SHA-256(canonicalJson(payload))`, where `canonicalJson` recursively sorts object keys and strips insignificant whitespace — digests are stable across machines and runs. Verification happens **before** payload contents are trusted.

**Honesty rule**: SHA-256 here is unkeyed — it detects **accidental corruption only**. It proves nothing about who created a snapshot (no authenticity/signature claim is made anywhere in the product or docs).

## 5. Version and compatibility policy

| Input | Behavior |
|---|---|
| Envelope, `schemaVersion: 2` | Strict validation (§6) |
| Envelope, `schemaVersion > 2` | **Rejected** as `unsupported-version` with the observed value. Never best-effort parsed; user is told to update the app |
| Envelope, `schemaVersion < 2` (e.g. 1 with envelope marker) | `invalid` — bare v1 files carry no envelope; this combination is inconsistent |
| Bare BackupData v1 file (no `format` field, has `snippets`+`categories`) | **Migrated in memory** to a v2 envelope (`legacy-v1-migrated` warning). Lenient record coercion mirroring the existing local importer: `isFavorite` → `Boolean(...)`, numeric-string timestamps → `Number(...)`, missing `version`/`lastUsedAt`/`deletedAt` → `0`/`null`/`null`, missing `color` → `#4f46e5`. Migration never rewrites local files and **does not bump `version`** (it is a pure transform; version bumps are a write-time concern) |
| Not JSON, not an object, or unrecognized shape | `parse-error` / `invalid` with field paths |

Policy decision recorded: **envelope-level strictness, record-level quarantine** — a whole snapshot is rejected for envelope/integrity failures, but a single malformed *record* is quarantined (excluded, explicitly warned) instead of failing the file, so one bad record cannot block recovery of the rest. Migration/rejection policy is final per ADR-011.

## 6. Validation rules and error taxonomy

`parseCloudSnapshot(json, {maxBytes?}) → ParsedSnapshot`:

- `ok` — normalized envelope + warnings list
- `parse-error` — invalid JSON
- `invalid` — envelope/integrity/payload-shape failures, each with a `path` + message
- `unsupported-version` — future schema, observed value attached

Record-level rules (both v2-strict and v1-lenient paths): `id` non-empty; `title` non-empty after trim; `content` string; `categoryId` non-empty; `createdAt`/`updatedAt` finite numbers; `lastUsedAt`/`deletedAt` finite-or-null; `version` finite ≥ 0. **Unknown extra fields are ignored with a warning** (forward tolerance within v2). **Duplicate ids inside one snapshot: first occurrence kept, warning raised.** Quarantined records appear as `record-quarantined` warnings with index + id. Preferences absent/malformed ⇒ `preferences-absent` / `preferences-invalid` warning and exclusion. Validation is **pure**: nothing is mutated or persisted at parse/preview time (acceptance requirement), and parsed values are fresh copies.

## 7. Content hash and normalization (final decision D5)

`contentHashOfSnippet` = `"sha256:" + SHA-256(canonicalJson({title, content, categoryId, isFavorite}))` with:

| Field | Normalization | In hash? |
|---|---|---|
| `title` | trimmed | Yes |
| `content` | **verbatim** — no HTML normalization | Yes |
| `categoryId` | verbatim | Yes |
| `isFavorite` | boolean | Yes |
| `createdAt`, `updatedAt`, `lastUsedAt` | — | **No** (volatile) |
| `version` | — | **No** (bumps on usage/copy/import — `db.ts:414-434`, `:954`) |
| `deletedAt` | — | **No** — compared as a separate deletion state (§8) |

Rationale: usage counters, copy activity, and import-time version bumps are not content changes, so they must not manufacture conflicts; verbatim content comparison can **over-report** trivial differences (visible to the user) but never hides a real one (silent loss).

## 8. Conflict vocabulary and restore semantics

`computeRestorePreview({snapshot, localSnippets (incl. trash), localCategories}) → RestorePreview`. Vocabulary (each class is produced and tested):

| Class | Definition | Restore behavior |
|---|---|---|
| **add** (`toAdd`) | id absent locally (active *or* trashed) | Written |
| **unchanged** (exact duplicate) | same id + same content hash + same deletion state | Skipped (no-op) |
| **content-conflict** | same id, content hash differs | User chooses per record: `keep-local` (default) / `take-incoming` / `keep-both` (incoming re-id'd) |
| **deletion-state-conflict** | same id, hash equal, deleted-state differs (incl. active-vs-trashed) | Same three choices |
| **same name / different id** (`duplicateNames`) | equal normalized titles, different ids | **Not a conflict** — informational; both kept (matches existing duplicate handling) |
| **duplicate-id-in-snapshot** | same id twice within one snapshot | First kept, warning (§6) |
| **missing category** (`missingCategoryIds`) | referenced id in neither snapshot nor local store | Restored record maps to the `default` category (existing import behavior) |

Resolution rules (final, per D5): conflicts are **always visible in the preview**; **nothing is silently overwritten**; the default for any unspecified conflict is `keep-local`; **naive "newest timestamp wins" is never used**. `applyResolutions(preview, {choices, applyPreferences?, newIdFactory?}) → RestoreWritePlan` is pure: it returns `snippetsToWrite`, `categoriesToWrite` (put = merge by id), `reIdApplied`, `missingCategoryFallbackIds`, `applyPreferences` (opt-in only). **GD-05 must execute the plan in a single transaction**, following the existing atomic write pattern in `src/db.ts` (`importData`/`resetToDefaultData`), after a mandatory pre-restore safety snapshot (GD-00 D7).

The preview input takes local snippets **including trashed records**; the caller (GD-05) is responsible for reading both states — `getAllSnippets()` alone filters trash (`db.ts:214`), so a trash-inclusive read must be used or added then.

## 9. Sync scope v1 and feasibility (final decision D6)

v1 supports **explicit, user-initiated** operations only: upload snapshot · browse/list · download · preview-and-restore. No background sync, no automatic conflict resolution, no implied "synced" state (the fake footer status is removed in GD-07).

Feasibility analysis (evidence-backed): stable `id`s make per-record diffing possible, and the §7 content hash gives change detection that survives usage/import bumps. But **continuous two-way sync is not feasible in v1** because: (1) `updatedAt`/`version` change without edits, so timestamps cannot order changes; (2) the trash tombstone is destroyed after the 72 h retention purge, so a deletion can become indistinguishable from "never existed" on another device; (3) no change log exists in IndexedDB. A future delta-sync would require an app-level change-log store — a new architectural component that must be proposed and approved (deferred unless approved). Until then, snapshots are **full point-in-time copies**, which the v1 flow uses correctly.

## 10. Privacy, security, and logging

- Payloads contain plaintext snippet content: **never logged, never telemetered**. Loggable: `backupId`, counts, warning codes, sizes.
- Cloud data is **untrusted input**: parsed through this contract only; preview/restore UI must render fields as text (React escapes by default — never `dangerouslySetInnerHTML` with cloud data). No raw HTML rendering anywhere in this module.
- No tokens, credentials, or network calls exist in this module. Tokens (GD-02+) never enter `src/gdrive/` types; storage-session handling is GD-02 scope.
- The parse size guard (`DEFAULT_MAX_SNAPSHOT_BYTES` = 50 MB, overridable) protects against accidental/oversized inputs; it is not a Drive quota claim.

## 11. Module map and public API

| File | Exports (summary) |
|---|---|
| `src/gdrive/types.ts` | Constants (`SNAPSHOT_FORMAT_ID`, `SNAPSHOT_SCHEMA_VERSION`, `SNAPSHOT_INTEGRITY_ALGORITHM`, `DEFAULT_MAX_SNAPSHOT_BYTES`); `SnapshotPayload`, `CloudSnapshotEnvelope`, `SnapshotListEntry`, `SnapshotWarning`, `ValidationIssue`, `ParsedSnapshot`, `BuildSnapshotInput`, `BuiltSnapshot` |
| `src/gdrive/snapshot.ts` | `canonicalJson`, `sha256Hex`, `toIsoUtc`, `toCompactUtc`, `createSnapshotFileName`, `buildCloudSnapshot`, `parseCloudSnapshot` (+ internal strict/lenient record validators, legacy v1 migration) |
| `src/gdrive/conflict.ts` | `normalizeTitle`, `contentHashOfSnippet`, `isDeleted`, `computeRestorePreview`, `applyResolutions`, `countQuarantined`, preview/plan/choice types |

All functions are pure (no IndexedDB, `chrome.*`, network, DOM, or caller-object mutation). Nothing in `src/db.ts`, the UI, the manifest, or the local export/import path changed.

## 12. Tests executed (actual results, 2026-10-18)

Runner: `node:test` via the **existing** `tsx` devDependency (no dependency added).

| Command | Result | Evidence |
|---|---|---|
| `npx.cmd tsx tests/gdrive-contract.test.ts` | **27/27 pass, 0 fail** (build/deterministic-ID/UTC naming; roundtrip incl. tombstones; malformed JSON; non-object; missing envelope fields; future version; wrong payload.version; digest mismatch; size limit; unrecognized; quarantine; duplicate-id; unknown fields; legacy v1 migration + lenient coercions + explicit quarantine; hash volatile-exclusion; title-trim/verbatim; deletion-state exclusion; preview classification; duplicate-names + missing categories; quarantined-count; full-fidelity all-unchanged roundtrip; keep-local default; take-incoming/keep-both re-id; deletion-state resolution; preferences opt-in; plan categories/fallbacks) | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors | `[COMMAND-VERIFIED]` |

Honest limitations: these tests verify the **contract code only**. They do **not** verify real Google OAuth, Drive API behavior, or the extension runtime in Chrome (`[UNKNOWN]` until GD-02+ with a real OAuth client and test Drive account — mocks will not count there, per GD-08's gate).

## 13. Traceability and open items

| Decision (final, 2026-10-18) | Where realized |
|---|---|
| D1 universal multi-user identity | §2; OAuth mechanics deferred to GD-02 |
| D3 `drive.appdata` | §2; API use deferred to GD-02/03 |
| D4 v2 schema, v1 compatibility, UTC naming, trash included, local export unchanged | §3, §5, §7 of audit; envelope + migration code |
| D5 id + content hash, no silent overwrite, conflict preview, no newest-wins | §7, §8 |
| D6 v1 = explicit upload/restore only | §9 |

Open items assigned later: snapshot listing/download UI (GD-04), trash-inclusive local read + pre-restore safety snapshot + transaction (restore side, GD-05, D7 — note: the *gather* helper `getAllSnippetsIncludingTrash` was delivered by GD-03, see §14), OAuth/Drive client (GD-02, delivered 2026-10-18), fake-footer removal (GD-07), E2E with real account (GD-08).

---

## 14. GD-03 addendum — gathering and upload (2026-10-18)

Records GD-03-specific decisions that extend (never contradict) the contract above. Drive API facts verified live against `developers.google.com` (files.create REST reference, upload guide, files resource, search guide) on 2026-10-18.

**Gathering**
- Local reads for snapshots use a dedicated trash-inclusive helper (`getAllSnippetsIncludingTrash` in `src/db.ts`): a plain `getAll()` on the snippets store — **no purge side effect** (unlike `getAllSnippets`/`getTrashedSnippets`, which call `purgeExpiredTrash()`), no filtering, read-only transaction. Local `exportAllData()`/`importData()` behavior is untouched.
- **Deterministic gather order**: snippets and categories are sorted by `id` (ascending) before building, so two gathers of unchanged data produce byte-identical payloads ⇒ identical digest ⇒ identical `backupId`. Display ordering (`sortSnippets`) is irrelevant to backups.
- `appVersion` comes from the manifest (`chrome.runtime.getManifest().version`); `createdAtMs` is injected by the caller (deterministic, testable). Optional user-supplied `displayName` (spec: "Enter a name"); default = UTC file name without extension.

**Upload**
- Endpoint `POST https://www.googleapis.com/upload/drive/v3/files` with `uploadType=multipart` (metadata + media, single request) — **officially limited to files ≤ 5 MB**. Snapshots larger than 5 MB use `uploadType=resumable` (metadata init request with `X-Upload-Content-Type`/`-Length` headers → `Location` session URI → PUT data). Selection is by UTF-8 byte length of the serialized envelope.
- File metadata: `name` = UTC snapshot filename, `parents: ["appDataFolder"]` (per appdata guide), plus `appProperties: { backupId, schemaVersion, createdAt, appVersion }` — app-private, authenticated-read key/value metadata (verified), making `backupId` queryable at list time (`appProperties has { key='backupId' and value='…' }`, verified query syntax) without downloading content.
- Media MIME type: `application/json`. Response must include the Drive file `id`; success is declared **only** after Drive confirms (spec requirement). `driveFileId` is returned to the caller and never written into the snapshot.
- **No overwrite, ever**: uploads are always additive; Drive-side trashing/deleting is not part of GD-03 (appDataFolder files cannot be trashed; deletion is permanent). Two backups with identical content+second collide on `backupId`/filename by design — duplicates are allowed and deduplicated (or surfaced) by GD-04 listing; nothing is silently replaced.
- **Ambiguous failures** (network error / timeout where the request may have reached Drive): the orchestrator reconciles by `backupId` (files.list in `appDataFolder`) before any retry — exactly 1 match ⇒ treat as created (`reconciled`); 0 matches ⇒ typed failure, retry is the user's explicit choice; ≥ 2 matches ⇒ typed ambiguous failure (never auto-delete). **401** handling: clear the cached token (`removeCachedAuthToken`), silently re-authorize once, retry once; only then report `unauthorized`. **403** ⇒ typed forbidden (scope/appDataFolder violation); other HTTP errors ⇒ typed failure with status.
- **No retention policy is invented** (spec): snapshots persist until user deletion, subject to Drive limits. No automatic/background anything (D6) — `createCloudBackup` runs only when explicitly invoked.

---

## 15. GD-04 addendum — browse, download, delete (2026-10-18)

Extends §14 without contradicting it. New Drive facts verified live 2026-10-18: `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` returns file content in the response body; `DELETE https://www.googleapis.com/drive/v3/files/{fileId}` **permanently deletes without moving to trash** (empty body) — consistent with the appDataFolder no-trash constraint (§13); `files.list` pagination via `pageToken`/`nextPageToken`.

**Browsing (metadata-first)**
- Listing uses `files.list` in `appDataFolder` only. Download of file contents happens **only** on explicit user request (spec). Pagination follows `nextPageToken` to completion with a safety cap of 20 pages (`pageSize=100` ⇒ 2000-entry ceiling documented; the cap prevents runaway loops on API anomalies, not a product limit).
- `appProperties` now also carries `displayName` (GD-04 enhancement; GD-03 files without it fall back to the file name without extension). An entry lacking the `backupId` appProperty is still listed but marked not identifiable (`backupId: null`).
- **Sort order: newest first**, keyed by envelope `createdAt` (falling back to Drive `createdTime`), ties broken by `driveFileId` ascending for stability. Duplicate display names are distinguished by `driveFileId` + `backupId` + timestamp + size; nothing is merged or overwritten.
- Compatibility status from metadata alone is provisional: `schemaVersion === 2` ⇒ shown as v2; anything else ⇒ `unknown` until the file is downloaded and validated.

**Download / export**
- `GET …/{fileId}?alt=media` with the GD-02 token; content is validated with `parseCloudSnapshot` (GD-01) **before** being presented as a usable snapshot. An invalid/unsupported/legacy file can still be saved raw (spec: incompatible schema blocks restore — GD-05 — but permits safe raw download); the UI states the validation outcome honestly and never labels invalid content as a usable snapshot. Saving reuses the existing blob+anchor export mechanism (no `chrome.downloads` permission added); tokens are never included in saved content.

**Delete**
- `files.delete` is **permanent and cloud-only** (no trash for appDataFolder). Requires explicit in-UI confirmation that names the snapshot being deleted; cancel = no request. Deleting a cloud snapshot never touches local snippets/categories/preferences (the delete path performs no local reads or writes). A `404` is surfaced as `not-found` (already gone); failures are typed and never silently treated as success.

**Failure taxonomy (new operations)**: `404 → not-found`, `429 → rate-limited`, plus the GD-03 mapping (401 unauthorized with clear-cache + silent re-auth + retry-once, 403 forbidden, network-error, other HTTP error). List/download/delete share the GD-03 auth foundation and the GD-01 parse guard.

---

## 16. GD-05 addendum — restore preview & conflict resolution (2026-10-18)

Implements §8 and the §100-line mandate (single transaction after a mandatory pre-restore safety snapshot, D7). Preview input is trash-inclusive; restore is executed only over a snapshot that already passed the §5/§6 parse contract (the GD-04 download path). `src/gdrive/restore.ts` is the orchestration module; `src/db.ts` gained two functions; the local export/import path is untouched.

**Flow ordering (fixed, tested)**: download+validate (GD-04, no mutation) → safety checkpoint capture + verification → read-only preview → explicit user resolution (Merge) or confirmation (Replace) → ONE atomic transaction → post-write count verification → success reported only after verification. Cancel at any point writes nothing.

**Safety checkpoint (D7, hard gate)**: `buildRestoreCheckpoint` reads the full local state trash-INCLUSIVE (`readAllLocalStateForRestore`) and verifies it by re-parsing the serialized v1 export through `parseCloudSnapshot` (v1 migrates to ok; integrity/size guards run). Any reader or validation failure ⇒ `status:'failed'` ⇒ `executeRestore` returns `checkpoint-unavailable` with **zero writes, for both Merge and Replace**. The checkpoint is a v1 `BackupData` held in memory for the flow's lifetime (available after a failed write for recovery guidance).

**Merge**: plan via GD-01 `applyResolutions` (`keep-local` default; `take-incoming` writes the incoming record verbatim — tombstone restoration included; `keep-both` re-ids with the deterministic factory and records `reIdApplied`). Preferences are written only on explicit opt-in AND only when the snapshot carries them. Expectation math (computed BEFORE writes): `expectedSnippets = checkpoint.snippetCount + toAdd.length + keepBothCount` (take-incoming overwrites and keep-local skips change no counts).

**Replace**: `buildReplacePlan` copies the entire validated snapshot (deterministic; conflict choices ignored). Semantics follow the existing local `importData` contract exactly: snippets + categories cleared and rewritten in the same transaction, **preferences never cleared** (write only with opt-in), the `default` category always survives, cloud records written **verbatim** (no version bumps or timestamp rewrites — unlike local imports). Missing-category references inside the snapshot map to `default` at write time (`missingCategoryFallbackIds`). Expected categories = plan size, +1 if the snapshot lacks a category with id `default`.

**Execution**: `db.applyRestoreWritePlan` performs one `readwrite` transaction over `[STORE_CATEGORIES, STORE_SNIPPETS, STORE_PREFS]` (mirrors `importData`/`resetToDefaultData`); any error or abort rejects the whole transaction — IndexedDB rolls everything back, so no silent partial restore is possible. `executeRestore` then re-reads live counts and requires exact equality with the precomputed expectations before reporting success; mismatch ⇒ `verification-failed` (checkpoint remains available; never reported as success).

**UI contract** (`SettingsView.tsx`): preview panel is explicitly labeled preview-only; per-conflict choices render as Keep local / Use backup / Keep both; same-name/different-id pairs are informational only; quarantined and missing-category counts are surfaced; Replace requires an explicit "rewrites my entire library" checkbox before Apply enables; failures are typed and keep the flow open (Cancel = pure close). Cloud content is rendered as text only (§10).

---

## 17. GD-06 addendum — explicit sync feasibility verdict: BLOCKED (2026-10-18)

GD-06 evaluated against this contract and the handoff spec's feasibility gate. **Outcome: safe synchronization is NOT supported by the current data model — blocked, no sync UI shipped.** This verdict extends §9 (D6) with GD-06-specific source evidence; it does not reopen any settled decision.

### Feasibility analysis (source-evidenced)

| Requirement (GD-06 spec) | Verdict | Evidence |
|---|---|---|
| Stable record identity | ✅ supported | `Snippet.id` is stable and is the GD-01 identity; content hash over `{title, content, categoryId, isFavorite}` excludes volatile fields (`src/gdrive/conflict.ts`). |
| Edit detection | ✅ supported | The deterministic content hash distinguishes changed vs unchanged same-id records (GD-01 tests). |
| Deletion detection across devices | ❌ **not supported** | Tombstones are permanently purged after the 72-hour retention window (`db.ts:545-546` `TRASH_RETENTION_MS`, `purgeExpiredTrash` `db.ts:551-577` — hard `store.delete`; ADR-007). After purge, "record absent from the other state" is ambiguous: remotely-deleted-past-purge vs locally-created-after-snapshot vs locally-deleted-past-purge. §8 forbids treating a missing record as a deletion; the contract provides no basis to conclude deletion. Delete propagation would silently resurrect or wrongly delete records. |
| Change ordering / winner selection | ❌ **not supported** | `updatedAt`/`version` bump WITHOUT content edits — favorite toggle `db.ts:433-434`, usage copy (`recordUsage`, `db.ts:442`), import (`db.ts:954` region) — so timestamps cannot order changes (ADR-011 evidence). The GD-06 spec itself forbids clock-based winners ("No conflict winner based only on untrusted device clocks"). |
| Sync state / last-success metadata | ❌ does not exist | No change-log store, no sync metadata anywhere in IndexedDB (schema: snippets/categories/preferences only). The only "Last synced" text in the UI is **fake** (`MainPopup.tsx:652` renders a static string; its removal is scheduled GD-07 per §9). |
| Rollback / recovery | ✅ supported | GD-05 verified-checkpoint gate + single-transaction executor (`restore.ts`, `db.ts applyRestoreWritePlan`) — the one column already green. |

**Formal dependency note**: the GD-06 spec lists "GD-01 verified; GD-02 verified; GD-05 verified" as prerequisites; all three stand at `implemented-unverified` (no real Chrome/Drive runtime evidence yet — GD-02 user-owned Cloud configuration gate). GD-06's own dependency clause is therefore unmet, independently of the data-model verdict.

**Why the safe primitives do not add up to sync**: the existing safe operations — upload (GD-03, additive + backupId reconciliation), download/validate (GD-04), preview/merge/restore (GD-05) — are exactly the v1 scope D6 fixed. Repackaging "upload a snapshot" or "merge from the newest snapshot" behind a *Sync* label would be snapshot upload disguised as sync (explicitly forbidden by the GD-06 spec and this contract). No new operation was invented.

### What un-blocking requires (PROPOSED — awaiting user approval; nothing implemented)

1. **App-level change-log store** (new IndexedDB store, e.g. `change_log`: record id + change kind {created/updated/deleted} + content hash + logical timestamp, written in the SAME transactions as snippet mutations). This is the new architectural component ADR-011 requires to be proposed and approved before any sync work. It unambiguously detects edits AND deletions older than the 72-hour tombstone window.
2. **Deletion semantics decision**: whether change-log-backed tombstones are authoritative forever (full delete propagation) or bounded; requires ADR-007 interplay analysis (retention vs sync tombstones).
3. **Sync direction + source-of-truth decision**: one-way mirror (simplest, uses existing GD-05 protections) vs union-merge both ways with per-record conflict UI (GD-05 vocabulary reused).
4. **Last-success metadata + idempotency keys** stored locally (never in snapshots — §"do not conflate backup history and sync state").
5. **Verified GD-01/02/05 baseline**: the GD-02 user-owned Cloud configuration and GD-08 live E2E, so sync behavior could actually be observed, not just typed.

Until items 1–5 are approved and delivered, the truthful sync status is: **local mode + explicit backups + explicit preview/restore — no synchronization**. Any future implementation must route incoming mutations through GD-05 (checkpoint → preview → single transaction) and must never add background/automatic behavior (D6).
