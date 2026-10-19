# Completed Tasks

## GD-00 — Project audit and decisions

- Status: `implemented-unverified` (delivered 2026-10-18; becomes reviewable/verified when the user accepts the audit and rules on the decision gates)
- Started: 2026-10-18
- Completed: 2026-10-18
- Dependencies: —
- Decision references: proposals D1–D10 with open gates in `docs/google-drive-integration/audit.md` §10; no ADRs written (`docs/project-knowledge/DECISIONS.md` is the approved-ADR registry and was intentionally not modified)

### Confirmed facts (full detail in `docs/google-drive-integration/audit.md`)
- Shipping manifest is `public/manifest.json` (permissions: `storage` only; icons; `toggle-organizer` Ctrl+Shift+X). Root `manifest.json` / `service-worker.js` are stale divergent copies (SHA-256 differ from `public/`) still described as "active" in `docs/project-knowledge/README.md` §3.1 and quoted as the manifest in `INTEGRATIONS.md`. All GD tasks must edit the `public/` copies only.
- IndexedDB `snippet-organizer` v1: stores `snippets`/`categories`/`preferences`, all keyPath `id` (ARCHITECTURE.md:113 wrongly says `key`). Snippet has `deletedAt` trash tombstone (72 h) and a `version` that also bumps on usage (copy) and import — not a safe sync change marker by itself.
- Local backup = `BackupData v1`; export excludes trashed snippets; import validates only array presence and silently overwrites same-ID records in merge mode (default); replace/reset are single-transaction (atomic) with no pre-restore safety snapshot.
- No automated test framework (lint `tsc --noEmit` + manual scenario suites only). No network calls, no host permissions, no content scripts today. Footer shows a hardcoded fake "Synced / Last synced: 2 minutes ago" status (`MainPopup.tsx:651-652`) — flagged for GD-07 removal.
- Stale 712 × 512 texts remain in root `README.md:3` / root `PROJECT_BRIEF.md:11,17,36`, `FEATURES.md:45`, `SCREEN_REGISTRY.md:27,36`, `DESIGN_SYSTEM.md:159`, `DECISIONS.md:33` (ADR-002 heading); source truth is 480×600 viewport / 430×550 popup.

### Open questions / blockers
- Decision gates D1–D8 (audit §10) require explicit user rulings before GD-01+: OAuth flow, extension ID/redirect, Drive scope & app-owned location (drive.appdata vs drive.file), snapshot schema/migration/trash inclusion, identity & conflict vocabulary, sync semantics (defer/block if unsafe), atomic restore & recovery design, test framework dependencies.

### Files inspected
- Docs: `AGENTS.md`, root `README.md`, root `PROJECT_BRIEF.md`, `docs/project-knowledge/{README,PROJECT_BRIEF,DECISIONS,ARCHITECTURE,FEATURES,INTEGRATIONS}.md`, `docs/project-knowledge/code-graph/metadata.md`, `docs/tasks/BACKLOG.md`, `reports/DOCUMENTATION_CHANGELOG.md` (head), `docs/design/DESIGN_SYSTEM.md` + `docs/design/SCREEN_REGISTRY.md` (targeted greps), handoff package (README, HARNESS_MASTER_PROMPT.md, BACKLOG.md, PACKAGE-MANIFEST.json, `tasks/active.md`, `tasks/completed.md`, `templates/TASK-RECORD.md`, `tasks/GD-00-project-audit-and-decisions.spec.md`)
- Build/config: `package.json`, `vite.config.ts`, `tsconfig.json`, `metadata.json`, `.gitignore`, `scripts/pack-extension.js`
- Extension surface: root `manifest.json`, `public/manifest.json`, root `service-worker.js`, `public/service-worker.js` (active), `popup.html`, `settings.html`, `src/settings.tsx`
- Data/backup code: `src/db.ts` (schema seeds, CRUD surface, `exportAllData`, `importData`, `resetToDefaultData`, error-handling greps), `src/types.ts`, `src/components/SettingsView.tsx` (Backup & Data tab, handlers, toast/loading/confirm conventions), `src/components/MainPopup.tsx` (viewport line + footer sync-status lines), `src/shortcutUtils.ts` (import graph only)

### Files changed (documentation only — no application source)
- NEW `docs/google-drive-integration/audit.md` (GD-00 deliverable)
- `docs/tasks/BACKLOG.md` (GD-00 row + active-status note)
- `snippet-organizer-google-drive-handoff/BACKLOG.md` (GD-00 status + records note)
- `snippet-organizer-google-drive-handoff/tasks/active.md` (reset)
- `snippet-organizer-google-drive-handoff/tasks/completed.md` (this record)
- `reports/DOCUMENTATION_CHANGELOG.md` (GD-00 entry)

### Implementation summary
Audit/reconciliation only, per spec: 8 audit areas evidenced with file:line citations; docs-vs-source mismatch register M1–M12; proposed decisions and gates D1–D10; proposed module map for the Drive feature (`src/gdrive/`, Settings → Backup & Data card, `identity` permission added to `public/manifest.json` at GD-02). No OAuth, API, UI, or backup code written.

### Acceptance criteria evidence (per spec checklist)
- [x] Repository tree, entry points, package manager, build/lint/test commands documented — audit §2/§8
- [x] Manifest/MV3/service worker/settings route/extension ID/CSP/permissions documented with the two-copies discrepancy — audit §3
- [x] Settings → Backup & Data surface + reusable controls/dialogs/toasts/loading states documented — audit §4
- [x] Entities, stable IDs, relationships, timestamps, categories, favorites, Trash, transaction/rollback support documented — audit §5
- [x] Actual backup format/behavior/validation/merge/replace/duplicates/error paths documented — audit §6
- [x] Security/secret posture documented — audit §7
- [x] Test framework/fixtures/manual procedure gap documented — audit §8
- [x] Canonical-docs-vs-source mismatches recorded with exact locations — audit §9 (M1–M12)
- [x] All 10 decision areas proposed with gates — audit §10 (D1–D10)
- [x] Proposed module map — audit §11
- [x] Unknowns/blockers listed — audit §12
- [x] No application source files changed — changed-file list above
- [x] No claims about uninspected files — every claim carries a file:line citation or an explicit `[UNKNOWN]`

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors | `[COMMAND-VERIFIED]` |
| SHA-256 root vs `public/` `manifest.json` | digests differ (`550351B2…` / `5A1DD0FB…`) | `[COMMAND-VERIFIED]` |
| SHA-256 root vs `public/` `service-worker.js` | digests differ; 10,203 B vs 17,836 B | `[COMMAND-VERIFIED]` |
| grep `src/` network primitives (`fetch(`/XHR/WS/dynamic import) | 0 matches | `[SOURCE-VERIFIED]` |
| grep `src/` test files; grep unused deps; grep `docs/tasks/BACKLOG.md` for `GD-` | 0 / 0 imports / 0 (before this task) | `[SOURCE-VERIFIED]` |
| Extension runtime in real Chrome | not verifiable in this environment | `[UNKNOWN]` |

### Risks / limitations
- Runtime behavior of the extension (and any future `chrome.identity` flow) is unverified here — no Chrome host.
- Root duplicates (`manifest.json`, `service-worker.js`, stale README/brief) remain in the tree and can mislead future agents until the docs-hygiene follow-up (audit §10 D9) is approved.
- The audit's proposed decisions are proposals; nothing is approved until the user rules on the gates.

### Next task
- GD-01 (Drive domain and data contract) — **not started**; blocked on user review of `docs/google-drive-integration/audit.md` §10 decision gates. Per the master prompt, do not proceed automatically.

---

## GD-01 — Drive domain and data contract

- Status: `implemented-unverified` (delivered 2026-10-18; real Chrome/Drive runtime verification belongs to GD-02+)
- Started: 2026-10-18
- Completed: 2026-10-18
- Dependencies: GD-00 (implemented-unverified); final user decisions D1/D3/D4/D5/D6 received 2026-10-18
- Decision references: ADR-010 + ADR-011 (`docs/project-knowledge/DECISIONS.md`); canonical contract `docs/google-drive-integration/data-contract.md`

### Implementation summary
- Final decisions implemented as pure, dependency-free contract code: `src/gdrive/types.ts` (v2 envelope, `SnapshotListEntry` with `driveFileId`/`sizeBytes` as external metadata, warnings, parse-result taxonomy), `src/gdrive/snapshot.ts` (`buildCloudSnapshot`, canonical-JSON SHA-256 payload integrity, strict parse with future-version rejection, legacy v1 in-memory migration with importer-matching leniency, UTC naming), `src/gdrive/conflict.ts` (content hash over {title(trimmed), content(verbatim), categoryId, isFavorite}, restore preview, full conflict vocabulary, pure resolution write-plan with keep-local default).
- No UI, manifest, packaging, `db.ts`, or local export/import changes; no OAuth, Drive API, tokens, or background-sync code; no new dependencies (tests run via the existing `tsx` devDependency).

### Files changed
- NEW `src/gdrive/types.ts`, `src/gdrive/snapshot.ts`, `src/gdrive/conflict.ts`
- NEW `tests/gdrive-contract.test.ts`
- NEW `docs/google-drive-integration/data-contract.md` (canonical contract spec)
- `docs/project-knowledge/DECISIONS.md` (ADR-010, ADR-011, index rows, snapshot date)
- `docs/tasks/BACKLOG.md` (GD-01 row + §2 active-status note)
- `snippet-organizer-google-drive-handoff/BACKLOG.md`, `tasks/active.md`, `tasks/completed.md` (this record)
- `reports/DOCUMENTATION_CHANGELOG.md` (GD-01 entry)

### Acceptance criteria evidence (per spec checklist)
- [x] Schema documented and grounded in real model — `data-contract.md` §3 (envelope wraps the verified BackupData v1 payload; trash tombstones preserved)
- [x] Validation causes no local mutation — module is pure (no IndexedDB/`chrome.*`/network/DOM; parse/preview return fresh copies)
- [x] Conflict vocabulary explicit and tested — `data-contract.md` §8; every vocabulary class covered by the test suite
- [x] Sync feasibility evidence-backed — `data-contract.md` §9 (volatile `version`/`updatedAt` bumps `db.ts:414-434/:954`, 72 h tombstone purge, no change log); v1 scoped to explicit operations per D6
- [x] Canonical docs/ADR updated without duplicate sources — `data-contract.md` is the single contract spec; `DECISIONS.md` holds decision records pointing at it
- [x] Tests/results recorded honestly — `data-contract.md` §12; contract tests explicitly do NOT verify OAuth, Drive API, or extension runtime

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/gdrive-contract.test.ts` | 27/27 pass, 0 fail | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors | `[COMMAND-VERIFIED]` |
| Real Google OAuth / Drive API / Chrome extension runtime | not exercised (out of GD-01 scope; wired in GD-02/03) | `[UNKNOWN]` |

### Risks / limitations
- Contract code is not yet imported by any entry point (intentional until GD-02/03 wire it) — unexercised in the extension runtime.
- No trash-inclusive local read helper exists yet (`getAllSnippets` filters trash, `db.ts:214`); GD-05 must add one for preview input.
- Google platform facts (chrome.identity contracts, appDataFolder semantics, ID/redirect rules, consent-screen constraints) remain flagged for official-docs verification at GD-02.

### Next task
- GD-02 (Google OAuth and Drive client) — **not started**; requires explicit user go-ahead, the official-docs verification pass, and user-supplied application configuration. Per the master prompt, do not proceed automatically.

---

## GD-02 — Google OAuth and Drive client

- Status: `implemented-unverified` (delivered 2026-10-18; live chrome.identity/Google runtime verification is GD-04+/GD-08)
- Started: 2026-10-18
- Completed: 2026-10-18
- Dependencies: GD-01 (implemented-unverified); user directive to verify official docs and select the least-privilege officially supported mechanism
- Decision references: ADR-012 (`docs/project-knowledge/DECISIONS.md`); canonical OAuth record `docs/google-drive-integration/oauth-contract.md`

### Implementation summary
- **Phase 1 verification (live browser fetches, all `[SOURCE-VERIFIED]`)**: identity API reference (identity permission, `getAuthToken` + oauth2 manifest key, in-memory cache with automatic expiration, interactive semantics, per-call scope override, `clearAllCachedAuthTokens`, `removeCachedAuthToken`, chromiumapp.org redirect belongs to launchWebAuthFlow, UX rule against prompting at launch); manifest `oauth2`/`key` pages (client_id+scopes required; `key` keeps a consistent extension ID); official OAuth tutorial (stable-ID via Developer Dashboard public key; client type "Chrome Extension" with Item ID = extension ID; no client secret); Drive appDataFolder guide (hidden per-app folder, app-scoped access, no share/move/trash — deletions permanent; scope `drive.appdata` **non-sensitive**); Drive scopes page (drive.appdata under "Non-sensitive scopes" — **corrects GD-01's unverified sensitive-scope assumption**); consent-screen config (Branding/Audience/Data Access; External ⇒ test users); OAuth2 token lifecycle (tokens expire; revoking a grant revokes all scopes). Not re-verified: 7-day-testing refresh-token policy (page moved) — `[UNKNOWN]`, irrelevant to getAuthToken design.
- **Decision**: `chrome.identity.getAuthToken` with manifest `oauth2` declaring exactly `https://www.googleapis.com/auth/drive.appdata` (ADR-012). `launchWebAuthFlow` rejected (non-Google oriented; manual lifecycle). No `identity.email`/`getProfileUserInfo` (least privilege).
- **Manifest** (`public/manifest.json`): `permissions: ["storage","identity"]` + `oauth2` block with the officially-documented placeholder client ID and the exact scope (regression test guards scope drift; no `key` fabricated — user-owned).
- **Auth foundation** (`src/gdrive/auth.ts`, pure over injectable `AuthDeps`): `resolveOAuthConfig` (typed problems: missing oauth2 key / missing / placeholder / malformed client ID / scope mismatch / missing identity permission), `createAuthController` (`authorize` interactive/silent, `getToken` → `interaction-required`, `signOut` → `clearAllCachedAuthTokens`, `isConfigured`), `classifyAuthError` (denied / interaction-required / error), auth states for later UI; tokens never persisted, logged, or rendered.

### Files changed
- NEW `src/gdrive/auth.ts`, `tests/gdrive-auth.test.ts`
- NEW `docs/google-drive-integration/oauth-contract.md` (verification record + contract + setup steps §6)
- `public/manifest.json` (identity permission + oauth2 placeholder block — minimal, per official docs)
- `docs/project-knowledge/DECISIONS.md` (ADR-012 + index row)
- `docs/tasks/BACKLOG.md` (GD-02 row + §2 note)
- `snippet-organizer-google-drive-handoff/BACKLOG.md`, `tasks/active.md`, `tasks/completed.md` (this record)
- `reports/DOCUMENTATION_CHANGELOG.md` (GD-02 entry)

### Acceptance criteria evidence (per GD-02 instructions)
- [x] Shipping manifest inspected first; stale copies not used
- [x] Official docs verified with exact URLs + conclusions; verified vs unverified distinguished (§2 of oauth-contract.md)
- [x] Approaches compared; least-privilege officially supported mechanism selected (getAuthToken; comparison table)
- [x] User-owned setup determined precisely (stable ID `key`, OAuth client ID, consent/Audience, Drive API enabled) — nothing fabricated
- [x] Minimal manifest permissions, single non-sensitive scope, flow/token/clearing/error handling and user-facing states defined
- [x] No user questions asked — all decisions derivable from official docs + repo; blockers documented, not worked around

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/gdrive-auth.test.ts` | 21/21 pass, 0 fail | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-contract.test.ts` | 27/27 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors | `[COMMAND-VERIFIED]` |
| Official docs pages (7 URLs) | fetched live, conclusions recorded | `[SOURCE-VERIFIED]` |
| Real chrome.identity / consent screen / Drive calls | not exercised (needs user-owned Cloud config) | `[UNKNOWN]` |

### Risks / limitations
- Placeholder client ID in the shipping manifest is intentional; Chrome load behavior with placeholder `[INFERRED]` (shape-valid), live auth reports `not-configured`.
- Exact Chrome error strings for getAuthToken failures are `[UNKNOWN]`; classifier is case-insensitive/tolerant by design.
- No `key` in manifest until user supplies one: unpacked extension ID remains machine-dependent until pinned.

### Next task
- GD-04 (browse/download/manage backups) — **not started**; requires explicit user go-ahead. Per the master prompt, do not proceed automatically.

## GD-08 — Test Hardening, Documentation & Final Handoff

- **Date closed**: 2026-10-18
- **Status**: `partial` (tracker vocabulary: `implemented-unverified` — all locally executable work done and evidenced; live OAuth/Drive E2E blocked on user-owned setup)
- **Spec**: `snippet-organizer-google-drive-handoff/tasks/GD-08-test-hardening-and-docs-handoff.spec.md` (scope: verification/security/docs only)
- **Verification (all `[COMMAND-VERIFIED]`, this turn)**: `npm.cmd run lint` → exit 0 (×2); `npm.cmd run build` → exit 1 **only** at the pre-existing `python3`-dependent pack step (documented environment limitation); `npx.cmd vite build` → exit 0 (456 ms) + documented Compress-Archive fallback zip (2,283,670 bytes, 17 files); suites 118/118 — restore 28, browse 19, backup 22, contract 27, auth **22** (after hardening).
- **Hardening**: coverage mapped spec-item-by-spec-item against the five suites (already comprehensive: auth states/error classes, 401 retry, ambiguous reconcile, malformed/unsupported payloads, restore checkpoint/confirmation/atomicity, cloud-delete isolation, rate-limit, token-leak assertions); exactly one genuine gap closed — new test pins the auth-controller public surface to `{authorize, getToken, isConfigured, resolveConfig, signOut}` and proves `signOut` performs zero `getAuthToken` calls over a network-free `AuthDeps` seam (disconnect structurally cannot delete cloud files). No duplicates, no harness, no new dependencies (D8).
- **Security review**: least privilege (permissions `["storage","identity"]`; scope exactly `drive.appdata`, drift-guarded by tests); no content scripts; zero `console.*` in `src/gdrive`; tokens never persisted/logged; secrets scan across src/tests/docs/reports → 5 hits, all benign (dummy fixtures, a leak-prevention assertion, prose mentions) — no secrets committed; untrusted Drive data parser-gated before mutation; cloud-only delete; no remote executable code.
- **Phase A (GD-02 config checklist, honest)**: placeholder client ID present by design; **no pinned manifest `key`** → stable extension ID unpinned (user-owned action, never agent-generated); Cloud project/OAuth client/consent/test-users/Drive-API enablement **NOT VERIFIED** (no console access, nothing fabricated).
- **Phase B (live E2E)**: every workflow group (auth / upload / browse-download-delete / restore) recorded `NOT RUN — blocked` with the same root causes; mocks never relabeled as live verification; no `OAUTH VERIFIED`/`DRIVE E2E VERIFIED` claims.
- **Phase D (docs match code)**: ARCHITECTURE.md new §8 (Drive architecture — feature was previously absent, 0 grep matches); PROJECT_BRIEF.md capability #9 + "Drive backup remains pre-production" limitation; FEATURES.md §9 Drive Snapshots feature; oauth-contract.md §9 (evidence-level table + 6-step publisher checklist + known limits). No parallel doc systems; contracts unchanged.
- **Compliance**: D1–D8 respected; ADR-002/009/010/011/012 untouched; no sync/change-log/§17 work (GD-06 stays `blocked`); no retroactive reports; scope otherwise unexpanded.
- **Report**: `reports/GD-08-completion-report.md` (13 sections, read-back verified). Chain GD-00 → GD-08 complete; remaining actions are user-owned (publisher checklist → live E2E → optional §17 ruling).

## GD-07 — Settings UI, Accessibility & Cleanup

- Status: `implemented-unverified` (UI code shipped and lint/regression-green; real-browser rendering, keyboard/screen-reader behavior, and live Drive runtime not exercised)
- Started: 2026-10-18
- Completed: 2026-10-18
- Dependencies: GD-02–GD-06 (GD-06 closed `blocked`; GD-07 honored it — no sync UI)
- Decision references: ADR-002 (480 × 600 lock, untouched), ADR-009 (Red Glass-Claymorphism values/`nm-*` untouched), ADR-011/D6 (snapshot upload only, explicit user actions, no sync), D4 (snapshot payload unchanged), D7 (GD-05 restore gate untouched)

### Files changed
- `src/components/Footer.tsx` — rewritten: the fabricated sync block (cloud icon + "Synced" + "Last synced: 2 minutes ago" defaults and props) deleted; footer is developer attribution only.
- `src/components/MainPopup.tsx` — no longer passes `syncStatus`/`lastSyncedText`; comment updated to state why no sync status may be shown.
- `src/components/SettingsView.tsx` — "Auto-Sync Indicator" toggle removed (it displayed the fake claims); Drive card gains connection row (truthful session-derived status, Connect/Disconnect) and Create-cloud-backup block (GD-03 orchestrator UI: optional name, contents explanation, Create with duplicate-submit guard, typed errors, count toast + refresh); per-row Restore/Delete icon buttons gain `aria-label`s; Settings toast banner gains `role="status" aria-live="polite"` + labeled dismiss; card subtitle/empty-state copy made truthful.
- `src/types.ts` / `src/db.ts` — NOT changed: `autoSyncEnabled` stays in `Preferences` for snapshot/import format compatibility (D4) but drives nothing.

### Verification
- `npm.cmd run lint` (tsc --noEmit) → exit 0 `[COMMAND-VERIFIED]`
- `npx.cmd tsx tests/gdrive-restore.test.ts` → 28 pass / 0 fail
- `npx.cmd tsx tests/gdrive-browse.test.ts` → 19 pass / 0 fail
- `npx.cmd tsx tests/gdrive-backup.test.ts` → 22 pass / 0 fail
- `npx.cmd tsx tests/gdrive-contract.test.ts` → 27 pass / 0 fail
- `npx.cmd tsx tests/gdrive-auth.test.ts` → 21 pass / 0 fail
- No new test file: all GD-07 changes are React component code and this repo has no React/browser harness (spec acceptance allows "accessibility/regression tests pass **or gaps documented**" — gaps documented here and in the report).

### Known risks / unverified
- Real popup rendering, layout within 480 × 600, keyboard navigation, focus management, and screen-reader behavior unverified `[UNKNOWN]`.
- Connect/Disconnect/Create run real `chrome.identity`/Drive code that has never executed against live Google services (GD-02 user-owned Cloud config gate; GD-08 E2E).
- `autoSyncEnabled` remains a dead stored field (intentional; cleanup would touch snapshot compat).

### Next task
- GD-08 (test hardening/docs/handoff) — **not started**; requires explicit user go-ahead. Per the master prompt, do not proceed automatically.

## GD-06 — Explicit sync and sync conflicts (BLOCKED)

- Status: **`blocked`** (evaluated and closed 2026-10-18; safe sync unsupported by the current data model — no sync implementation, no sync UI, zero source changes)
- Started: 2026-10-18
- Completed: 2026-10-18 (evaluation closure)
- Dependencies: spec requires GD-01/02/05 `verified` — all three are `implemented-unverified` (formal dependency unmet, documented)
- Decision references: D6/ADR-011 (v1 scope = upload/browse/download/preview/restore only; delta-sync requires an approved app-level change-log store); handoff gate "if safe sync is unsupported, block/defer; do not ship fake sync"; verdict recorded as contract addendum **§17**; report `reports/GD-06-completion-report.md`

### Feasibility verdict (source-evidenced, full detail in §17)
- **Edit detection: supported** — stable `id` + GD-01 deterministic content hash (volatile fields excluded).
- **Cross-device deletion detection: NOT supported** — tombstones permanently purged after 72 h (`db.ts:545-546, 551-577` `purgeExpiredTrash`, ADR-007); a record missing from the other state is ambiguous (remotely deleted past purge / created after the snapshot / locally deleted past purge); contract §8 forbids missing⇒deletion. Delete propagation would resurrect or wrongly delete records.
- **Change ordering: NOT supported** — `updatedAt`/`version` bump without edits (`db.ts:433-434` favorite toggle, `recordUsage` copy); spec forbids clock-based winners.
- **Sync state: does not exist** — no change log, no sync metadata; the visible "Last synced: 2 minutes ago" footer is fake (`MainPopup.tsx:652`; removal scheduled GD-07 per contract §9).
- **Rollback/recovery: supported** — GD-05 verified checkpoint + single-transaction executor (the one green column).
- **Why no code**: the safe primitives (additive upload, validated download, checkpointed merge/restore) are already shipped v1 scope; repackaging them behind a "Sync" label = snapshot upload disguised as sync (spec-forbidden; acceptance requires "UI calls it sync only if real sync exists").

### Files changed (documentation only — zero source changes)
- `docs/google-drive-integration/data-contract.md` (§17 addendum: verdict + PROPOSED un-blocking requirements, awaiting user approval)
- `docs/tasks/BACKLOG.md` (GD-06 row + §2 note); handoff `BACKLOG.md` (GD-06 → `blocked` + Records entry), `tasks/active.md`, `tasks/completed.md` (this record)
- `reports/DOCUMENTATION_CHANGELOG.md` (GD-06 entry)
- NEW `reports/GD-06-completion-report.md`
- No test file added — per master prompt §7, tests cover implemented behavior only; nothing was implemented.

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors (zero-diff tree) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-restore.test.ts` | 28/28 pass (regression, zero-diff) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-browse.test.ts` | 19/19 pass (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-backup.test.ts` | 22/22 pass (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-contract.test.ts` | 27/27 pass (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-auth.test.ts` | 21/21 pass (regression) | `[COMMAND-VERIFIED]` |
| Source evidence reads (db.ts purge/usage-bump, gather/backup/snapshotStore surfaces, MainPopup fake footer) | performed before the verdict | `[SOURCE-VERIFIED]` |
| Real Chrome/Drive sync behavior | does not exist to verify (blocked) | `[UNKNOWN]`/N-A |

### Risks / limitations
- The fake footer status remains visible until GD-07 (pre-existing, out of GD-06 scope; contract §9 schedules its removal).
- Without sync, multi-device users converge their state via explicit GD-03 upload + GD-05 preview/restore — safe but manual; this limitation is documented, not hidden.
- The §17 un-blocking proposal requires a schema migration (change-log store) and explicit user approval before any implementation begins.

### Next task
- GD-07 (Settings UI/accessibility) — **not started**; requires explicit user go-ahead. Alternatively, the user may approve the §17 change-log proposal to un-block a future sync task, or complete the GD-02 Cloud configuration to enable GD-08 live verification. Per the master prompt: do not proceed automatically.

## GD-05 — Restore preview and conflict resolution

- Status: `implemented-unverified` (delivered 2026-10-18; the Settings restore panel and the real IndexedDB transaction are runtime-unverified — no React/IndexedDB harness in-repo; live Drive restore is gated on the GD-02 user-owned Cloud config and ultimately GD-08)
- Started: 2026-10-18
- Completed: 2026-10-18
- Dependencies: GD-01 + GD-03 + GD-04 (all implemented-unverified); spec requires Merge/Replace semantics, safety checkpoint, validation-before-mutation, no silent partial restore
- Decision references: D5 (conflicts surfaced, never silently overwritten, keep-local default) and D7 (pre-restore safety checkpoint) carry forward; contract line "GD-05 must execute the plan in a single transaction, following the existing atomic write pattern in `src/db.ts`" honored; no new ADR; completion report `reports/GD-05-completion-report.md`

### Implementation summary
- **Read-only preview** (NEW `src/gdrive/restore.ts` `previewRestoreFromParsed`): wraps GD-01 `computeRestorePreview` over an already-validated download (GD-04 path) + trash-inclusive local state; classifies additions, unchanged records, content-conflicts, deletion-state-conflicts, informational same-name/different-id pairs, missing categories, and quarantined-record counts. `parse-error` / `invalid` / `unsupported-version` snapshots are `not-usable` — restore blocked, nothing read further. Cancel/close at any preview point writes nothing (pure functions cannot write).
- **Merge plan**: GD-01 `applyResolutions` via `buildMergePlan` — keep-local default; take-incoming writes the incoming record verbatim (tombstone restoration included); keep-both re-ids via the deterministic factory and records `reIdApplied`; preferences only with explicit opt-in AND only when the snapshot carries them.
- **Replace plan**: `buildReplacePlan` — entire validated snapshot becomes the library; deterministic; missing-category references become `default` fallbacks; follows the existing local-import contract (snippets + categories cleared, preferences NEVER cleared, `default` category guaranteed to survive).
- **Safety checkpoint (D7)**: `buildRestoreCheckpoint` captures the full local state trash-INCLUSIVE (`db.readAllLocalStateForRestore`) and verifies it by re-parsing the serialized export through `parseCloudSnapshot` (v1 migrates; integrity + size checks run). Reader failure or validation failure ⇒ checkpoint failed ⇒ `executeRestore` returns `checkpoint-unavailable` with zero writes, for BOTH modes.
- **Atomic execution**: `executeRestore` ordering is checkpoint gate → ONE transaction (`db.applyRestoreWritePlan`, single readwrite tx over snippets+categories+prefs mirroring `importData`/`resetToDefaultData`; any error aborts the whole tx = full rollback, never partial) → post-write count verification (`planRestoreExpectations` computed BEFORE writes; merge = locals + additions + keep-both; replace = plan size; categories exact for replace including the guaranteed `default`). `write-failed` and `verification-failed` are surfaced honestly; the checkpoint stays available.
- **Settings UI** (`src/components/SettingsView.tsx`): per-row Restore button (Upload icon, spinner while preparing) opens a read-only preview panel inside the Drive card: snapshot name, verified-checkpoint line, Merge/Replace mode toggle, count chips, per-conflict rows with Keep local / Use backup / Keep both, duplicate-name note, preferences opt-in checkbox (only when the snapshot has prefs), Replace requires an explicit "rewrites my entire library" checkbox before Apply enables, Cancel button (writes nothing), typed failure messages keep the panel open. After success: toast + library reload + list refresh.

### Files changed
- NEW `src/gdrive/restore.ts`, `tests/gdrive-restore.test.ts` (28 tests)
- `src/db.ts` (added `readAllLocalStateForRestore` + `applyRestoreWritePlan`; existing functions untouched)
- `src/components/SettingsView.tsx` (GD-05 flow: imports, flow state, three handlers, Restore row button, preview panel)
- `docs/tasks/BACKLOG.md` (GD-05 row + §2 note)
- `snippet-organizer-google-drive-handoff/BACKLOG.md`, `tasks/active.md`, `tasks/completed.md` (this record)
- `reports/DOCUMENTATION_CHANGELOG.md` (GD-05 entry)
- NEW `reports/GD-05-completion-report.md` (mandatory report)

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/gdrive-restore.test.ts` | 28/28 pass, 0 fail | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-browse.test.ts` | 19/19 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-backup.test.ts` | 22/22 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-contract.test.ts` | 27/27 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-auth.test.ts` | 21/21 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors (SettingsView UI type-checked in same run) | `[COMMAND-VERIFIED]` |
| Restore panel in a real browser | not exercised — no React test harness; runtime `[UNKNOWN]` | `[UNKNOWN]` |
| `applyRestoreWritePlan` under real IndexedDB (incl. abort-rollback) | not runnable in node:test; mirrors `importData` pattern; lint/type-checked only | `[UNKNOWN]` in-app |
| Real Drive download → restore round-trip | not exercised (needs GD-02 Cloud config) | `[UNKNOWN]` |

### Risks / limitations
- Replace is destructive by definition; guards are validation-before-clear, the verified checkpoint hard gate, the explicit understanding checkbox, and transaction atomicity. If the post-write check fails, the checkpoint is the recovery path (offered honestly in the failure message).
- Checkpoint lives in memory during the flow: a crash mid-flow loses it (but also cannot have written anything — writes happen only in the same session, in one atomic tx). A persisted checkpoint store would be a GD-07+/GD-08 hardening item, deliberately not invented here.
- UI runtime (panel layout at 480×600, scroll, checkboxes, toasts) unverified — ADR-009 tokens reused as-is.
- Live Drive restore unverified until the GD-02 user-owned Cloud configuration exists (GD-08 gate).

### Next task
- GD-06 (explicit sync/sync conflicts) — **not started**; requires explicit user go-ahead. Per the master prompt, do not proceed automatically.

## GD-04 — Browse, download, and manage backups

- Status: `implemented-unverified` (delivered 2026-10-18; live Drive browse/download/delete is gated on the GD-02 user-owned Cloud config and ultimately GD-08; the React UI has no in-repo test harness and is lint/type-checked only)
- Started: 2026-10-18
- Completed: 2026-10-18
- Dependencies: GD-03 (implemented-unverified); spec explicitly places deliberate cloud deletion inside GD-04 with named confirmation and cloud-only behavior
- Decision references: closed decisions D1/D3–D6 carry forward; GD-04-specific contract recorded as addendum §15 in `docs/google-drive-integration/data-contract.md` (no new ADR); completion report `reports/GD-04-completion-report.md`

### Implementation summary
- **Drive REST verification (live browser, `[SOURCE-VERIFIED]` 2026-10-18)**: `files.get` — `GET https://www.googleapis.com/drive/v3/files/{fileId}` with `alt=media` returns file contents in the response body; `files.delete` — `DELETE https://www.googleapis.com/drive/v3/files/{fileId}` **permanently deletes without moving to trash** (aligns with appDataFolder no-trash constraint).
- **Drive client extensions** (`src/gdrive/driveClient.ts`): `listSnapshotFiles` now paginates (`pageToken` arg, `nextPageToken` result, `pageSize=100`); NEW `downloadSnapshotFile` and `deleteFile`; failure taxonomy extended with `not-found` (404) and `rate-limited` (429) for the new operations. Existing upload path unchanged.
- **Browse/download/delete orchestration** (NEW `src/gdrive/snapshotStore.ts`, `createDriveService`): metadata-first browsing (contents fetched only on explicit request); hydration from `appProperties` (backupId/schemaVersion/createdAt/appVersion + NEW displayName) with Drive-metadata fallbacks; **newest-first sort** (envelope createdAt → Drive createdTime → driveFileId tie-break); pagination cap 20 pages × 100 (documented, anomaly guard); download validated via `parseCloudSnapshot` BEFORE being presentable as usable, raw bytes preserved for a safe raw save of invalid/unsupported files (restore stays GD-05-blocked); delete is permanent and cloud-only; 401 → clear cached token + silent re-auth + retry ONCE on every operation; all failures typed (nothing throws).
- **Settings UI** (`src/components/SettingsView.tsx`): "Google Drive Snapshots" card in Backup & Data between Import and Reset cards — Browse/Refresh button, idle/loading/empty/error+retry states, per-row displayName + local-time timestamp + size + v2/unverified badge + backupId/fileId, Save (blob+anchor export, same mechanism as local export; tokens never included), Delete with in-row confirmation **naming the snapshot**; permanent-deletion and local-safety copy on the card.
- **GD-03 enhancement**: upload `appProperties` now also carries `displayName` (listable without downloading; older GD-03 files fall back to file name).

### Files changed
- NEW `src/gdrive/snapshotStore.ts`, `tests/gdrive-browse.test.ts`
- `src/gdrive/driveClient.ts` (pagination + download + delete + taxonomy extension)
- `src/gdrive/backup.ts` (displayName in upload appProperties — one property added)
- `src/components/SettingsView.tsx` (GD-04 card, state, handlers, helpers; icons Cloud/RefreshCw added)
- `tests/gdrive-backup.test.ts` (list test made URL-encoding-agnostic after params refactor)
- `docs/google-drive-integration/data-contract.md` (§15 addendum)
- `docs/tasks/BACKLOG.md` (GD-04 row + §2 note)
- `snippet-organizer-google-drive-handoff/BACKLOG.md`, `tasks/active.md`, `tasks/completed.md` (this record)
- `reports/DOCUMENTATION_CHANGELOG.md` (GD-04 entry)
- NEW `reports/GD-04-completion-report.md` (mandatory 9-item report)

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/gdrive-browse.test.ts` | 19/19 pass, 0 fail | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-backup.test.ts` | 22/22 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-contract.test.ts` | 27/27 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-auth.test.ts` | 21/21 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors (SettingsView UI type-checked in same run) | `[COMMAND-VERIFIED]` |
| Drive API pages (files/get, files/delete) | fetched live 2026-10-18 | `[SOURCE-VERIFIED]` |
| Settings card in a real browser (popup + floating window) | not exercised — no React test harness; runtime `[UNKNOWN]` | `[UNKNOWN]` |
| Real Drive browse/download/delete | not exercised (needs GD-02 Cloud config) | `[UNKNOWN]` |

### Risks / limitations
- GD-02 blocker applies transitively: no live authorization ⇒ no live browse/download/delete evidence yet.
- UI runtime (layout at 480×600, scroll behavior, toasts) unverified — ADR-009 design tokens used as-is; visual fidelity requires manual review or GD-08.
- Deletion is permanent by Drive design; UI copy states this. A wrong-file delete is guarded only by the named confirmation (spec-defined behavior).
- Pagination cap (2000 entries) is a documented anomaly guard, not a product limit.
- `displayName` appProperty exists only for backups created after this change; older entries fall back to the file name.

### Next task
- GD-05 (restore preview/conflict resolution) — **not started**; requires explicit user go-ahead. Per the master prompt, do not proceed automatically.

## GD-03 — Create and version cloud backups

- Status: `implemented-unverified` (delivered 2026-10-18; live Drive upload is gated on the GD-02 user-owned Cloud config and ultimately GD-08)
- Started: 2026-10-18
- Completed: 2026-10-18
- Dependencies: GD-01 (implemented-unverified), GD-02 (implemented-unverified); final decisions D1/D3/D4/D5/D6 closed — not reopened
- Decision references: GD-01/ADR-010/ADR-011 + GD-02/ADR-012 carry forward unchanged; GD-03-specific contract recorded as addendum §14 in `docs/google-drive-integration/data-contract.md` (no new ADR required — nothing deviates from the closed decisions); completion report `reports/GD-03-completion-report.md`

### Implementation summary
- **Drive REST verification (live browser, `[SOURCE-VERIFIED]` 2026-10-18)**: `files.create` reference (upload URI `POST https://www.googleapis.com/upload/drive/v3/files`, `uploadType=multipart`); upload guide (multipart officially ≤ 5 MB; resumable init → `Location` session URI → PUT, `X-Upload-Content-Type/-Length` headers); files resource (`appProperties` = app-private key/value metadata, authenticated read); search guide (`appProperties has { key='k' and value='v' }` query, `name contains`); appDataFolder facts from GD-02 carry over.
- **Trash-inclusive local read** (`src/db.ts` `getAllSnippetsIncludingTrash`): plain read-only `getAll()`, tombstones preserved, **no `purgeExpiredTrash` side effect** (unlike `getAllSnippets`/`getTrashedSnippets`), id-sorted for deterministic digests; local `exportAllData`/`importData` untouched.
- **Gathering** (`src/gdrive/gather.ts`): pure gather with injected readers; copies records, deterministic order, counts (active/trashed/categories).
- **Drive client** (`src/gdrive/driveClient.ts`): injectable fetch; multipart ≤ 5 MB / resumable > 5 MB; metadata `{name, parents:['appDataFolder'], appProperties:{backupId, schemaVersion, createdAt, appVersion}}`; typed results (ok / unauthorized / forbidden / network-error(ambiguous) / error); `listSnapshotFiles` reconciliation primitive; no token/content logging.
- **Orchestrator** (`src/gdrive/backup.ts` `createCloudBackup`): authorize(interactive) → gather → `buildCloudSnapshot` → upload NEW file (additive-only, never overwrites/deletes); success ONLY on Drive-confirmed file id; 401 → `removeCachedAuthToken` + silent re-auth + retry ONCE; ambiguous network failure → reconcile by unique backupId (exactly 1 = created/reconciled, 0 = typed retryable failure, ≥2 = typed ambiguous, nothing auto-deleted); explicit user-initiated only (D6), no retention policy invented.
- **Boundary**: no GD-04 browse/download UI, no GD-05 restore, no deletions, no UI wiring (Settings button arrival is GD-04/GD-07).

### Files changed
- NEW `src/gdrive/gather.ts`, `src/gdrive/driveClient.ts`, `src/gdrive/backup.ts`, `tests/gdrive-backup.test.ts`
- `src/db.ts` (added `getAllSnippetsIncludingTrash`; no existing function modified)
- `docs/google-drive-integration/data-contract.md` (§14 GD-03 addendum; §13 open-items line updated: gather helper delivered here, not GD-05)
- `docs/tasks/BACKLOG.md` (GD-03 row + §2 note)
- `snippet-organizer-google-drive-handoff/BACKLOG.md`, `tasks/active.md`, `tasks/completed.md` (this record)
- `reports/DOCUMENTATION_CHANGELOG.md` (GD-03 entry)
- NEW `reports/GD-03-completion-report.md` (mandatory 9-item report)

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/gdrive-backup.test.ts` | 22/22 pass, 0 fail | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-contract.test.ts` | 27/27 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-auth.test.ts` | 21/21 pass, 0 fail (regression) | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0, 0 errors | `[COMMAND-VERIFIED]` |
| Drive API pages (files.create, manage-uploads, files resource, search-files) | fetched live 2026-10-18 | `[SOURCE-VERIFIED]` |
| `getAllSnippetsIncludingTrash` under real IndexedDB | not runnable in node:test; lint/type-checked only; node resolves `[]` by design | `[UNKNOWN]` in-app |
| Real Drive upload / reconcile / 401-retry | not exercised (needs GD-02 Cloud config) | `[UNKNOWN]` |

### Risks / limitations
- GD-02 blocker applies transitively: no live authorization ⇒ no live upload/reconciliation evidence yet.
- `getAllSnippetsIncludingTrash` runtime behavior in-app unverified (IndexedDB absent under node:test) — flagged, GD-08 covers E2E.
- Duplicate backupIds (same content+second) intentionally allowed; surfacing/dedupe is GD-04.
- Session-URI PUT and multipart boundary serialization verified against official docs structurally; exact server behavior unverified until live.

### Next task
- GD-04 (browse/download/manage backups) — **not started**; requires explicit user go-ahead. Per the master prompt, do not proceed automatically.

---

# PR-1 — Production Readiness Phase 1

- Status: `implemented-unverified` (delivered 2026-10-19; in-Chrome manual checklist pending — no Chrome runtime in the agent environment)
- Started: 2026-10-19
- Completed: 2026-10-19
- Dependencies: GD-08 (implemented-unverified); user-owned Cloud configuration (completed by the user themselves — real client ID, Drive API, Test user)
- Decision references: D1–D8, ADR-002/009/010/011/012 unchanged; GD-06 stays `blocked`; no scope/permission change (see below)

### Root causes fixed
1. **Restart showed stale `Connect`**: Chrome's `chrome.identity` token cache persists across extension restarts, but the GD-07 connection row derived its state ONLY from in-session auth outcomes (`SettingsView.tsx` initializer + operation-success flips). Fix: silent startup probe (`createConnectionProbe`) verifying config → cached token → live Drive access; UI states `checking` → `connected`/`disconnected`/`connection-error` truthfully; revoked/expired grants get ONE silent retry after cache clear, then honest `disconnected` (Connect offered; never an auto-prompt).
2. **No account identity**: `GET https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)` with the EXISTING `drive.appdata` token returns email/displayName/https-photoLink — official Drive v3 docs (fetched 2026-10-19) list `drive.appdata` among `about.get`'s accepted scopes, so **no new OAuth scope or manifest permission was added** (`chrome.identity.getProfileUserInfo` rejected — it needs `identity.email`). Email + avatar (initial-letter fallback) render while connected; cleared on Disconnect; in-memory only; never logged/persisted.
3. **All 403s mislabeled "permissions"**: Drive rate-limits with 403 for a documented reason family. `reasonFrom` parses `error.errors[].reason` / `error.details[].reason`; extended failure mapping promotes that family to `rate-limited`; `insufficientPermissions`/`serviceDisabled` get Drive-API/Test-user guidance; reason-less bodies keep the honest HTTP-status message with `reason: null`.

### Files changed
- NEW `src/gdrive/connection.ts`, NEW `tests/gdrive-connection.test.ts`
- `src/gdrive/driveClient.ts` (`reasonFrom`, `DRIVE_RATE_LIMIT_403_REASONS`, `reason` fields, 403-promotion in the extended mapper), `src/gdrive/snapshotStore.ts` (optional `reason` on `ServiceFailure`), `src/gdrive/backup.ts` (reason surfaced in forbidden message)
- `src/components/SettingsView.tsx` (mount probe, `checking` state, identity row, reason-aware `describeDriveError`, updated comments), `src/components/Footer.tsx` + `src/components/MainPopup.tsx` (optional `driveStatus` real-state indicator, `role="status"`)
- Docs: `docs/google-drive-integration/oauth-contract.md` (§8 module, §9 PR-1 update + checklist status), `docs/project-knowledge/ARCHITECTURE.md` §8, `reports/DOCUMENTATION_CHANGELOG.md`, `docs/tasks/BACKLOG.md`, handoff BACKLOG/active/completed
- Packaging: zip rebuilt via .NET `ZipArchive` — forward-slash entry names (Compress-Archive had written `assets\…` backslash entries AND stale duplicates: 35 vs 17 entries), root `manifest.json` byte-identical to source

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/gdrive-connection.test.ts` | 14/14 pass, 0 fail | `[COMMAND-VERIFIED]` |
| Regression battery (auth/contract/backup/browse/restore) | 22/27/26/19/28 — all pass, 0 fail | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` (`tsc --noEmit`) | exit 0 | `[COMMAND-VERIFIED]` |
| `npx.cmd vite build` | exit 0 (~518 ms) | `[COMMAND-VERIFIED]` |
| `npm.cmd run build` | exit 1 — pack step only (absent `python3`; pre-existing documented limit) | `[COMMAND-VERIFIED]` |
| dist/zip manifest | dist == source byte-identical; client ID well-formed + non-placeholder (masked `1085314759…j63.apps.googleusercontent.com`); scopes exactly `drive.appdata`; permissions `storage,identity`; zip root `manifest.json` present | `[COMMAND-VERIFIED]` |
| about.get scope list (drive.appdata accepted) | official Drive v3 reference fetched via web proxy 2026-10-19 | `[SOURCE-VERIFIED]` |
| In-Chrome restart truth, identity rendering, precise error rendering, silent-probe no-prompt | not exercised by the agent | `[UNKNOWN]` |
| Live auth + snapshot create/list with the real client | works (user's own report of their Chrome) | USER-ATTESTED (`[UNKNOWN]` for the agent) |

### Risks / limitations
- Manual Chrome checklist outstanding (report §6): restart → still Connected; footer indicator both states; Disconnect clears email/avatar; rate-limit vs permission wording on real errors; token-revocation path (revoke at Google Account → probe shows disconnected → Connect recovers).
- Extension ID still unstable (no pinned `key`) — required before Chrome Web Store upload; client registration must then be re-pointed if the ID changes.
- `about.get` identity depends on Drive API availability; offline/5xx/403 render as `connection-error` with precise text (not a false "disconnected").

### Next task
- None queued. The manual Chrome checklist and `key` pinning are user-owned; any further work needs an explicit user instruction.

---

# PR-1B — Persistent User-Requested Disconnect (silent-reconnect fix)

- Status: `implemented-unverified` (delivered 2026-10-19; in-Chrome reopen verification pending — no Chrome runtime in the agent environment)
- Started / Completed: 2026-10-19
- Dependencies: PR-1 (implemented-unverified)
- Decision references: D1–D8 + ADRs unchanged; GD-06 stays `blocked`; no scope/permission change; no new dependencies

### Confirmed root cause
`chrome.identity.removeCachedAuthToken` (called by `signOut`) only evicts the LOCAL token cache entry — the OAuth **grant** (user consent) remains valid at Google, so the next `getAuthToken({interactive:false})` silently MINTS a fresh token. PR-1's startup probe (correctly) verified that token with `about.get` and reported connected. The disconnect decision lived only in component state, which dies with the popup. Therefore: removing a cached token alone can never persist a disconnect, and any probe that treats "a silent token exists" as authority will reconnect after every reopen.

### Fix
- `src/gdrive/connection.ts`: `ConnectionIntentStore` seam + `createChromeConnectionIntentStore()` — guarded callback-style `chrome.storage.local`, key `gdriveUserDisconnected`; missing/broken API degrades to `false` without throwing. Probe step 1.5 (before ANY token lookup or network call): flag set ⇒ `disconnected{reason:'user-requested'}` — zero auth calls, zero Drive calls; storage read failure ⇒ treated as not-disconnected so connection checks keep working.
- `src/components/SettingsView.tsx`: Disconnect persists the flag FIRST (so the choice survives popup close/reopen even if token eviction fails), then `signOut()`; row note "You disconnected Google Drive. Click Connect to reconnect."; Connect clears the flag BEFORE the interactive authorize — an explicit click is the only thing that may clear it.
- `MainPopup` footer probe uses the same store via the probe default — no code change needed.

### Files changed
`src/gdrive/connection.ts`, `src/components/SettingsView.tsx`, `tests/gdrive-connection.test.ts` (+5 → 19), docs (oauth-contract §9 PR-1b, ARCHITECTURE §8, DOCUMENTATION_CHANGELOG, both BACKLOGs, handoff records).

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/gdrive-connection.test.ts` | 19/19 (5 new: flag beats valid token w/ zero auth+network; fresh-probe reopen simulation; Connect-clears-intent; storage-read-failure proceeds; chrome-store roundtrip + broken-API degradation) | `[COMMAND-VERIFIED]` |
| Regression battery (auth/contract/backup/browse/restore) | 22/27/26/19/28 — all pass | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` | exit 0 | `[COMMAND-VERIFIED]` |
| `npx.cmd vite build` | exit 0 (447 ms) | `[COMMAND-VERIFIED]` |
| Packaging | zip 17 forward-slash entries, root `manifest.json` == source, dist manifest == source, fix marker `gdriveUserDisconnected` present in dist chunk `src-BjuS1HR5.js` | `[COMMAND-VERIFIED]` |
| In-Chrome Disconnect → reopen → still disconnected; explicit Connect reconnects | NOT exercised by the agent — manual steps in PR-1 report §8 | `[UNKNOWN]` |

### Next task
- None queued; user-owned: §8 manual verification, `key` pinning before CWS.

---

# PR-1C — Browse Drive bypassed the disconnect intent (live Drive fetch while UI showed disconnected)

- Status: `implemented-unverified` (delivered 2026-10-19; in-Chrome browse-while-disconnected verification pending — no Chrome runtime in the agent environment)
- Started / Completed: 2026-10-19
- Dependencies: PR-1B (implemented-unverified)
- Decision references: D1–D8 + ADRs unchanged; GD-06 stays `blocked`; no scope/permission change; no new dependencies

### Confirmed root cause
`[SOURCE-VERIFIED]` The persisted flag (`gdriveUserDisconnected`) was only honored by the startup probe. Browse Drive (`SettingsView.handleDriveRefresh` → `snapshotStore.withAuthorizedClient` → `authorize({interactive:true})`) never consulted it. Chrome's `getAuthToken` only prompts when consent/account-selection UI is needed — with the grant still valid at Google it resolves SILENTLY by minting a fresh token. So the browse listing the user saw was a **LIVE Drive API response obtained through a silent re-authorization**, not cached data: the app has no Drive listing cache (every `browse()` issues real `files.list` calls; the UI list is in-memory component state that dies with the popup). A successful browse even flipped the row back to `connected` (L747 "a successful browse IS a connection proof"), deepening the contradiction.

### Fix (one policy seam — no separate auth path for Browse)
- `src/gdrive/snapshotStore.ts`: `withAuthorizedClient` checks the persisted intent BEFORE authorize → `user-disconnected` typed failure, ZERO auth/network calls, for browse/download/delete (restore's download flows through the same seam); storage read failure ⇒ proceeds (probe parity). `ServiceFailure` + `user-disconnected` member.
- `src/gdrive/backup.ts`: `run()` step 0 same check → `failed{reason:'user-disconnected'}` with zero auth/reads/uploads.
- `src/components/SettingsView.tsx`: one shared intent store injected into both seams; new `disconnected` list phase (distinct from loading/error/empty; message + "Connect to browse again"); Disconnect clears the in-memory listing (nothing stale shown as live); `describeDriveError` case.
- Remote data safety: Disconnect never deletes (delete is itself gated while disconnected; `signOut` = token-cache eviction only, GD-08 guard).

### Files changed
`src/gdrive/snapshotStore.ts`, `src/gdrive/backup.ts`, `src/gdrive/connection.ts` (shared message const), `src/components/SettingsView.tsx`, `tests/gdrive-browse.test.ts` (+4 → 23), `tests/gdrive-backup.test.ts` (+2 → 28), docs (oauth-contract §9 PR-1c, ARCHITECTURE §8, changelog, both BACKLOGs, handoff records).

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/gdrive-browse.test.ts` | 23/23 (4 new: zero-auth/zero-request listing block; delete+download gated; intent-clear allows live listing; read-failure proceeds) | `[COMMAND-VERIFIED]` |
| `npx.cmd tsx tests/gdrive-backup.test.ts` | 28/28 (2 new: creation gated zero auth/reads/network; intent-clear allows creation) | `[COMMAND-VERIFIED]` |
| Full battery (connection/auth/contract/backup/browse/restore) | 19/22/27/28/23/28 — **147/147, fail 0** | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` | exit 0 (after fixing one TS18048 in a test) | `[COMMAND-VERIFIED]` |
| `npx.cmd vite build` | exit 0 (456 ms) | `[COMMAND-VERIFIED]` |
| Packaging | zip 17 forward-slash entries, root `manifest.json` == source, dist manifest == source, marker in dist chunk `src-CfAgpCci.js` | `[COMMAND-VERIFIED]` |
| In-Chrome: browse blocked while disconnected; explicit Connect restores browsing + existing backup visible | NOT exercised by the agent — manual steps in PR-1 report §9 | `[UNKNOWN]` |

### Next task
- None queued; user-owned: §8–§9 manual verification, `key` pinning before CWS.

---

# POPUP-REFRESH-01 + THIN-SCROLL-01 — Popup Refresh button & thin minimal scrollbar

- Status: `implemented-unverified` (delivered 2026-10-19; in-Chrome visuals/interaction pending — no Chrome runtime in the agent environment)
- Started / Completed: 2026-10-19
- Dependencies: PR-1/1B/1C probe + intent-flag work (implemented-unverified)
- Decision references: D1–D8 + ADR-002/009/010/011/012 unchanged; GD-06 stays `blocked`; no scope/permission change; no new dependencies

### What shipped
- **Refresh button (POPUP-REFRESH-01)**: compact square `nm-press`/`nm-icon-btn` button with `RefreshCw` (18px) immediately right of the search field (search row is now flex; field `flex-1` ≈ 87% of former width, no overflow). Clicking it runs the new `src/popupRefresh.ts` orchestrator: existing `MainPopup.loadData` (snippets/categories/preferences re-read from IndexedDB, now epoch-guarded so a stale load can never overwrite newer state) + the silent Drive probe (footer status re-checked). Single-flight (duplicate clicks are no-ops), `onBegin/onEnd` always fire (spinner/button recover even on failure), failure → existing copy-toast "Refresh failed — showing the last loaded data" without wiping valid UI data. Drive safety by construction: Refresh NEVER clears `gdriveUserDisconnected` (probe only reads it — probe step 1.5 returns `disconnected` before any token lookup), NEVER triggers interactive OAuth (probe is non-interactive; pinned by the connection suite), NEVER creates/deletes/restores/uploads snapshots; explicit Connect remains the only reconnect path. No `chrome.runtime.reload()`.
- **Thin scrollbar (THIN-SCROLL-01)**: `.nm-scrollbar` utility in `src/index.css` — `scrollbar-width: thin` + `scrollbar-color` (Chromium 121+/Firefox native) with narrowly scoped `-webkit-*` fallbacks (6px neutral slate thumb `rgba(100,116,139,.4)`, hover `.6`, transparent track, 9999px radius). Applied ONLY to popup scroll containers: MainPopup snippet list, SnippetEditorModal form scroll + rich-editor content, SnippetPreviewModal body. `no-scrollbar` rows (intentionally hidden) and the separate settings page untouched; no nested scrollbars introduced; global `prefers-reduced-motion` rule (index.css) already neutralizes the spin for reduced-motion users.

### Files changed
`src/popupRefresh.ts` (new), `src/components/MainPopup.tsx`, `src/components/SearchAndFilters.tsx`, `src/components/SnippetEditorModal.tsx` (2 class additions), `src/components/SnippetPreviewModal.tsx` (1), `src/index.css` (appended `.nm-scrollbar`), `tests/popup-refresh.test.ts` (new, 5), docs (ARCHITECTURE §8 UI-surface, changelog, BACKLOG row, this record).

### Verification
| Command/check | Actual result | Evidence level |
|---|---|---|
| `npx.cmd tsx tests/popup-refresh.test.ts` | 5/5 (single-run; single-flight no-op; loadData-failure recovery w/ probe still run; probe-failure recovery; composition safety — exactly one loadData + one probe per attempt) | `[COMMAND-VERIFIED]` |
| Full battery (7 suites) | connection 19, auth 22, contract 27, backup 28, browse 23, restore 28, popup-refresh 5 — **152/152, fail 0** | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` | exit 0 | `[COMMAND-VERIFIED]` |
| `npx.cmd vite build` | exit 0 (674 ms) | `[COMMAND-VERIFIED]` |
| Packaging | zip 17 forward-slash entries, root `manifest.json` == source; dist markers: RefreshCw + "Refresh popup" (JS), `nm-scrollbar` + `scrollbar-width` (CSS), `gdriveUserDisconnected` still present | `[COMMAND-VERIFIED]` |
| In-Chrome: button placement/alignment, refresh behavior, scrollbar look, disconnect preserved after Refresh | NOT exercised by the agent — manual steps in the POPUP-REFRESH-01 report | `[UNKNOWN]` |

Note: the project has no React testing layer (and none may be added), so TSX rendering/click behavior is intentionally verified via lint+build+manual steps; the refresh behavior contract is unit-tested at the orchestrator level instead.

### Turn 16 refinement (2026-10-19): red-themed global scrollbar + refresh animation feedback
- Scrollbar thumb re-themed to the brand red via NEW tokens `--red-scrollbar-thumb: rgba(208,2,5,0.38)` / `--red-scrollbar-thumb-hover: rgba(208,2,5,0.62)` (derived from locked `--red-brand`; single source, no competing values) in `index.css :root`, consumed by `.nm-scrollbar`. **Settings gap fixed**: the stylesheet is shared (both `popup.tsx` and `settings.tsx` import `index.css`) — the style was missing on Settings purely because its containers lacked the opt-in class; added `nm-scrollbar` to SettingsView's 4 scroll containers (sidebar aside, tab content, snapshot list `max-h-64`, restore-conflicts list `max-h-40`). Total: 8 containers across Main Popup / Edit Snippet / Settings.
- Refresh feedback: snippet-list region fades to `opacity-60` (200ms opacity-only transition — no layout shift, content stays visible, search/filter/scroll state untouched) + `aria-busy={isRefreshing}`; spinner tints to brand accent `#9f0409` while rotating; reduced-motion users get the static red icon + disabled button + faded aria-busy region (global rule already freezes animations). Single-flight + error recovery unchanged (orchestrator untouched).
- Verification: battery 152/152, lint 0, `vite build` 0 (489 ms), zip verified (17 forward-slash entries, root manifest identical); dist markers: `--red-scrollbar-thumb` present, slate thumb gone, `Refresh popup` + `gdriveUserDisconnected` intact. Docs: DESIGN_SYSTEM §4/§5 (closes turn-15 doc gap), ARCHITECTURE §8, changelog, BACKLOG row, this record. In-Chrome visuals `[UNKNOWN]` (user-owned).

### Turn 17 (2026-10-19): four locked UI/functionality improvements
1. **Category tab scrollbar**: the filter/category tab row (`role="tablist"`, SearchAndFilters) used `no-scrollbar` (hidden) — swapped to the shared `.nm-scrollbar` (9 applied containers total; dropdown portal untouched).
2. **Refresh independence**: orchestrator now runs local reload + silent probe CONCURRENTLY via `Promise.allSettled` (a hung Drive check can no longer delay local refresh or hold the button disabled); `runPopupProbe` marks `checking` at each real re-probe. Source-verified: the button was always rendered unconditionally — never gated on Drive state; the reported disappearance matches the sequential-era long-spinner/disable behavior now removed. Tests 5→6 (concurrent-start + hung-probe independence; single-flight updated for the concurrent contract).
3. **SHORTCUTS-VERTICAL-01**: all Settings → Shortcuts rows restacked vertically (title → desc → wrap-friendly key badges → Change/Cancel inside section; reset footer row stacked). Root cause: horizontal `justify-between` rows with `shrink-0` badge+button groups squeezed long descriptions. Zero behavior change.
4. **GOOGLE-LOGO-01**: new `src/components/GoogleLogo.tsx` (official four-color G inline SVG — no repo asset existed; no dependency, no runtime request). Footer: connected = static G + unchanged label; checking = G pulse (real probe); not-connected = neutral dot. No sync claims/polling (GD-06/07 intact).
Verification: battery **153/153**, lint 0, `vite build` 0 (727 ms), zip verified; dist markers: brand colors EA4335/4285F4/FBBC05/34A853 + both footer labels + `allSettled` + `gdriveUserDisconnected`. Docs: DESIGN_SYSTEM §5 rows, ARCHITECTURE §8, changelog, BACKLOG, this record. In-Chrome `[UNKNOWN]`.

### Turn 18 (2026-10-19): two reported-defect fixes
1. **All Category dropdown scrollbar** — root cause: `no-scrollbar` was NEVER defined in any stylesheet (a no-op class), so portal-rendered dropdown panels showed the browser's classic scrollbar all along. Fix: dropdown panel now uses the shared `.nm-scrollbar` (10 applied containers; portals reach index.css — same document). Two editor-toolbar rows still carry the undefined class (unreported surface, left per locked scope — flagged).
2. **Connection-independent refresh feedback** — data path verified correct (unconditional button; filter effect re-derives from loadData state; concurrent allSettled orchestrator). Real defect: disconnected refresh settles in tens of ms (instant probe + fast IndexedDB) → spinner imperceptible vs the connected case's visible network wait. Fix: connection-independent `minDurationMs` floor (default 450 ms) — data applies the moment loadData resolves; only feedback END waits. Tests 6→8 (+2 regressions: visible window on near-instant refresh with real reads; floor never delays data).
Verification: battery **155/155**, lint 0, vite build 0 (485 ms), zip verified; dist markers: `nm-dropdown-panel nm-scrollbar` same-element, `450` floor, `gdriveUserDisconnected` intact. Docs: ARCHITECTURE §8, changelog, this record. In-Chrome `[UNKNOWN]`.

### Turn 19 (2026-10-20): official Google Drive logo in the footer
The turn-17 generic Google "G" was inaccurate for a Drive-only integration. New `src/components/GoogleDriveLogo.tsx` — official Drive triangular logo as inline SVG (canonical 2020 tricolor geometry, viewBox 0 0 87.3 78, brand colors #0066DA/#00AC47/#EA4335/#00832D/#2684FC/#FFBA00; no repo asset existed; no dependency, no runtime request; `aria-hidden` — footer `role="status"` label carries meaning). `GoogleLogo.tsx` deleted (single consumer was Footer); Footer swapped (connected=static, checking=pulse, disconnected=neutral dot); 15×14px matches the mark's aspect — no stretch. Zero changes to connection logic, permissions, manifest, labels, or layout. Verification: battery **155/155**, lint 0, vite build 0 (856 ms), zip verified; dist markers: five Drive-only colors + `87.3` present, G-only `4285F4` absent, labels + `gdriveUserDisconnected` intact. In-Chrome `[UNKNOWN]`.

### Next task
- None queued; user-owned: in-Chrome visual/interaction check, earlier §8–§9 Drive manual verification, `key` pinning before CWS.

