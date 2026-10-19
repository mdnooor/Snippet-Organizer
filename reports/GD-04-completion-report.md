# GD-04 Completion Report — Browse, Download, and Manage Backups

- **Task ID / Title**: GD-04 — Browse, download, and manage cloud backups
- **Date**: 2026-10-18 (Asia/Dhaka)
- **Status**: `implemented-unverified` — code, contract, and offline tests complete; real Drive browse/download/delete and the new Settings UI runtime are NOT exercised (blocked on the GD-02 user-owned Google Cloud configuration; the repo has no React test harness; end-to-end gate is GD-08)

---

## 1. Summary

GD-04 delivers the Settings → Backup & Data "Google Drive Snapshots" experience on top of the GD-01 contract, GD-02 auth, and GD-03 client: **browse** cloud snapshots with metadata only (paginated `files.list` in `appDataFolder`, hydrated from `appProperties` + Drive metadata, sorted newest-first with a deterministic tie-break, duplicates distinguished by file id + backup id), **download** a selected snapshot — content validated with the GD-01 parser *before* being presented as usable, with a safe raw save for invalid/unsupported files — and **delete** one snapshot after an in-row confirmation that names it, using the officially permanent `files.delete` (appDataFolder has no trash; local data is never touched). Every failure mode the spec lists has a typed path: empty list, loading, auth not-configured/denied/expired (401 → clear cache + silent re-auth + retry once), forbidden, rate-limited, offline, malformed/unsupported snapshot content, and missing (404) files. Cloud operations remain strictly explicit user actions (D6).

## 2. Every file created/modified and why

**New**
- `src/gdrive/snapshotStore.ts` — `createDriveService({authorize, removeCachedAuthToken?, fetchImpl?})`: `browse` (metadata-first, hydration, newest-first sort, 20-page × 100 cap), `download` (raw bytes + `ParsedSnapshot` validation + `.json`-normalized save name), `remove` (typed permanent delete). Shared 401 retry-once; default `removeCachedAuthToken` adapter keeps chrome access out of the component.
- `tests/gdrive-browse.test.ts` — 19 tests: pagination (pageToken flow, empty list, custom + default caps), hydration (full appProperties, foreign files, displayName fallback, v2/unknown compatibility), duplicate-name distinctness + deterministic ordering, metadata-first guarantee (zero `alt=media` calls), auth short-circuits (zero network), 401 retry-once (browse and delete), persistent 401, 403/429/500 mapping, network-error, download URL/method/auth + raw fidelity + valid/invalid/unsupported-version gating + name normalization, delete method/URL/204 + 404/403/network-error, single-request delete (no local reads/writes).
- `reports/GD-04-completion-report.md` — this report.

**Modified**
- `src/gdrive/driveClient.ts` — `listSnapshotFiles` pagination (`pageToken` arg / `nextPageToken` result, `pageSize=100`); NEW `downloadSnapshotFile` (`GET /drive/v3/files/{id}?alt=media`) and `deleteFile` (`DELETE /drive/v3/files/{id}`); taxonomy gains `not-found` (404) and `rate-limited` (429) for the new operations. Upload path untouched.
- `src/gdrive/backup.ts` — upload `appProperties` now also carries `displayName` (one property; listable without downloading; §15 documents the fallback for pre-GD-04 files).
- `src/components/SettingsView.tsx` — the Drive Snapshots card (Browse/Refresh, states, rows with name/local-time/size/schema badge/backupId, Save, named-confirm Delete, permanent-deletion + local-safety copy), state + handlers (`handleDriveRefresh/Download/Delete`), `formatDriveTimestamp`/`formatDriveSize` helpers, `Cloud`/`RefreshCw` icons, `createDriveService`/`createAuthController` imports. Inserted between the existing Import and Reset cards; no existing handler or card modified.
- `tests/gdrive-backup.test.ts` — the list-query test now reads params via `new URL(...).searchParams` (encoding-agnostic) after the client switched to `URLSearchParams`; the asserted contract string is unchanged.
- `docs/google-drive-integration/data-contract.md` — §15 GD-04 addendum (browse/download/delete rules, sort order, caps, validation gate, permanence).
- `docs/tasks/BACKLOG.md`, handoff `BACKLOG.md`, `tasks/active.md`, `tasks/completed.md`, `reports/DOCUMENTATION_CHANGELOG.md` — tracker updates per convention.

## 3. Final decisions and ADRs followed (none new)

- **D1/D3** — per-user own-account OAuth onto `drive.appdata` only; the service never requests other scopes.
- **D4/D5** — v2 contract respected: hydration/validation use `schemaVersion`/`backupId`; malformed content is never presented as valid; v1/v-unknown files remain downloadable raw but are labeled unverified (restore of them stays blocked until GD-05 handles it).
- **D6** — all three operations are explicit button actions; no background refresh, no timers.
- **"Never silently overwrite / conflicts visible"** — listing merges nothing; duplicates stay distinct rows.
- **Spec-scope note**: deletion IS in GD-04 (spec §Goal/§Behavior/§Tests/Acceptance explicitly require it with named confirmation and cloud-only effect) — implemented exactly that way; no retention/auto-purge logic added.
- **ADR-002 (480×600 lock), ADR-009 (Red Glass-Claymorphism lock)** — card reuses existing `nm-*` tokens, text sizes, spinner, and confirmation-swap patterns from the same view; no design values changed. No new ADR required.

## 4. Exact commands run and actual results

| Command | Actual result |
|---|---|
| `npm.cmd run lint` (`tsc --noEmit`, includes SettingsView.tsx) | exit 0, 0 errors `[COMMAND-VERIFIED]` (two intermediate runs surfaced discriminated-union/narrowing type errors; each fixed, re-run to green) |
| `npx.cmd tsx tests/gdrive-browse.test.ts` | 19 pass, 0 fail, exit 0 `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-backup.test.ts` | 22 pass, 0 fail, exit 0 (regression) `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-contract.test.ts` | 27 pass, 0 fail, exit 0 (regression) `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-auth.test.ts` | 21 pass, 0 fail, exit 0 (regression) `[COMMAND-VERIFIED]` |
| Live doc verification (Playwright): `files/get` + `files/delete` REST references | fetched 2026-10-18; conclusions in §15 of the data contract `[SOURCE-VERIFIED]` |

## 5. Verified vs inferred vs unknown

**Verified with evidence**
- `GET https://www.googleapis.com/drive/v3/files/{fileId}` + `alt=media` ⇒ content in response body; `DELETE https://www.googleapis.com/drive/v3/files/{fileId}` ⇒ **permanent, no trash**; `files.list` pagination semantics (`pageToken`/`nextPageToken`) already verified in GD-03/GD-04 page fetches. `[SOURCE-VERIFIED]`
- 89 offline assertions green (19+22+27+21) + clean lint covering: request shapes, pagination, hydration, sorting/duplicates, validation gating, 401 retry-once, 404/429/403/500 mapping, and cloud-delete isolation. `[COMMAND-VERIFIED]`
- Spec alignment: scope taken from `GD-04-browse-download-and-manage-backups.spec.md` (read in full; deletion requirement honored). `[SOURCE-VERIFIED]`

**Inferred**
- `URLSearchParams`-encoded query strings (`+` for spaces) are accepted by the Drive REST endpoint the same way as `%20` (both are standard query encodings; Google client libraries use form encoding). `[INFERRED]`
- UI visual fidelity at 480×600 from reusing in-view patterns (card/token/spinner/confirmation conventions) — layout plausibility, not proof. `[INFERRED]`
- `content-length` header used for size on download when present. `[INFERRED]` (harmless; `sizeBytes` falls back to `null`)

**Unknown / not verified**
- Any real Drive round-trip (browse/download/delete with live OAuth) — requires the GD-02 user-owned Cloud configuration; GD-08 gate. `[UNKNOWN]`
- The React card's runtime behavior in Chrome (popup + floating window), including scroll within 480×600 and toast integration — no React test harness exists in this repo; the component is type-checked only. `[UNKNOWN]`
- Behavior against files uploaded by pre-GD-03 versions of the app (no `appProperties`) in a real account — hydration handles it offline; live shapes `[UNKNOWN]`.

## 6. Blockers, risks, configuration, deferred items

- **Blocker (carried from GD-02)**: live verification of anything Drive-side needs the user-owned Google Cloud configuration (stable extension ID `key`, OAuth client ID "Chrome Extension", consent/Audience, Drive API enabled — `oauth-contract.md` §6). Nothing fabricated.
- **Risks**: (a) deletion is permanent by Drive design — mitigated exactly as the spec defines: named confirmation, cancel default, typed `not-found` after the fact; no undo is possible and none is promised. (b) Pagination cap (20×100=2000) is an anomaly guard; a library exceeding it silently shows the first 2000 — documented in §15; GD-05+ can revisit if ever relevant. (c) `displayName` appProperty only exists on newly created backups; older rows show the file-name fallback. (d) UI runtime untested (no harness) — first manual pass should check row overflow/truncation.
- **Configuration**: none beyond GD-02's; no new manifest permissions (download/export reuses the existing blob+anchor mechanism; `chrome.downloads` deliberately not added).
- **Deferred by scope**: GD-05 restore transaction/preview/conflict resolution (the downloaded-but-invalid gate explicitly defers "what then?" to GD-05); GD-06 sync; GD-07 footer/settings cleanup; GD-08 live E2E.

## 7. Boundary confirmation

Implemented only: browse (list + metadata hydration), download/export (validated + raw fallback), and spec-mandated delete with named confirmation. NOT implemented: GD-05 restore transaction/preview/conflict UI, GD-06 synchronization, GD-07 footer cleanup or unrelated settings work, GD-08 live testing. Local export/import behavior unchanged (`handleExport` untouched). No background sync. No invented credentials or developer accounts. No new dependencies.

## 8. Recommended next task (not started)

**GD-05 — Restore preview/conflict resolution** (handoff spec under `snippet-organizer-google-drive-handoff/tasks/`): consumes the validated `ParsedSnapshot` from GD-04's download path plus the GD-01 conflict vocabulary (`computeRestorePreview`, `applyResolutions`). Per the master prompt, GD-05 has **not** been started and awaits explicit user go-ahead.
