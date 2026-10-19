# GD-00 — Project Audit & Decision Inputs: Google Drive Backup Integration

**Task**: GD-00 (audit/reconciliation only — no application source changes)
**Date**: 2026-10-18
**Status**: Delivered, awaiting user review (`implemented-unverified` until the user accepts the findings and decision gates)
**Evidence standard**: every claim is tagged `[SOURCE-VERIFIED]` (read in this session), `[COMMAND-VERIFIED]` (command run in this session), `[INFERRED]`, or `[UNKNOWN]`, per `docs/project-knowledge/README.md` §3.

**Scope lock honored**: this audit read repository docs and source and wrote documentation only. No file under `src/`, `manifest.json` (root or `public/`), `service-worker.js` (root or `public/`), `index.html`, `popup.html`, or `settings.html` was modified. `docs/project-knowledge/DECISIONS.md` was deliberately NOT touched: it is the registry of **approved** ADRs, and every decision below is a *proposal* requiring user sign-off before an ADR can be authored (Section 10).

---

## 1. Method

1. Followed the mandatory reading order (`AGENTS.md` §1): `docs/project-knowledge/README.md` → `PROJECT_BRIEF.md` → `DECISIONS.md` → `ARCHITECTURE.md` → `docs/tasks/BACKLOG.md`, plus `FEATURES.md`, `INTEGRATIONS.md`, `code-graph/metadata.md`, and the design/task documents referenced by them.
2. Read the handoff package `snippet-organizer-google-drive-handoff/` (README, HARNESS_MASTER_PROMPT.md, BACKLOG.md, PACKAGE-MANIFEST.json, `tasks/active.md`, `tasks/completed.md`, `templates/TASK-RECORD.md`, and `tasks/GD-00-project-audit-and-decisions.spec.md`).
3. Inspected the actual build configuration, both manifest copies, the active service worker, the data layer (`src/db.ts`), types (`src/types.ts`), the Settings UI (`src/components/SettingsView.tsx`, targeted sections), entry HTML files, the packaging script, and ignore/metadata files.
4. Ran the documented verification command that is runnable in this environment and hash-compared the duplicated root/`public/` artifacts.
5. Reconciled every canonical doc claim touched by the audit against source. Graphify/GitNexus are unavailable in this environment (`AGENTS.md` §3; `code-graph/metadata.md` §1), so the static dependency map in `docs/project-knowledge/code-graph/metadata.md` was used for the module view.

Commands actually run in this session:

| Command / check | Result | Evidence |
|---|---|---|
| `npm.cmd run lint` (= `tsc --noEmit`) | exit 0, no errors | `[COMMAND-VERIFIED]` |
| `Get-FileHash` SHA-256, root vs `public/` `manifest.json` | different digests (`550351B2…` vs `5A1DD0FB…`) | `[COMMAND-VERIFIED]` |
| `Get-FileHash` SHA-256, root vs `public/` `service-worker.js` | different digests (`260E148F…` vs `E985398C…`); root 10,203 B vs public 17,836 B | `[COMMAND-VERIFIED]` |
| grep `src/` for `fetch(`/`XMLHttpRequest`/`WebSocket`/dynamic `import()` | zero matches | `[SOURCE-VERIFIED]` |
| grep `src/` for `*.test.*`/`*.spec.*` sources | zero files | `[SOURCE-VERIFIED]` |
| grep `src/` for imports of `express`/`dotenv`/`@google/genai`/`jszip`/`motion` | zero matches (deps unused) | `[SOURCE-VERIFIED]` |
| grep `docs/tasks/BACKLOG.md` for `GD-` | zero matches (GD tasks exist only in the handoff package) | `[SOURCE-VERIFIED]` |

Not run: `npm run build` / pack (writes `dist/` + zip; out of audit scope; pack also needs `python3`, absent on this machine — `PROJECT_BRIEF.md` §4). No dev server, no runtime verification of extension behavior (no Chrome host in this environment) `[UNKNOWN]`.

---

## 2. Area 1 — Repository, entry points, package manager, commands

### 2.1 Entry points `[SOURCE-VERIFIED]`
Multi-entry Vite SPA packaged as a Chrome MV3 extension (`vite.config.ts:14-22`):

| Entry | HTML | TS entry → root component | Role |
|---|---|---|---|
| Web demo | `index.html` | `src/main.tsx` → `App` | Browser preview + zip download |
| Docked popup / floating window | `popup.html` | `src/popup.tsx` → `MainPopup` | Toolbar popup; floating via `?mode=floating` |
| Settings options page | `settings.html` | `src/settings.tsx` → `SettingsView` | Full-tab options page (`options_ui.open_in_tab: true`) |
| Background | — | `public/service-worker.js` | Floating-window lifecycle only |

`vite.config.ts` inputs are the **root** HTML files; everything static (manifest, service worker, icons, zip) ships from **`public/`** via Vite's public-dir copy into `dist/` `[SOURCE-VERIFIED]`.

### 2.2 Package manager & tooling `[SOURCE-VERIFIED]`
- `package.json`: `name "react-example"`, `version "0.0.0"` (AI Studio template remnants); scripts: `dev` (Vite, port 3000), `build` = `vite build && node scripts/pack-extension.js`, `pack`, `preview`, `clean`, `lint` = `tsc --noEmit`.
- **Dual lockfiles**: both `bun.lock` and `package-lock.json` exist. AGENTS.md documents npm commands only; no doc mentions bun. Risk: the two lockfiles can drift; npm is the operative one for the documented commands.
- `tsconfig.json`: ES2022 target, `noEmit`, `allowJs: true`, bundler resolution, `@/*` alias.
- `scripts/pack-extension.js`: zips `dist/` via an inline `python3` program into `public/snippet-organizer-extension.zip` and copies to `dist/`. Fails without `python3` `[SOURCE-VERIFIED]`; Windows fallback documented in `docs/project-knowledge/PROJECT_BRIEF.md` §4 (`npx vite build` + `Compress-Archive`).
- **Template noise, unused in `src/`** `[SOURCE-VERIFIED]`: dependencies `@google/genai`, `dotenv`, `express`, `jszip`, `motion` (+ dev-only `esbuild`, `tsx`, `autoprefixer`) are declared in `package.json:14-38` but imported nowhere in `src/`. `metadata.json` declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`; `.env.example` contains `GEMINI_API_KEY`/`APP_URL` boilerplate. Harmless today, but must not be mistaken for project capability; cleanup is out of GD-00 scope (recorded as follow-up).

### 2.3 Commands `[COMMAND-VERIFIED]`
- `npm.cmd run lint` — ran in this session: 0 errors. (`npm.ps1` is blocked by this machine's execution policy; `npm.cmd` is required.)
- `npm run build` — not run (writes artifacts); documented in AGENTS.md/PROJECT_BRIEF.
- No test command exists (Section 8).

---

## 3. Area 2 — Manifest, MV3 surface, permissions, extension ID, CSP

### 3.1 TWO divergent manifests — the shipping one is `public/manifest.json` `[SOURCE-VERIFIED]`

| Aspect | root `manifest.json` (24 lines) | `public/manifest.json` (42 lines, **ships**) |
|---|---|---|
| `permissions` | `["storage", "identity"]` | **`["storage"]`** — no `identity` |
| icons | none | 16/32/48/128 via `public/icons/` |
| `commands` | `_execute_action` only | `_execute_action` **+ `toggle-organizer` (Ctrl+Shift+X)** |
| description | short | richer string |

SHA-256 digests differ (`[COMMAND-VERIFIED]`, Section 1). The root copy is a **stale era artifact** (pre UI-WINDOW-LOCK / icon-pack tasks). `docs/project-knowledge/README.md` §3.1 lists the root manifest and service worker as "active", which is wrong for content parity: only the `public/` copies are packaged. (The root HTML files ARE active — they are the Vite inputs — which makes the README claim half-true and more confusing.)

### 3.2 Active service worker = `public/service-worker.js` `[SOURCE-VERIFIED]`
476 lines, window management only: fixed 480×600 constants (`:29-30`), frame-delta calibration via `CALIBRATE_FLOATING_FRAME` + `chrome.storage.session` (`:35-47`), action-popup attach/detach via `isFloatingMode` (`:61-70`), floating-window id/position keys `floatingWindowId` / `floatingWindowPosition` in `chrome.storage.local` (`:88-91`, `:456-462`), stale-id cleanup on `onRemoved` (`:470-476`). Logging: two `console.info` calls with install/startup reason strings only (`:73`, `:78`) — no data. **No OAuth, Drive, or network code exists anywhere today** (zero `fetch`/XHR/WebSocket in `src/` `[SOURCE-VERIFIED]`; no host permissions in either manifest).

### 3.3 Permissions posture `[SOURCE-VERIFIED]`
- Shipping manifest requests **only `storage`**. `identity` appears in the stale root copy (and is quoted as "declared in base manifest" in `INTEGRATIONS.md:27,45`) — that is the single largest docs-vs-shipping discrepancy relevant to GD-02, which must add `identity` to `public/manifest.json` (and decide whether any host permissions are needed).
- No `content_scripts`, no `web_accessible_resources`, no `content_security_policy` override (MV3 defaults apply), no `oauth2` block, no extension ID pinning (`key`) in either manifest.
- **Extension ID**: nothing pins the ID today. Unpacked development derives the ID from the absolute path → unstable across machines, which breaks any fixed OAuth redirect URI (`https://<ext-id>.chromiumapp.org/`). GD-02 must choose: manifest `key` field (stable for unpacked) vs Web Store ID. Decision gate D1/D2 (Section 10).

### 3.4 Entry HTML `[SOURCE-VERIFIED]`
`popup.html:13-27` fixes `html, body { width: 480px; height: 600px }` (both modes) and adds a `floating` class for `?mode=floating`; `settings.html` is a plain shell (options page card is sized in `src/settings.tsx:16`, `h-[640px] max-h-[92vh]`). The popup surface itself is `w-[430px] h-[550px]` (`MainPopup.tsx:486`) inset on a 25 px ring — **480×600 is the source-verified truth**; every "712 × 512" text still in *current-state* docs is stale (Section 9).

---

## 4. Area 3 — Settings → Backup & Data UI today (conventions GD-07 must reuse)

All in `src/components/SettingsView.tsx` (1,870 lines) `[SOURCE-VERIFIED]`:

- Tab rail `general | categories | shortcuts | data | trash | about` (`:536-543`); the Drive UI's mandated home already exists: **tab `data`, labeled "Backup & Data"** (`:540`), section rendered at `:1325-1471` ("Backup & Data Management", `max-w-xl`).
- **Export card** (`:1334-1352`): `Export JSON` button (`nm-primary-raised`) → `handleExport` (`:462-482`).
- **Import card** (`:1354-1430s`): Merge/Replace mode toggle (`importMode`, default **`merge`**, `:246`), file input `accept=".json,application/json"`, `isImporting` progress state (`:484-511` — real in-progress state: File button shows "Importing…", mode buttons disabled, `finally` always restores; MOTION-01).
- **Reset card**: "Reset to Defaults" → inline destructive confirm (`showResetConfirm` → Cancel / **Confirm Reset** with `nm-danger-raised`, `:1453-1467`) → `handleResetDefaults` (`:513-523`).
- **Reusable primitives**: toast banner (`toastMessage`/`toastType` success|error, 3 s auto-dismiss + 170 ms fade exit + manual ×, `:99-127`); page loading spinner (`:525-534`); section wrapper class `nm-static-inset-section`; destructive confirm pattern (inline two-step, or modal with choices — category delete modal `:433-460`); trash row actions (Restore / Delete forever / Empty trash with confirm, trash tab `:1474-1690s`).
- Settings renders in **two hosts**: the full options page (`src/settings.tsx`) and the in-popup `SettingsModal` — any Drive UI added to the `data` tab must work in both.
- Design lock: all controls already use the locked Red Glass-Claymorphism system (`nm-*` classes; ADR-009). GD-07 must reuse these classes and the toast/confirm/loading conventions; no new visual language.

---

## 5. Area 4 — Data model & storage semantics

`src/types.ts` + `src/db.ts` `[SOURCE-VERIFIED]`:

### 5.1 IndexedDB `snippet-organizer` v1 (`db.ts:4-8`)
| Store | keyPath | Records |
|---|---|---|
| `snippets` | `id` (db.ts:122) | see 5.2 |
| `categories` | `id` (db.ts:130) | `{ id, name, color }`; seeds `default/shipping/billing/account` (db.ts:10-15) |
| `preferences` | **`id`** (db.ts:134) | single record `id: 'user_preferences'` + `Preferences` (contradicts `ARCHITECTURE.md:113`, which documents keyPath `key` — see Section 9, M6) |

### 5.2 Snippet shape (`types.ts:1-12`)
`{ id, title, content (rich HTML string), categoryId, isFavorite, createdAt, updatedAt, lastUsedAt, deletedAt, version }`
- IDs: `snip-<uuid>` for created snippets; seed rows are `snip-1…snip-5`. Category IDs: `cat-` + 8 hex chars for new categories `[SOURCE-VERIFIED]` (seed IDs are plain words).
- `deletedAt: number | null` doubles as the **trash tombstone** (72 h retention, `TRASH_RETENTION_MS`, purged by `purgeExpiredTrash()` on DB init, `db.ts:523-553`). There is no separate delete log.
- **`version`/`updatedAt` are NOT pure content-change markers**: `recordUsage()` (called on copy) bumps both (`db.ts:414-434`), and `importData()` forces `version = (s.version || 0) + 1` on every import (`db.ts:954`). A naive "updatedAt/version newer ⇒ changed" sync rule would misreport usage and re-imports as edits. This directly shapes decision D6 (Section 10).

### 5.3 Preferences (`types.ts:39-55`)
Includes two vestiges relevant to this project: `autoSyncEnabled` (default **true**, `db.ts:88`) — today it drives a **cosmetic footer status** (Section 9, M9) — and `customShortcut` (superseded by `uiShortcuts`). Preferences are mirrored write-through to `chrome.storage.local.user_preferences` on save.

### 5.4 Transactions & error handling
- `importData` and `resetToDefaultData` each wrap all three stores in a **single `readwrite` transaction** with `tx.onerror → reject` — atomic commit/abort semantics (`db.ts:913-924`, `:973-997`). This is the pattern a safe restore must reuse.
- Several getters silently swallow errors and return defaults: `getAllSnippets` → `DEFAULT_SNIPPETS` (`:220-221`), list getters → `[]` (`:281`, `:571-572`); `purgeExpiredTrash().catch(() => {})` (`:207`). Robust for UX, but a Drive feature must not copy this pattern where data-loss masking matters (fail loudly instead).
- `deleteCategory` reassignment + delete span multiple transactions (non-atomic) `[SOURCE-VERIFIED]` (`db.ts:845-867`, SettingsView flow `:433-460`) — acceptable locally; relevant as precedent for what a *restore* must NOT do.

---

## 6. Area 5 — Local backup / import / restore behavior

`exportAllData` (`db.ts:885-900`), `importData` (`db.ts:902-968`), `resetToDefaultData` (`db.ts:970-998`), UI handlers (`SettingsView.tsx:462-523`) `[SOURCE-VERIFIED]`:

1. **Format**: `BackupData v1` = `{ version: 1, exportedAt, appName: 'Snippet Organizer', snippets[], categories[], preferences }` (`types.ts:57-64`). Pretty-printed JSON, downloaded as `snippet-organizer-backup-YYYY-MM-DD.json` (SettingsView `:470-472`).
2. **Export scope excludes the Trash**: `exportAllData` uses `getAllSnippets()` (`:887`), which filters `deletedAt === null` (`:214`). Trashed snippets are **not** in local backups. A cloud snapshot must decide explicitly whether to include trash (gate D4) — silently changing this scope in the cloud path would surprise restore flows.
3. **Import validation is minimal**: UI checks only that `parsed.snippets` is an array (`SettingsView.tsx:497-499`); db checks `snippets`/`categories` arrays (`:906-908`). **No `version`/`appName`/schema/field-type validation.** Per-record coercion: category needs `id`+`name` (color defaults `#4f46e5`); snippet needs `id`+`title`; timestamps default to now; `isFavorite` boolean-coerced; `version` incremented (`:931-957`).
4. **Merge mode silently overwrites same-ID records** (`put()` per record, last-imported-wins; no `updatedAt`/`version`/content comparison) (`:946-957`). The default mode is `merge` (`SettingsView.tsx:246`). This is acceptable for today's manual local import, but it is exactly the behavior the master prompt forbids for cloud restore ("no silent destructive conflict resolution"). Restore (GD-05) needs real conflict detection — gate D5.
5. **Replace mode is atomic**: `clear()` on snippets+categories inside the same transaction as the re-put, then re-seeds the `default` category (`:926-943`). `resetToDefaultData` likewise (one tx, `:970-998`). No pre-restore safety snapshot exists — a bad import/replace irreversibly discards current data (recoverable only by the user having an external file). GD-05's "atomic restore writes + rollback/recovery" gate (D7) must add a pre-restore snapshot step.
6. Preferences are merged over `DEFAULT_PREFERENCES` when present (`:960-966`).
7. Reported counts are **file** record counts, not written counts (`:919-924`, toast `SettingsView.tsx:503`).
8. No duplicate-content detection, no scheduled/automatic local backups, no backup retention, no encryption.

---

## 7. Area 6 — Security & privacy posture (baseline before Drive)

`[SOURCE-VERIFIED]` unless noted:
- Zero network calls in `src/` (grep evidence, Section 1); zero host permissions; no remote code; no content scripts (extension pages + SW only, so the master prompt's "tokens never in content scripts" is trivially satisfiable today).
- No tokens/secrets exist in the codebase. `.gitignore` excludes `.env*` (keeps `.env.example`); the `.env.example` content is unrelated Gemini boilerplate (noise — do not repurpose).
- Console hygiene: no `console.log/info/debug` in `src/`; two `console.error(err)` on export/import failure paths (`SettingsView.tsx:479`, `:505`) and SW reason logs only. Future Drive code must never log tokens, Drive responses, or snippet contents.
- Backup JSON contains full snippet content in plaintext (by design). Uploading it to Drive means the user's snippets leave the device — the scope/location decision (D2/D3) and treating every Drive response as untrusted input are security-relevant, not cosmetic.
- `INTEGRATIONS.md` already declares the right invariants (no telemetry, no exposed credentials) — the Drive feature must preserve them and the docs must be updated to describe the new, still-narrow surface (Section 10, D9/D10).

---

## 8. Area 7 — Test & verification capability

- **No automated test framework** `[SOURCE-VERIFIED]`: no `test` script, no test runner in `package.json`, zero `*.test.*`/`*.spec.*` source files.
- Verification today = `npm run lint` (`tsc --noEmit`), `npm run build`, plus **manual runtime scenario suites** recorded per task in `docs/tasks/BACKLOG.md` (e.g., SETTINGS-BACKUP-01: valid `{snippets:[]}` import toast, non-JSON parse-error feedback, data intact after close). `compile_applet` is an AI-Studio-only tool, unavailable here `[UNKNOWN]` in this environment.
- Implication for GD-08 (gate D8): introducing a real test framework (e.g., Vitest + `fake-indexeddb` for `src/db.ts` and the future Drive domain module; component tests optional; E2E only with a real OAuth client + test Drive account — mocks do not count as verification) requires dependency additions, which need explicit user approval under the scope lock.

---

## 9. Area 8 — Canonical docs vs source: mismatch register

Historical task records (`docs/tasks/UI-DIM-*`, `UI-SPACING-*`, `UI-CLAY-03/*`, changelog entries) intentionally describe superseded eras — not defects. The items below are **current-state docs or root duplicates that contradict verified source**:

| # | Location | Claim | Verified reality | Severity for GD |
|---|---|---|---|---|
| M1 | root `README.md:3` | "fixed **712 × 512 px** popup" | 480×600 viewport, 430×550 popup (`popup.html:17-27`, `MainPopup.tsx:486`, `public/service-worker.js:29-30`) | Low (stale root duplicate; confuses agents) |
| M2 | root `PROJECT_BRIEF.md:11,17,36` | 712×512; permissions `storage, identity` | 480×600; shipping manifest has **storage only** | Medium (permissions claim is wrong for the shipped extension) |
| M3 | root `manifest.json` / root `service-worker.js` | — | Stale divergent copies (different SHA-256/sizes from `public/`) | **High** (risk of editing the wrong file in GD-02) |
| M4 | `docs/project-knowledge/README.md` §3.1 | Root `manifest.json`/`service-worker.js` listed as ACTIVE | Only `public/` copies ship (Vite public-dir copy) | **High** (same wrong-file risk) |
| M5 | `INTEGRATIONS.md:13-37,45` | Quotes root manifest as the manifest; `identity` "declared in base manifest" | Shipping manifest lacks `identity`; has icons + `toggle-organizer` command absent from the doc | **High** (GD-02 planning input) |
| M6 | `ARCHITECTURE.md:113` | preferences store `keyPath: 'key'` | `keyPath: 'id'` (`db.ts:134`) | Low (doc bug) |
| M7 | `FEATURES.md:45` | `MainPopup.tsx` maintains `w-[712px] max-w-[712px] h-[512px]` | `w-[430px] h-[550px]` (`MainPopup.tsx:486`) | Low |
| M8 | `DECISIONS.md:33` | ADR-002 record heading "Uniform 712 × 512 px Viewport" | Index row + amendments record 480×600 (Amendment 3) | Low (heading staleness inside an otherwise-updated ADR) |
| M9 | `MainPopup.tsx:651-652` → `Footer` | (behavior, not doc) footer shows `syncStatus='Synced'`, `lastSyncedText='Last synced: 2 minutes ago'` whenever `autoSyncEnabled` (default true) | **No sync exists.** This is a hardcoded cosmetic status — a false-success display | **High** (violates "no fake sync/progress"; GD-07 must replace it) |
| M10 | `docs/design/SCREEN_REGISTRY.md:27,36`; `docs/design/DESIGN_SYSTEM.md:159` | Popup "strictly fixed 712px×512px"; component map row `w-[712px] h-[512px]` | 480×600 / 430×550 (both files' other sections already say so) | Low (internal contradiction within same files) |
| M11 | repo root | `snippet-organizer-google-drive-handoff/` not copied to root | Handoff README step 1 says to copy; specs actually live in the subfolder | Low (path friction; master prompt's `tasks/` path doesn't resolve) |
| M12 | `package.json`, `metadata.json`, `.env.example` | AI Studio template remnants (`react-example`, Gemini capability, GEMINI_API_KEY) + unused deps + dual lockfiles | Not project functionality | Low (noise; cleanup candidate, needs approval) |

None of these are fixed in GD-00 (documentation-only task; several touch locked docs that need user-approved edits). Proposed disposition: fold M1/M2/M4/M5/M6/M7/M8/M10 doc corrections into a small docs-only follow-up task, and treat M3 as a hard rule for all GD tasks — **edit `public/manifest.json` and `public/service-worker.js` only**.

---

## 10. Proposed decisions & open decision gates (input for ADR-010+)

These are **proposals for user approval** — none is confirmed, and no ADR has been written to `DECISIONS.md`. Each gate names the task it blocks.

- **D1 — OAuth flow (blocks GD-02)**: propose `chrome.identity.launchWebAuthFlow` with PKCE (implicit; access token returned in the redirect fragment). Alternative `chrome.identity.getAuthToken` ties the token to the Chrome profile account with less explicit control. Requires adding `identity` to `public/manifest.json` (shipping manifest lacks it — M5).
- **D2 — Extension ID / redirect strategy (blocks GD-02)**: OAuth redirect `https://<ext-id>.chromiumapp.org/` needs a stable ID. Propose a fixed `key` in the shipping manifest for unpacked dev + Web Store ID later; the concrete ID value and Google Cloud OAuth client must come from the user (never invented or logged).
- **D3 — Scope & app-owned Drive location (blocks GD-02/GD-03)**: two least-privilege options — `drive.appdata` (hidden app folder; smallest scope; backups invisible in the user's Drive UI; recovery only through this app) vs `drive.file` (app-created files visible/manageable in Drive; per-file scope). No broad scopes under any circumstance. User picks discoverability vs invisibility.
- **D4 — Snapshot schema, naming, migration, trash inclusion (blocks GD-01)**: propose `schemaVersion: 2` superset of `BackupData v1` (v1 files must keep importing), explicit `exportedAt`/`appVersion`/`snapshotId` metadata, deterministic naming (UTC timestamp), and an explicit decision on whether trashed snippets are included (local export excludes them today — Section 6.2).
- **D5 — Identity & conflict vocabulary (blocks GD-01/GD-05)**: snippet `id` is the natural key. `version`/`updatedAt` alone are unreliable change markers (usage bumps them; import mutates `version` — Section 5.2). Propose per-record content hash for equality; conflicts (same id, different hash) are always surfaced to the user in a restore preview; **no silent overwrite** (today's local merge does overwrite silently — Section 6.4 — and must not be carried into the Drive path).
- **D6 — Sync semantics (blocks GD-06)**: given D5, a naive "newer updatedAt wins" two-way sync is unsafe. V1 should ship explicit "upload snapshot" / "restore" only; automatic background sync stays deferred (handoff BACKLOG already lists it as deferred-unless-approved). If true sync is later attempted it needs tombstone/change-detection design proof; otherwise **block/defer — never ship fake sync** (and remove today's fake footer status, M9).
- **D7 — Atomic restore & recovery (blocks GD-05)**: reuse the single-transaction pattern (Section 5.4); mandatory pre-restore local snapshot (auto-download or staged IDB copy) before any replace/delete; restore preview with explicit user confirmation.
- **D8 — Test approach (blocks GD-08)**: Vitest + `fake-indexeddb` for the data/domain layer (new dependencies require approval); real E2E only with a configured OAuth client and a test Drive account; mocks do not count as verification evidence.
- **D9 — Docs hygiene follow-up**: a small docs-only task to clear M1/M2/M4–M8/M10 (and optionally M12 noise). Can be its own task or folded into GD-08; user decides.
- **D10 — Canonical docs to update during implementation**: `INTEGRATIONS.md` (permissions/APIs), `ARCHITECTURE.md` (modules/schema/keyPath fix), `PROJECT_BRIEF.md` (capabilities), `FEATURES.md` (new features + footer fix), `DECISIONS.md` (new ADRs after approval), `docs/tasks/BACKLOG.md`, `UI_REGISTRY.md`/`SCREEN_REGISTRY.md` (Drive UI elements), `code-graph/metadata.md` (new modules), `reports/DOCUMENTATION_CHANGELOG.md` per task.

---

## 11. Proposed module map for the Drive feature (for GD-01 review)

```
src/
├── gdrive/                    # NEW domain module (no UI imports)
│   ├── types.ts               # Snapshot schema v2, Drive file metadata types
│   ├── snapshot.ts            # serialize/validate/migrate BackupData v1↔v2; content hashes
│   ├── auth.ts                # launchWebAuthFlow + PKCE; token in chrome.storage.session only
│   └── driveClient.ts         # list/upload/download app-data or drive.file items; defensive parsing
├── components/SettingsView.tsx # extend 'data' tab with "Google Drive backups" card (reuses nm-* classes,
│                              #   toast, inline-confirm, in-progress conventions — Section 4)
└── public/manifest.json        # + "identity" permission (D1); NO other permission creep
public/service-worker.js        # unchanged in v1 (no Drive logic in the SW; flows run in extension pages)
```
Boundaries: no Drive logic in React components beyond calling the module; every Drive response parsed defensively as untrusted input; no token/snippet logging; no new dependencies for v1.

---

## 12. Unknowns & blockers

- `[UNKNOWN]` Extension runtime behavior (docked/floating, real Chrome identity APIs) — no Chrome host in this environment; all window/IDB runtime claims derive from source + prior task records.
- `[UNKNOWN]` The user's eventual extension ID, Google Cloud OAuth client, and chosen Drive location — user-supplied inputs for GD-02 (D2/D3).
- `[UNKNOWN]` Whether `python3` exists on this machine (pack step) — untested; `Compress-Archive` fallback documented.
- Blocker by design: **GD-01 must not start until the user reviews this audit and rules on gates D1–D8.** Data-loss/privacy-relevant choices (snapshot scope, restore rules, sync semantics) are explicitly gated on user approval per the master prompt's stop conditions.

---

## 13. GD-00 deliverables & files changed

| File | Change |
|---|---|
| `docs/google-drive-integration/audit.md` | NEW — this audit |
| `docs/tasks/BACKLOG.md` | GD-00 row added to §1; §2 active-task note |
| `snippet-organizer-google-drive-handoff/BACKLOG.md` | GD-00 → `implemented-unverified` |
| `snippet-organizer-google-drive-handoff/tasks/active.md` | reset: no active task; GD-01 awaiting approval |
| `snippet-organizer-google-drive-handoff/tasks/completed.md` | GD-00 task record (template-conformant) |
| `reports/DOCUMENTATION_CHANGELOG.md` | GD-00 entry prepended |

No application source files changed. `docs/project-knowledge/DECISIONS.md` intentionally unchanged (proposals only — Section 10).
