# Documentation Changelog

This changelog records changes made to the codebase and engineering documentation for Snippet Organizer.
Claims are tagged per the evidence standard: `[SOURCE-VERIFIED]`, `[COMMAND-VERIFIED]`, `[RUNTIME-VERIFIED]`, `[INFERRED]`, `[UNKNOWN]`.

---

## [2026-10-20] Turn 25: OAuth production-readiness pages published on GitHub Pages

Created `docs/index.html` (app homepage), `docs/privacy.html` (privacy policy), `docs/terms.html` (terms) — static, dependency-free, responsive, accessibility-marked; content sourced exclusively from verified implementation facts (local IndexedDB `snippet-organizer` + `chrome.storage.local` keys; optional Connect flow via `chrome.identity`; single scope `drive.appdata`; `appDataFolder`-limited snapshot create/list/restore/delete; no backend/analytics/third parties; Limited Use statement). No client_id, secrets, or fabricated legal/jurisdictional data on the pages (ToS §10 explicitly flags owner input pending; contact = GitHub issues/profile). Scope classification confirmed against live official docs: `drive.appdata` is a restricted scope; verification is required for production unless an exception (personal use / Testing publishing status) applies; security assessment applies only to server-side access (N/A — extension is client-only); privacy policy must share the homepage domain (satisfied on `mdnooor.github.io`); Google recommends an owned custom domain over shared hosts. GitHub Pages enabled from `main` `/docs` via API; extension source, manifest identity (`kkfbhahpkhjadmiijcpfinlengmgiipn`), OAuth client, scopes, and release v0.1.0 asset untouched.

---

## [2026-10-20] Turn 24: stable extension identity — manifest `key` pinned (ID `kkfbhahpkhjadmiijcpfinlengmgiipn`)

Evidence: unpacked-extension IDs are install-path hashes — both Chrome-recorded installs of the release ZIP (`napaoifgfbgjechcnjkabilgbomogobi` in Profile 6, `nephfgcdhhfcjocfbbplbjlecpkjlali` in Default) were recomputed exactly as SHA256(UTF-16LE path)→hex→a–p, with per-install random `UnpackedExtensions\…_<n>` folders and `keyInManifest=false`; no `.pem`/`.crx` exists anywhere → the old IDs are mathematically unrecoverable as manifest keys. Fix (user-authorized): RSA-2048 keypair generated **outside the repo** (`%USERPROFILE%\chrome-identity\snippet-organizer.pem`); public SPKI pinned as `manifest.json:key` → permanent ID `kkfbhahpkhjadmiijcpfinlengmgiipn` (key→ID recomputation verified on the built artifact; OAuth client_id/scopes/permissions byte-unchanged; battery 155/155, lint 0, build 0; private key absence in ZIP/manifest scanned). Release `v0.1.0` asset replaced in place (single asset, same filename, 14 runtime entries incl. 1024px logo, demo chunk excluded; download verified 200 @ 1,150,272 bytes). Docs aligned: KNOWN_LIMITATIONS #1 resolved, CONFIGURATION, BUILD_AND_RELEASE, README status. **Pending user action: authorize the new ID in the Google Cloud Console OAuth client; then remove old unpacked copies and reload the new ZIP.**

---

## [2026-10-20] Turn 23: hotfix — restored `icons/icon-master-1024.png` in Release v0.1.0 ZIP

Root cause: turn 22 packaging checked manifest/HTML references but missed the TSX runtime reference — `src/components/Header.tsx:40` renders `icons/icon-master-1024.png` in the app header, so the installed extension's header logo was missing. No code/manifest change required; the ZIP (built from the same verified `dist/`) now includes the original 984,700-byte PNG (verified 1024×1024 inside the archive). Corrected ZIP = 14 entries, 1,149,919 bytes; secret scan clean; `*.zip` ignore untouched. Release `v0.1.0` asset replaced in place (asset 657507077 deleted, corrected uploaded under the identical filename — no duplicate, no other asset touched); download re-verified unauthenticated HTTP 200 @ 1,149,919 bytes; README links unchanged and still valid. Chrome runtime verification remains owner-owned.

---

## [2026-10-20] Turn 22: packaged installable ZIP as GitHub Release v0.1.0 + README install section

Fresh clean build → `snippet-organizer-chrome-extension.zip` (13 runtime-only entries: manifest at root, popup/settings/service-worker, 4 icons, 5 bundled JS/CSS chunks — import graph verified closed; excluded `index.html` web demo, `main-*.js` demo chunk, `icons/README.txt`; no sourcemaps/secrets; manifest JSON valid, all references resolved). Published as asset of **GitHub Release `v0.1.0`** (user-authorized; repository had no prior release/tag) — download verified unauthenticated HTTP 200 (164,786 bytes). README: new `## Install the Chrome Extension` section (verified download URLs, extract→Load-unpacked flow, update flow, extracted-folder-not-ZIP note); source-build section retained as alternative. `*.zip` ignore rule untouched — ZIP not committed to the source tree. Battery 155/155, lint 0, build 0 re-verified this turn; only `README.md` + this changelog committed (`373aa5a` → `cdd1d4b` → changelog commit).

---

## [2026-10-20] Turn 21: GitHub repository preparation & first push

Landing-page `README.md` rewrite (implemented features only; GD-06 stated deferred; verified links/commands), `.gitignore` extension (legacy `*-1.*`, `200`/`350`, `metadata.json`, `bun.lock`, `snippet-organizer-document/`, `*.zip` — all kept on disk, excluded from repo), full validation (155/155, lint 0, build 0, dist runtime files verified, 167 links/0 broken), repo initialized (`main`), staged-set secret scan clean, **pushed to `https://github.com/mdnooor/Snippet-Organizer.git` `main` as `cdda954`** (user-approved force-replace of the older plain-JS snapshot `8d7aa96`; details in `reports/GITHUB_REPOSITORY_PREPARATION.md`). No `src/` changes. PAT never stored in repo/files/remote URL.

---

## [2026-10-20] Version 1 documentation & architecture audit (turn 20)

Documentation-only audit for the V1 feature-complete baseline: 24 new `docs/` documents (index, product/architecture/codebase/code-graph/data/persistence/Drive/auth/backup/UI/testing/build/security/configuration/baseline/limits/debt/roadmap/glossary/changelog-pointer), 6 Mermaid diagrams (`docs/diagrams/`), generated inventories via new `scripts/generate-doc-inventory.mjs` (Node fs only — 157 files / 41 source files / 15,817 lines / 21 deps), 8 `reports/` audit documents, root `README.md` corrected (stale 712×512 → locked 480×600, ADR-002 Am. 3) + `AGENTS.md` V1 addendum. Existing canonical docs (`project-knowledge/`, `design/`, `google-drive-integration/`, `tasks/`) and all historical GD/PR reports preserved and indexed (`reports/README.md`). Validation `[COMMAND-VERIFIED]`: battery **155/155**, lint 0, `vite build` 0 (624 ms), `node scripts/generate-doc-inventory.mjs` exit 0, **153 relative markdown links / 0 broken**, one `flowchart` per `.mmd`; packaging via documented PowerShell workaround (17 forward-slash entries, manifest byte-identical) — `npm run build` pack step fails on this machine for missing `python3` (environment, recorded). **`src/`, `public/`, `tests/` untouched by this audit** (timestamp-verified). No commit/push performed.

---

## [2026-10-20] Turn 19: footer brand mark corrected to the official Google Drive logo

The turn-17 footer used the generic Google "G" as the connection indicator — inaccurate for a Drive-only integration. New `src/components/GoogleDriveLogo.tsx` renders the official Google Drive triangular logo (canonical 2020 tricolor geometry, viewBox 0 0 87.3 78, six paths in the official brand colors #0066DA/#00AC47/#EA4335/#00832D/#2684FC/#FFBA00) as an inline SVG — no repo asset existed, no dependency, no runtime request, `aria-hidden` (the surrounding `role="status"` label carries the accessible meaning). `GoogleLogo.tsx` deleted (its only consumer was the Footer); Footer usages swapped (connected = static logo, checking = pulse, disconnected = neutral dot); size kept at 14px height with a 15px width matching the Drive mark's 87.3:78 aspect so nothing stretches. No connection logic, permissions, manifest, labels, tooltips, or layout changes.

Verification `[COMMAND-VERIFIED]`: battery **155/155**, lint 0, `vite build` 0 (856 ms), zip 17 forward-slash entries; dist markers: all five Drive-only brand colors + `87.3` viewBox present, old G-only `4285F4` absent, both footer labels intact, `gdriveUserDisconnected` untouched. In-Chrome inspection remains user-owned `[UNKNOWN]`.

---

## [2026-10-19] Turn 18: two reported-defect fixes (All Category dropdown scrollbar + connection-independent refresh feedback)

### Root causes `[SOURCE-VERIFIED]`
1. **Dropdown classic scrollbar**: the `no-scrollbar` class carried by the All Category dropdown panel (and previously the tab strip, editor toolbars) was **never defined in any stylesheet** — a no-op since introduction — so those `overflow-y-auto`/`overflow-x-auto` elements always showed the browser's classic scrollbar. The dropdown is portal-rendered but into the SAME document that imports the shared `index.css`, so no scope problem existed — the container simply never opted in. Fix: `SearchAndFilters.tsx` dropdown panel `no-scrollbar` → `nm-scrollbar` (10 applied containers; stale comments corrected; the two editor-toolbar `no-scrollbar` rows are a separate unreported surface, left per locked scope).
2. **"Refresh behaves differently when disconnected"**: data path was verified CORRECT (filter effect re-derives from `snippets/categoriesMap/preferences` set by `loadData`; button rendered unconditionally; orchestrator already concurrent). The real defect: while disconnected the probe is instant (intent flag ⇒ zero work) and IndexedDB reads take milliseconds — the whole refresh settled in tens of ms, so the spinner was imperceptible, unlike the connected case where the probe's real network call made it visible. Fix (prompt-sanctioned pattern): connection-state-independent **minimum visual duration** (`minDurationMs`, default 450 ms) in the orchestrator — data still applies the moment `loadData` resolves; only the end of the feedback waits out the floor.

### Verification `[COMMAND-VERIFIED]`
Battery **155/155** (popup-refresh 8: +2 TURN-18 regressions — near-instant refresh still shows a ≥floor spinner window while the real IndexedDB read runs; floor never delays data application; single-flight/hung-probe suites updated paths all green), lint 0, `vite build` 0 (485 ms), zip 17 forward-slash entries; dist markers: `nm-dropdown-panel nm-scrollbar` on the same element, `450` floor in bundle, `gdriveUserDisconnected` intact. In-Chrome checks remain user-owned `[UNKNOWN]`.

---

## [2026-10-19] Turn 17: four locked UI/functionality improvements (tab scrollbar, refresh independence, shortcuts vertical layout, footer Google logo)

### Summary
1. **THIN-SCROLL-01 extension**: the Main Popup's horizontally scrollable filter/category tab row (`role="tablist"`) now uses the shared `.nm-scrollbar` (it used the intentionally hidden `no-scrollbar` — the last inconsistent scroll container). 9 applied containers total. The category dropdown portal keeps its `no-scrollbar` (separate container, out of scope).
2. **POPUP-REFRESH-01 hardening**: the refresh orchestrator (`src/popupRefresh.ts`) now runs the local IndexedDB reload and the silent Drive probe **concurrently via `Promise.allSettled`** — a slow/hung Drive check can no longer delay the local reload or hold the button hostage; first failure wins the error funnel, `onEnd` always fires, single-flight unchanged. `runPopupProbe` now marks `checking` at the start of every real check (mount + Refresh), giving the footer a truthful activity state. Source-verified: the button itself was ALWAYS rendered unconditionally (never tied to drive status) — the reported "disappears when disconnected" matches the sequential-era long-spinner/disable behavior, which concurrency removes; no conditional rendering existed to fix.
3. **SHORTCUTS-VERTICAL-01**: every Settings → Shortcuts row (5 default-reference rows, 3 rebindable rows, 2 informational rows, reset footer row) now stacks vertically — title → description → wrap-friendly key badges → (rebindable rows) Change/Cancel button inside its section. Root cause was `justify-between` horizontal rows whose `shrink-0` badge+button groups squeezed long descriptions to ~zero width. No behavior change (capture/persist/reset logic untouched).
4. **GOOGLE-LOGO-01**: new `src/components/GoogleLogo.tsx` (official four-color "G" inline SVG — repo had no Google asset; smallest safe static-vector addition, no dependency, no runtime request). Footer: connected → static G + unchanged "Google Drive connected" label; checking (REAL probe in flight) → G with subtle pulse (`motion-reduce` frozen); not-connected → previous neutral dot (no false Google implication). No sync claims, no polling — GD-06/GD-07 intact.

### Verification `[COMMAND-VERIFIED]`
Battery **153/153** (popup-refresh extended to 6: concurrent start + hung-probe independence test; single-flight test updated for concurrent contract), lint 0, `vite build` 0 (727 ms), zip 17 forward-slash entries + root manifest byte-identical; dist markers: all four Google brand colors + both footer labels + `allSettled` + `gdriveUserDisconnected` present. TSX rendering (button visibility across states, layout) remains source+marker-verified only `[UNKNOWN]` in Chrome.

---

## [2026-10-19] POPUP-REFRESH-01 + THIN-SCROLL-01 (turn 16): red-themed global scrollbar + refresh animation feedback

### Summary
Refinement of the two approved UI improvements, per follow-up spec. (1) `.nm-scrollbar` thumb is now **brand-red and token-based**: new `:root` tokens `--red-scrollbar-thumb: rgba(208,2,5,0.38)` / `-hover: 0.62` (derived from the locked `--red-brand`) replace the slate values; the shared definition already lives in the common `src/index.css` imported by BOTH entry points, so the previously missing **Settings** styling was purely a per-container opt-in gap — fixed by adding the class to SettingsView's four scroll containers (sidebar, tab content, snapshot list, restore-conflicts list). Now 8 containers across Main Popup, Edit Snippet and Settings. (2) Refresh feedback polished: list content region gets a subtle opacity fade (`opacity-60`, 200ms, opacity-only — no layout shift/flicker, state and scroll preserved) + `aria-busy` during a refresh; the spinning `RefreshCw` tints to the brand accent `#9f0409`; under `prefers-reduced-motion` the global rule freezes the spin leaving a static red icon + disabled button + faded aria-busy region as the non-animated indicator. Drive safety unchanged (orchestrator + probe untouched; `gdriveUserDisconnected` only read).

### Verification `[COMMAND-VERIFIED]`
Battery **152/152** (unchanged orchestrator suite 5/5; no new unit-testable logic — CSS/state-only changes), lint 0, `vite build` 0 (489 ms), zip 17 forward-slash entries + root manifest byte-identical; dist markers: `--red-scrollbar-thumb` in CSS, old slate thumb values gone, 8× `nm-scrollbar` in source (MainPopup 1, SettingsView 4, editor 2, preview 1), `Refresh popup` + `gdriveUserDisconnected` in JS. DESIGN_SYSTEM.md §4/§5 updated (scrollbar tokens + component rows — closes the turn-15 doc gap). In-Chrome visuals remain user-owned `[UNKNOWN]`.

---

## [2026-10-19] POPUP-REFRESH-01 + THIN-SCROLL-01: popup Refresh button & thin minimal scrollbar

### Summary
Two approved UI improvements only. (1) A Refresh button now sits immediately right of the search field in the popup: it re-reads snippets/categories/preferences via the existing `loadData()` (with a monotonic epoch so a stale load can never overwrite newer state) and re-runs the silent Drive probe — single-flight, spinner with reduced-motion respect, toast on failure, state always recovers. Drive safety by construction: Refresh only READS the persisted `gdriveUserDisconnected` intent (via the probe) — it never clears it, never prompts (non-interactive probe only), never mutates/uploads/deletes snapshots. (2) The classic scrollbar on the popup's scroll containers is replaced by a thin minimal `.nm-scrollbar` utility (standards-based `scrollbar-width`/`scrollbar-color` + narrowly scoped WebKit fallback; 6px neutral slate thumb, transparent track, hover emphasis) applied to the snippet list and the in-popup editor/preview modal scrolls — NOT globally; `no-scrollbar` rows and the separate settings page are untouched.

### Key changes `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- `src/popupRefresh.ts` (new) — framework-free refresh orchestrator (single-flight, always-recovering begin/end, error funnel) so the behavior is unit-testable with node:test (no React test framework added).
- `src/components/MainPopup.tsx` — probe extracted into a reusable `runPopupProbe` (mount + refresh); `loadData` epoch guard; refresh wiring.
- `src/components/SearchAndFilters.tsx` — search row is now flex: field `flex-1` (~87% of former width) + compact square `nm-press`/`nm-icon-btn` button with `RefreshCw` (18px), `title`/`aria-label` "Refresh popup", focus-visible ring, disabled+`aria-busy` while running.
- `src/index.css` — `.nm-scrollbar` utility (THIN-SCROLL-01); applied to `MainPopup` list, `SnippetEditorModal` (2 containers), `SnippetPreviewModal` (1). No new dependencies; no GD-06/§17 work; header/pin/plus/settings/close, search semantics, and Drive logic untouched.
- `tests/popup-refresh.test.ts` (new, 5 tests): single-run, single-flight duplicate no-op, loadData-failure recovery (probe still runs), probe-failure recovery, composition safety (exactly one loadData + one probe per attempt — nothing else reachable).

### Verification
Battery **152/152** (connection 19, auth 22, contract 27, backup 28, browse 23, restore 28, popup-refresh 5), lint 0, `vite build` 0, zip verified (17 forward-slash entries, root manifest byte-identical; dist markers: RefreshCw + "Refresh popup" in JS, `nm-scrollbar` + `scrollbar-width` in CSS, `gdriveUserDisconnected` still present). In-Chrome visuals/interaction remain user-owned `[UNKNOWN]`.

---

## [2026-10-19] PR-1c: Disconnect intent gates ALL Drive operations (Browse Drive inconsistency fix)

### Summary
User-reported: after Disconnect (PR-1b working — UI stayed disconnected across reopen), clicking Browse Drive still showed the saved backup while email stayed hidden. Root cause `[SOURCE-VERIFIED]`: the browse path (`snapshotStore.withAuthorizedClient`) never consulted `gdriveUserDisconnected`; its interactive `authorize` resolves SILENTLY (a prompt is only needed for consent/account selection), so Chrome re-minted a token from the still-valid OAuth grant — the displayed listing was a **LIVE Drive response, not cached data** (no Drive listing cache exists; the UI list is in-memory component state only).

### Key changes `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- `src/gdrive/snapshotStore.ts` — `withAuthorizedClient` checks the intent BEFORE any token lookup: browse/download/delete/restore-download return typed `user-disconnected` failures with ZERO auth/network calls; `ServiceFailure` gained the `user-disconnected` member; `DriveServiceDeps.connectionIntent` (defaults to the chrome adapter; read failure ⇒ proceeds, probe parity). Disconnect can therefore never issue `files.delete`.
- `src/gdrive/backup.ts` — orchestrator `run()` checks the intent at step 0: Create returns `failed{reason:'user-disconnected'}` with zero auth/reads/uploads.
- `src/components/SettingsView.tsx` — service + backup get the same intent store (one policy seam, no separate auth path); new distinguishable `disconnected` list phase with its own message + "Connect to browse again" note (never an empty list, never a generic error); Disconnect clears the in-memory listing so stale entries can't masquerade as live data; `describeDriveError` case added.
- Tests +6: browse suite 19→**23** (flag blocks listing with zero auth+requests; delete/download gated — disconnect never deletes; clearing intent allows live listing; store-read failure proceeds), backup suite 26→**28** (creation gated with zero auth/reads/network; clearing intent allows creation). Battery **147/147**, lint 0, vite build 0, zip verified (17 forward-slash entries, root manifest byte-identical, dist==src manifest, marker in dist chunk `src-CfAgpCci.js`). No new deps; no scope/permission change; no GD-06/§17 work.

### Verification
All locally executable checks green (above). In-Chrome browse-while-disconnected behavior remains agent-unverifiable — manual steps in `reports/PR1-production-readiness-report.md` §9 `[UNKNOWN]`.

---

## [2026-10-19] PR-1b: Persistent User-Requested Disconnect (silent-reconnect fix)

### Summary
User-reported: after Disconnect, closing and reopening the popup showed Connected again. Root cause `[SOURCE-VERIFIED]`: Disconnect only evicted Chrome's LOCAL token cache (`signOut` → `removeCachedAuthToken`) and cleared in-memory UI state — but the OAuth **grant** stays valid at Google, so the next `getAuthToken({interactive:false})` silently mints a FRESH token and PR-1's startup probe honestly reported "connected". Removing a cached token can never persist a disconnect. Fix: a persisted user-intent flag (`chrome.storage.local` key `gdriveUserDisconnected`) that the probe checks BEFORE any token lookup or network call; only an explicit Connect click clears it. True server-side revocation remains a Google Account action (oauth-contract §5; Chrome's identity API has no grant revocation).

### Key changes `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- `src/gdrive/connection.ts` — `ConnectionIntentStore` seam + `createChromeConnectionIntentStore()` (guarded callback-style `chrome.storage.local`; missing/broken API degrades to false without throwing); probe step 1.5: flag true ⇒ `disconnected{reason:'user-requested'}` with ZERO auth/network calls — a cached or freshly minted token cannot override it; storage read failure ⇒ treated as not-disconnected (probe proceeds).
- `src/components/SettingsView.tsx` — Disconnect persists the flag FIRST (survives popup close/reopen even if token-cache eviction fails), then `signOut()`; note "You disconnected Google Drive. Click Connect to reconnect."; Connect clears the flag BEFORE the interactive authorize — explicit reconnection is the only path that may clear it.
- `tests/gdrive-connection.test.ts` +5 (14→19): flag beats valid token (zero auth/network calls), fresh-probe reopen simulation, Connect-clears-intent contract, storage-read-failure proceeds, chrome-store roundtrip + missing/broken-API degradation.
- Docs: ARCHITECTURE §8, oauth-contract §9, BACKLOG rows, handoff records. No new dependencies; no scope/permission change; no GD-06/§17 work; identity/avatar/footer/backup/restore behavior untouched.

### Verification
Suites: connection **19/19**, auth 22, contract 27, backup 26, browse 19, restore 28 — **141/141, fail 0**; lint 0; `vite build` 0; zip rebuilt (17 forward-slash entries, root `manifest.json` byte-identical to source; dist manifest == source; fix marker `gdriveUserDisconnected` present in dist chunk `src-BjuS1HR5.js`). In-Chrome reopen behavior remains agent-unverifiable — manual steps in `reports/PR1-production-readiness-report.md` §8 `[UNKNOWN]`.

---

## [2026-10-19] PR-1: Production Readiness Phase 1 — Startup Connection State, Account Identity & Precise Drive Errors

### Summary
With the user's own Cloud configuration now live (real Chrome-extension OAuth client ID, Drive API, self as Test user — USER-ATTESTED auth + snapshot create/list), PR-1 fixed the three production-readiness gaps: (1) after an app restart the Settings row showed `Connect` although Chrome's token cache still held a valid grant — a silent startup probe (`src/gdrive/connection.ts`) now verifies the REAL state (config → non-interactive `getAuthToken` → Drive `about.get`) and the UI reports `checking`/`connected`/`disconnected`/`connection-error` truthfully; (2) the connected account's identity (email + https avatar with initial-fallback) is shown via `about.get` — **docs-verified: `drive.appdata` is an accepted `about.get` scope, so NO new OAuth scope/permission was added** — and is cleared on Disconnect, never persisted; (3) Drive's 403 error reasons are now parsed (`error.errors[].reason` / `error.details[].reason`), rate-limit-family 403s map to `rate-limited` instead of a false "permissions" message, and reason-specific guidance covers `insufficientPermissions`/`serviceDisabled`. The popup footer gained a REAL-state "Google Drive connected / not connected" indicator (still zero sync claims — GD-06/GD-07 hold).

### Key changes `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- NEW `src/gdrive/connection.ts` — `createConnectionProbe` + typed `DriveConnectionState`/`DriveAccountIdentity`; silent-only (never prompts), one silent 401 retry after cache clear, still-401 ⇒ honest `disconnected`; no logging; identity in-memory only.
- `src/gdrive/driveClient.ts` — exported `reasonFrom` + `DRIVE_RATE_LIMIT_403_REASONS`; `reason` attached to unauthorized/forbidden/rate-limited/not-found failures; extended mapper promotes 403 rate-limit reasons; `messageFrom` falls back to reason-bearing text.
- `src/gdrive/snapshotStore.ts` — `ServiceFailure` carries optional `reason`; `src/gdrive/backup.ts` — forbidden failures surface Drive's reason in the user message.
- `src/components/SettingsView.tsx` — mount probe (silent), `checking` state, identity row (avatar/initial + email, cleared on Disconnect), reason-aware `describeDriveError`; Connect re-probes silently; comment updated from the outdated GD-07 session-truth contract.
- `src/components/Footer.tsx` + `src/components/MainPopup.tsx` — optional `driveStatus` prop renders the silent-probe-backed indicator (`role="status"`); comment updated honestly (connection truth ≠ sync claims).
- Tests: NEW `tests/gdrive-connection.test.ts` (14: never-prompt, restart-connected, denied/interaction-required/error, 401 retry semantics ×3, precise 403s, offline, unknown-reason/5xx, identity hygiene); `tests/gdrive-backup.test.ts` +4 reason tests (upload 403 reason attached; list 403 rate-limit → rate-limited; insufficientPermissions stays forbidden; reason-less fallback).
- Packaging fix: `Compress-Archive` wrote backslash entry names (`assets\…`) and stale duplicates (35 entries) — rebuilt the zip via .NET `ZipArchive` with forward-slash names (17 entries; root `manifest.json` byte-identical to source verified).
- Docs: `docs/google-drive-integration/oauth-contract.md` (§8 connection module + §9 PR-1 update: user-configured state, about.get scope justification, checklist status), `docs/project-knowledge/ARCHITECTURE.md` §8 (module map + UI surface + verification 118→136).
- No backup/restore behavior, snapshot schema, conflict, checkpoint, or local-data changes; no new dependencies; no manifest permission/scope changes.

### Verification
`npx.cmd tsx` suites: connection 14/14, auth 22/22, contract 27/27, backup 26/26, browse 19/19, restore 28/28 — **136/136, fail 0**; `npm.cmd run lint` exit 0; `npx.cmd vite build` exit 0; `npm.cmd run build` exit 1 (pack step's absent `python3` — pre-existing documented limit); dist `manifest.json` == source (real client ID present, well-formed, masked in reports; scopes exactly `drive.appdata`; permissions `storage,identity`); zip root `manifest.json` verified. In-Chrome restart/identity/error rendering NOT agent-verified — manual checklist in `reports/PR1-production-readiness-report.md` `[UNKNOWN]`. Report: `reports/PR1-production-readiness-report.md`.

---

## [2026-10-18] GD-08: Google Drive Backup — Test Hardening, Documentation & Final Handoff

### Summary
Executed GD-08 (verification/security/docs only). Local verification battery green — lint 0, `vite build` 0 (+ documented pack fallback; `npm run build`'s pack step alone fails on the absent `python3`, a pre-existing documented environment limit), 118/118 unit assertions across the five Drive suites. One non-duplicate hardening test added (auth-controller surface + disconnect safety). Canonical docs updated so they finally describe the shipped Drive feature; live OAuth/Drive E2E honestly remains `NOT RUN — blocked` on user-owned setup. GD-06 stays `blocked`; no sync work anywhere.

### Key changes `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- `tests/gdrive-auth.test.ts`: +1 GD-08 test (21→22, suite 22/22 green) — pins the controller's public surface to the five auth members (any future Drive/network-capable member fails CI), asserts `signOut` makes zero `getAuthToken` calls, and asserts the `AuthDeps` seam exposes no HTTP capability → disconnect structurally cannot touch cloud files.
- `docs/project-knowledge/ARCHITECTURE.md`: new §8 "Google Drive Backup Architecture" — module map (`auth/snapshot/conflict/gather/driveClient/backup/snapshotStore/restore` + UI surface), data flow, and honest verification status (Drive coverage was previously absent from all canonical project docs).
- `docs/project-knowledge/PROJECT_BRIEF.md`: in-scope capability #9 (optional Drive backup, no-sync boundary, GD-06 blocked rationale) and §4 limitation "Drive backup remains pre-production" (placeholder client ID, no pinned `key`, no live verification).
- `docs/project-knowledge/FEATURES.md`: §9 extended with the Google Drive Snapshots feature (connection row, Create/Save/Restore/Delete, no-sync statement, canonical-contract pointers).
- `docs/google-drive-integration/oauth-contract.md`: new §9 — evidence-level table (UNIT TESTED / BUILD VERIFIED vs NOT-RUN-blocked live items), the 6-step user-owned publisher checklist, and known limits.
- No application source, contract, or manifest changes; no documentation duplicates introduced.

### Verification
`npm.cmd run lint` exit 0; `npx.cmd vite build` exit 0; suites restore 28, browse 19, backup 22, contract 27, auth 22 — all fail 0 `[COMMAND-VERIFIED]`. Live OAuth/Drive E2E: NOT RUN — blocked (no Chrome runtime, no user-owned Cloud config) `[UNKNOWN]`. Report: `reports/GD-08-completion-report.md`.

---

## [2026-10-18] GD-07: Google Drive Backup — Settings UI, Accessibility & Cleanup

### Summary
Executed GD-07 per the handoff spec (Settings → Backup & Data only, minimal changes, locked design preserved). The fabricated sync status surfaced by GD-06 was removed outright — no fabricated timestamps, fake progress, or unsupported indicators were introduced — and the Drive card's information architecture was completed with a truthful connection row and the first UI for the GD-03 create-backup orchestrator. GD-06 remains `blocked`: nothing advertises synchronization.

### Key changes `[SOURCE-VERIFIED]`
- Misleading sync removal: `src/components/Footer.tsx` is attribution-only (the cloud/"Synced"/"Last synced: 2 minutes ago" block deleted); `src/components/MainPopup.tsx` passes no sync props; the Settings "Auto-Sync Indicator" toggle (which displayed those fake claims) removed. The stored `autoSyncEnabled` preference field is kept solely for snapshot/import format compatibility (D4) but drives nothing.
- Drive card IA: connection row with session-derived truthful status (setup-needed / disconnected / connected — never assumed), Connect (interactive authorize → toast + list refresh), Disconnect (`signOut`; clears the token cache only, cloud data untouched); Create cloud backup block wiring `createCloudBackup` for the first time (optional name, contents explanation, single busy slot disables duplicate submissions, typed failures surfaced verbatim including the ambiguous-attempt reconciliation note, success toast with active/trashed/category counts + list refresh).
- Accessibility: `aria-label`s on the icon-only per-row Restore/Delete buttons, `role="status" aria-live="polite"` on the Settings toast banner, labeled dismiss button, `aria-hidden` decorative icons; existing focus-visible rings and reduced-motion conventions reused — no design-system values changed (ADR-009).

### Verification & gaps
`npm.cmd run lint` (tsc --noEmit) exit 0; zero-diff regression suites green: GD-05 28/28, GD-04 19/19, GD-03 22/22, GD-01 27/27, GD-02 21/21 `[COMMAND-VERIFIED]`. No new node-testable logic was introduced (all changes are React component code) and no browser/React harness exists in this repo — real popup rendering, keyboard navigation, focus management, screen-reader behavior, and live OAuth/Drive flows remain unverified `[UNKNOWN]` (GD-02 user-owned Cloud config gate; GD-08 E2E). Report: `reports/GD-07-completion-report.md`.

---

## [2026-10-18] GD-06: Google Drive Backup — Explicit Sync & Sync Conflicts (BLOCKED)

### Summary
GD-06 evaluated against its own feasibility gate and closed **blocked**: safe synchronization is not supported by the current data model, so no sync implementation and no sync UI were shipped (the spec and handoff gate both mandate exactly this outcome: "do not ship snapshot upload disguised as sync"; "UI calls it sync only if real sync exists"). The existing safe primitives — GD-03 additive upload, GD-04 validated download, GD-05 checkpointed merge/restore — remain the truthful v1 sync scope per D6/ADR-011. Zero source changes.

### Key findings `[SOURCE-VERIFIED]`
- Edit detection IS feasible (stable `id` + GD-01 deterministic content hash); rollback IS feasible (GD-05 checkpoint + atomic executor).
- Cross-device deletion detection is NOT feasible: tombstones permanently purged after 72 h (`db.ts` `TRASH_RETENTION_MS`/`purgeExpiredTrash`, ADR-007) ⇒ "missing record" is ambiguous; contract §8 forbids missing⇒deletion.
- Change ordering NOT feasible: `updatedAt`/`version` bump without edits (favorite toggle, `recordUsage`, import); spec forbids clock-based winners.
- No change-log/sync state exists; the visible "Last synced: 2 minutes ago" footer is fake (`MainPopup.tsx:652`; its removal is GD-07 scope per contract §9).
- Formal dependency gap: spec requires GD-01/02/05 `verified`; all are `implemented-unverified` (GD-02 user-owned Cloud config gate).

### Documentation changes
- `docs/google-drive-integration/data-contract.md` (NEW §17 addendum: verdict + PROPOSED un-blocking requirements — app-level change-log store, deletion-semantics decision, direction/source-of-truth, sync metadata, verified baseline — explicitly awaiting user approval per ADR-011); `docs/tasks/BACKLOG.md` (BLOCKED row + note); handoff `BACKLOG.md` (GD-06 → `blocked` + Records entry) + `tasks/active.md` + `tasks/completed.md`; NEW `reports/GD-06-completion-report.md`. No test file added (nothing implemented — tests only cover implemented behavior); zero-diff regression green: GD-05 28/28, GD-04 19/19, GD-03 22/22, GD-01 27/27, GD-02 21/21, lint 0 `[COMMAND-VERIFIED]`.

---

## [2026-10-18] GD-05: Google Drive Backup — Restore Preview & Conflict Resolution

### Summary
Executed GD-05 per the handoff spec (Merge/Replace semantics, safety checkpoint, validation before mutation, no silent partial restore). Delivered a read-only restore preview over validated cloud snapshots, explicit per-conflict resolution (keep-local default / take-incoming / keep-both with deterministic re-id) for Merge, contract-faithful Replace, a mandatory verified pre-restore safety checkpoint (hard gate for ALL writes, D7), and single-transaction execution with post-write count verification. Closed decisions unchanged; local export/import untouched; no background anything (D6).

### Key artifacts `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- NEW `src/gdrive/restore.ts`: `previewRestoreFromParsed` (read-only; not-usable gating for parse-error/invalid/unsupported-version), `buildMergePlan` (GD-01 `applyResolutions`; keep-local default; tombstone-restoring take-incoming; keep-both deterministic re-id), `buildReplacePlan` (entire validated snapshot; missing-category→`default` fallbacks), `buildRestoreCheckpoint` (trash-inclusive local export verified through `parseCloudSnapshot` — v1 migrates, integrity+size enforced), `executeRestore` (checkpoint gate → ONE atomic tx → post-write verification; `checkpoint-unavailable`/`write-failed`/`verification-failed` typed results), `planRestoreExpectations` (computed before writes).
- `src/db.ts`: NEW `readAllLocalStateForRestore` (trash-inclusive) + `applyRestoreWritePlan` (single readwrite tx mirroring `importData`/`resetToDefaultData`; replace clears snippets+categories, NEVER preferences; verbatim snapshot writes; abort = full rollback).
- `src/components/SettingsView.tsx`: per-row Restore (Upload icon) → read-only preview panel (count chips, per-conflict Keep local/Use backup/Keep both, duplicate-name note, prefs opt-in, Replace requires explicit "rewrites my entire library" checkbox, Cancel writes nothing, honest failure messages); success = toast + library reload.
- Tests: NEW `tests/gdrive-restore.test.ts` 28/28 (`npx.cmd tsx`) — preview classification, every resolution choice, tombstones, malformed/corrupt/v1/v2/unsupported snapshots, checkpoint success/failure gating, injected write failure rollback, verification failure, cancellation purity, category integrity; regression GD-04 19/19, GD-03 22/22, GD-01 27/27, GD-02 21/21; lint exit 0. UI runtime + real IndexedDB tx + live Drive NOT exercised `[UNKNOWN]` (no React/IndexedDB harness; GD-02 config gate; GD-08 E2E).

### Documentation changes
- `docs/google-drive-integration/data-contract.md` (§16 GD-05 addendum: flow ordering, checkpoint verification via the parse contract, single-tx executor, Replace semantics + expectation math, UI contract); `docs/tasks/BACKLOG.md`; handoff `BACKLOG.md` + `tasks/active.md` + `tasks/completed.md`; NEW `reports/GD-05-completion-report.md`.

---

## [2026-10-18] GD-04: Google Drive Backup — Browse, Download & Manage Cloud Snapshots

### Summary
Executed GD-04 per the handoff spec (which explicitly includes deliberate cloud deletion with named confirmation). Delivered paginated metadata-first browsing over `appDataFolder`, download validated through the GD-01 parser before being presentable as usable (raw fallback for incompatible files), and permanent cloud-only deletion that never touches local data — surfaced in a new Settings → Backup & Data "Google Drive Snapshots" card. Closed decisions unchanged; no background anything (D6).

### Key artifacts `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- Drive endpoints verified live 2026-10-18: `GET /drive/v3/files/{fileId}?alt=media` (content in response body); `DELETE /drive/v3/files/{fileId}` (**permanent, no trash**); `files.list` pagination (`pageToken`/`nextPageToken`).
- `src/gdrive/driveClient.ts`: pagination support; NEW `downloadSnapshotFile` + `deleteFile`; taxonomy gains `not-found` (404) and `rate-limited` (429).
- NEW `src/gdrive/snapshotStore.ts` (`createDriveService`): hydration from `appProperties` (+ NEW `displayName` property on uploads), newest-first sort (createdAt → createdTime → driveFileId tie-break), page cap 20×100 (documented), validation-gated download with raw preservation, shared 401 clear-cache + silent re-auth + retry-once, typed results throughout.
- `src/components/SettingsView.tsx`: Drive Snapshots card — idle/loading/empty/error/retry states, per-row metadata (name, local time, size, v2/unverified badge, backupId), blob+anchor Save (token-free), in-row Delete confirmation naming the snapshot, permanent-deletion copy.
- Contract addendum §15 in `docs/google-drive-integration/data-contract.md`.
- Tests: NEW `tests/gdrive-browse.test.ts` 19/19 (`npx.cmd tsx`); regression GD-03 22/22, GD-01 27/27, GD-02 21/21; lint exit 0. UI runtime + live Drive NOT exercised `[UNKNOWN]` (no React test harness; GD-02 config gate; GD-08 E2E).

### Documentation changes
- `docs/google-drive-integration/data-contract.md` (§15); `docs/tasks/BACKLOG.md`; handoff `BACKLOG.md` + `tasks/active.md` + `tasks/completed.md`; NEW `reports/GD-04-completion-report.md` (no retroactive reports for earlier tasks, per instruction).

---

## [2026-10-18] GD-03: Google Drive Backup — Cloud Snapshot Creation & Versioning

### Summary
Executed GD-03 (create and version cloud backups) within the closed decision set (D1/D3/D4/D5/D6 — not reopened). Delivered the trash-inclusive local read, deterministic gathering, the Drive upload client (multipart ≤5 MB / resumable >5 MB per live-verified REST docs), and the typed `createCloudBackup` orchestrator with Drive-confirmed success, 401 retry-once, and reconcile-by-unique-backupId on ambiguous failures. Additive-only versioning: uploads never overwrite or delete; duplicate display names allowed; no retention policy invented. Boundary respected: no GD-04 browse/download UI, no GD-05 restore, no background sync (D6).

### Key artifacts `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- Drive REST facts verified live (browser) 2026-10-18: `files.create` upload URI + `uploadType=multipart` (official ≤5 MB limit); resumable flow (init headers `X-Upload-Content-Type/-Length` → `Location` session URI → PUT); `appProperties` app-private metadata; `appProperties has { key='backupId' and value='…' }` + `name` query syntax; appDataFolder carried over from GD-02.
- `src/db.ts`: NEW `getAllSnippetsIncludingTrash` — read-only, tombstones preserved, **no `purgeExpiredTrash` side effect**, id-sorted; existing functions and local export/import untouched.
- NEW `src/gdrive/gather.ts` (injectable readers, deterministic order, counts), `src/gdrive/driveClient.ts` (typed results; appDataFolder parents; `appProperties` carries backupId/schemaVersion/createdAt/appVersion; list reconciliation primitive), `src/gdrive/backup.ts` (`createCloudBackup`: success only after Drive returns the file id; unauthorized → clear cached token + silent re-auth + retry ONCE; network-ambiguous → list by backupId: 1 = reconciled success, 0 = typed retryable failure, ≥2 = typed ambiguous, never auto-delete).
- GD-03 contract addendum §14 in `docs/google-drive-integration/data-contract.md` (gathering rules, upload form, timeout-reconciliation rule, duplicate policy, no retention).
- Tests: NEW `tests/gdrive-backup.test.ts` — 22/22 (`npx.cmd tsx`); regression: GD-01 27/27, GD-02 21/21; `npm.cmd run lint` exit 0. Live Drive upload NOT exercised `[UNKNOWN]` (blocked on GD-02 user-owned Cloud config); DB helper runtime under real IndexedDB unverified in node `[UNKNOWN]` (flagged honestly; GD-08 E2E gate).

### Documentation changes
- `docs/google-drive-integration/data-contract.md` (§14 addendum + §13 open-items note); `docs/tasks/BACKLOG.md`; handoff `BACKLOG.md` + `tasks/active.md` + `tasks/completed.md`; NEW `reports/GD-03-completion-report.md` (mandatory 9-item report; no retroactive GD-01/GD-02 reports created, per instruction).

---

## [2026-10-18] GD-02: Google Drive Backup — OAuth Architecture, Official-Docs Verification & Authorization Foundation

### Summary
Executed GD-02: verified official Google/Chrome documentation live (browser) and implemented the least-privilege OAuth foundation. Mechanism decision (ADR-012): `chrome.identity.getAuthToken` with a manifest `oauth2` block declaring exactly `https://www.googleapis.com/auth/drive.appdata`. Live verification corrected GD-01's unverified assumption — `drive.appdata` is an official **non-sensitive** scope. No UI, `db.ts`, local export/import, or background-sync changes; no new dependencies; no credentials fabricated.

### Key artifacts `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- Verification record (7 official URLs, live-fetched): identity API (permission, cache/expiry, interactive semantics, per-call scope override, `clearAllCachedAuthTokens`, launchWebAuthFlow=non-Google, no prompt-at-launch UX rule); manifest `oauth2`/`key` keys (placeholder client-ID style is official; `key` pins extension ID); OAuth tutorial (client type "Chrome Extension", Item ID = extension ID, no secret; stable-ID via Developer Dashboard public key); Drive appDataFolder guide (hidden per-app folder; no share/move/trash; deletions permanent); scopes page (drive.appdata = non-sensitive); consent-screen config (Audience/test users); OAuth2 lifecycle (tokens expire; grant revocation is all-scopes).
- `public/manifest.json`: `identity` permission added; `oauth2` added with documented placeholder client ID + exact scope (regression test guards drift); `key` deliberately omitted (user-owned).
- `src/gdrive/auth.ts` (pure, injectable deps): `resolveOAuthConfig` typed problems (placeholder/malformed client ID, scope mismatch, missing permission); `createAuthController` (authorize/getToken/signOut/isConfigured); `classifyAuthError` → denied / interaction-required / error; tokens never persisted/logged/rendered; interactive prompts only from explicit user UI.
- User-owned setup documented step-by-step (oauth-contract.md §6): stable extension ID via `key`, OAuth client ID of type "Chrome Extension", consent-screen/Audience config, Drive API enabled. Live authorization remains blocked on that config — no values invented.

### Documentation changes
- NEW `docs/google-drive-integration/oauth-contract.md`; NEW `src/gdrive/auth.ts`, `tests/gdrive-auth.test.ts`; `public/manifest.json`; `docs/project-knowledge/DECISIONS.md` (ADR-012); `docs/tasks/BACKLOG.md`; handoff `BACKLOG.md`/`tasks/active.md`/`tasks/completed.md`.

### Verification Evidence
- `npx.cmd tsx tests/gdrive-auth.test.ts` → 21/21 pass `[COMMAND-VERIFIED]`; `npx.cmd tsx tests/gdrive-contract.test.ts` → 27/27 pass (regression) `[COMMAND-VERIFIED]`; `npm.cmd run lint` → exit 0 `[COMMAND-VERIFIED]`.
- Official docs pages fetched live in-browser and quoted in the record `[SOURCE-VERIFIED]`.
- Real chrome.identity/consent/Drive runtime NOT exercised (requires user-owned Cloud config) `[UNKNOWN]` — GD-08 gate.

---

## [2026-10-18] GD-01: Google Drive Backup — Cloud Snapshot Data Contract (pure module + tests + ADRs)

### Summary
Executed GD-01 after the user finalized decisions D1/D3/D4/D5/D6 (per-user OAuth identity; `drive.appdata` storage; v2 snapshot schema with v1 compatibility, UTC naming, and trash inclusion; `id` + content-hash conflict vocabulary with no silent overwrite; v1 = explicit upload/restore only). Deliverables: canonical spec `docs/google-drive-integration/data-contract.md`; pure contract module `src/gdrive/{types,snapshot,conflict}.ts` (no IndexedDB/`chrome.*`/network/DOM access, no new dependencies); focused `node:test` suite `tests/gdrive-contract.test.ts` run via the existing `tsx` devDependency; ADR-010/ADR-011 recorded in `docs/project-knowledge/DECISIONS.md`. No UI, manifest, packaging, `db.ts`, or local export/import changes; no OAuth, Drive API, or background-sync code.

### Key artifacts `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- Envelope v2: `format` marker + `schemaVersion: 2` + deterministic `backupId` (`bk-<compactUtc>-<digest8>`) + `displayName` + UTC `createdAt` + `appVersion` + BackupData-v1-shaped payload (trash tombstones preserved; preferences optional) + SHA-256 canonical-JSON payload digest (corruption detection only, no authenticity claim). `backupId` is application-level and distinct from Drive file IDs (which live only in `SnapshotListEntry`, alongside external `sizeBytes`).
- Compatibility: future `schemaVersion` rejected (`unsupported-version`, never best-effort parsed); bare v1 files migrate in memory with importer-matching lenient coercions (`Boolean(isFavorite)`, numeric-string timestamps, missing version → 0); envelope-strict / record-quarantine policy; duplicate ids first-wins with warning; unknown fields ignored with warning.
- Conflicts: add / unchanged / content-conflict / deletion-state-conflict / same-name-different-id (informational) / duplicate-id-in-snapshot / missing-category (→ `default`); resolutions keep-local (default) / take-incoming / keep-both (re-id); newest-timestamp-wins explicitly never used; restore plan is pure — GD-05 executes it in one transaction.
- Sync feasibility documented: continuous two-way sync infeasible in v1 (volatile `version`/`updatedAt` bumps `db.ts:414-434/:954`, 72 h tombstone purge, no change log) — snapshots are full point-in-time copies per D6.

### Documentation changes
- NEW `docs/google-drive-integration/data-contract.md`; NEW `src/gdrive/*`, `tests/gdrive-contract.test.ts` (GD-01 source scope); `docs/project-knowledge/DECISIONS.md` (ADR-010/011); `docs/tasks/BACKLOG.md`; handoff `BACKLOG.md`/`tasks/active.md`/`tasks/completed.md`.

### Verification Evidence
- `npx.cmd tsx tests/gdrive-contract.test.ts` → 27/27 pass, 0 fail `[COMMAND-VERIFIED]`.
- `npm.cmd run lint` (`tsc --noEmit`) → exit 0, 0 errors `[COMMAND-VERIFIED]`.
- Real Google OAuth / Drive API / Chrome extension runtime NOT exercised (out of GD-01 scope) `[UNKNOWN]`.

---

## [2026-10-18] GD-00: Google Drive Integration — Project Audit & Decision Inputs (documentation-only)

### Summary
Executed GD-00 from `snippet-organizer-google-drive-handoff/`: a read-and-reconcile audit ahead of the Google Drive backup feature. Deliverable `docs/google-drive-integration/audit.md` covers the 8 mandated audit areas (repo/entry points/tooling; manifest & MV3 surface; Settings → Backup & Data UI; data model; local backup/import/restore; security posture; test capability; docs-vs-source reconciliation), a mismatch register (M1–M12), proposed decisions with open gates (D1–D10), and a proposed module map. No application source files changed; `docs/project-knowledge/DECISIONS.md` intentionally untouched (proposals only — ADRs follow user approval).

### Key findings `[SOURCE-VERIFIED]` / `[COMMAND-VERIFIED]`
- `public/manifest.json` (the shipped copy) requests `storage` only; root `manifest.json`/`service-worker.js` are stale divergent duplicates (SHA-256 differ) still listed as "active" in `docs/project-knowledge/README.md` §3.1 and quoted as the manifest in `INTEGRATIONS.md`. `identity` is absent from the shipping manifest — GD-02 prerequisite.
- Local export excludes trashed snippets (`exportAllData` → `getAllSnippets` filters `deletedAt === null`, `db.ts:214,887`); local merge import silently overwrites same-ID records (`db.ts:946-957`); import validation checks only array presence; replace/reset are single-transaction (atomic) with no pre-restore safety snapshot.
- `version`/`updatedAt` bump on usage (copy) and on import (`db.ts:414-434`, `:954`) — not safe as sync change markers by themselves.
- No automated test framework (lint + manual scenario suites only). Zero network calls, zero host permissions, zero content scripts today.
- Footer shows a hardcoded cosmetic "Synced / Last synced: 2 minutes ago" status (`MainPopup.tsx:651-652`) although no sync exists — flagged for GD-07 replacement (no fake sync).
- Stale 712 × 512 texts remain in root `README.md:3` / root `PROJECT_BRIEF.md:11,17,36`, `FEATURES.md:45`, `SCREEN_REGISTRY.md:27,36`, `DESIGN_SYSTEM.md:159`, `DECISIONS.md:33` (ADR-002 heading); source truth is the 480 × 600 viewport with a 430 × 550 popup. `ARCHITECTURE.md:113` documents the preferences store keyPath as `key` (actual: `id`, `db.ts:134`).

### Documentation changes
- NEW `docs/google-drive-integration/audit.md` (GD-00 deliverable).
- `docs/tasks/BACKLOG.md` — GD-00 row in §1 + active-status note in §2.
- `snippet-organizer-google-drive-handoff/BACKLOG.md`, `tasks/active.md`, `tasks/completed.md` — GD-00 status and template-conformant task record.

### Verification Evidence
- `npm.cmd run lint` (`tsc --noEmit`) → 0 errors `[COMMAND-VERIFIED]`.
- SHA-256 comparison of root vs `public/` manifest/service-worker (digests differ) `[COMMAND-VERIFIED]`.
- Greps: zero network primitives in `src/`; zero test files; template deps (`@google/genai`, `express`, `dotenv`, `jszip`, `motion`) imported nowhere in `src/`; no prior `GD-` rows in `docs/tasks/BACKLOG.md` `[SOURCE-VERIFIED]`.
- Extension runtime not verified (no Chrome host in this environment) `[UNKNOWN]`.

---

## [2026-10-17] CLAY-DEPTH-01: Enhance Top-Edge 3D Depth of Claymorphism Popups

### Summary
The raised Claymorphism surface (`.glass-clay-surface`) now casts a soft, layered top-edge shadow so the popup silhouette reads as elevated from the top-left/top-right corners through to the existing bottom shadow. One selector changed; every locked value preserved.

### Root Cause `[SOURCE-VERIFIED]`
The surface's only outer shadow was `35px 35px 68px rgba(208,2,5,0.5)` — offset down-right, leaving the top edge with no shadow at all. Runtime pixel sampling showed the red gradient composites to a dark saturated `rgb(212,30,32)` at the top of the window (the task's "solid dark region") versus pale `rgb(244,200,200)` at the bottom: the deep-red spill was invisible against the dark top and clearly visible against the pale bottom — exactly the reported flat-top / convincing-bottom asymmetry.

### Change
`src/index.css`, `.glass-clay-surface` only: two ADDITIVE layers prepended to the existing stack (existing trio verbatim — down-right `35px 35px 68px rgba(208,2,5,.5)`, both insets, radius 26px, background, backdrop blur untouched):
- Ambient: `0 -9px 22px -7px rgba(70, 24, 26, 0.42)` — broad, low-opacity, neutral dark-warm grey defining the raised silhouette above the top edge.
- Contact: `0 -2px 6px -2px rgba(70, 24, 26, 0.3)` — tight shadow defining the surface boundary.
Offsets/blur/spread sized to the 25px popup ring (max reach 24px) so the 480×600 window's `overflow-hidden` cannot clip the new shadow; no pseudo-element, no DOM change, no layout impact. The class is shared by the main popup, the floating window, the Settings panel, and the Snippet-Preview modal surface, so all stay consistent automatically. `docs/design/DESIGN_SYSTEM.md` §9.12 documents the exception to the locked class.

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: the band above the top edge now darkens progressively toward the surface (center R 199 → 172, left-corner column 195 → 174, right-corner column 197 → 172 — symmetric, smooth gradient, no hard outline); A/B screenshot-diff toggling the two new layers off proves the effect (top-strip average R = 198 with vs 213 without; restore byte-identical); bottom-region pixels numerically unchanged vs the pre-change baseline (below-center exact [233,140,141], bottom corners within Δ3 anti-aliasing noise) — the existing bottom shadow's contribution is intact; top inset highlight pixel-exact ([242,185,186] before = after); surface geometry unchanged (430×550 at top 25, radius 26px); Settings panel (surface top 24px, parent overflow visible) and preview-modal inner surface (129px headroom) carry the same layers with no clipping; card interactions re-checked working; 0 console errors.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → ✓ 364 ms; Compress-Archive fallback zip 1,139,278 bytes `[COMMAND-VERIFIED]`.
- Rendering inside real chrome-extension windows (docked popup / floating window chrome) not verifiable in the dev environment `[UNKNOWN]`; on-screen judgment of "premium softness" is supported by the measured gradient falloff but final aesthetic sign-off remains with the user.

---

## [2026-10-17] MOTION-01: Premium Micro-Interactions, Smooth Transitions, and Action Feedback

### Summary
A restrained interaction-polish pass: snippet copying now reports its real outcome with an animated toast, the long-dormant `animate-in` entrance classes were given real definitions (they had never actually animated), tactile press states landed on the popup's frequent controls, Settings gained section-switch and toast-exit transitions plus a genuine import in-progress state, and `prefers-reduced-motion` is respected. No UI redesign, no dependency, no data or behavior changes.

### Source Changes `[SOURCE-VERIFIED]`
- `src/index.css` — new §5c/§5d blocks (all locked §2–4 values untouched): `.nm-press` (buttons `:active scale(.96)`) and `.nm-press-sm` (cards `scale(.985)`), 150 ms transform-only `cubic-bezier(0.4,0,0.2,1)`; `.nm-toast-out` exit keyframe (160 ms ease-in fade + 6 px drop); real definitions for the previously no-op utility class names already used across the codebase (`animate-in`, `fade-in`, `zoom-in-95`, `zoom-in-98`, `slide-in-from-top-1/-2`, `slide-in-from-bottom-1`) driven by a single `nm-enter` keyframe with duration from Tailwind v4's `--tw-duration` (default 180 ms); `@media (prefers-reduced-motion: reduce)` global damping.
- `src/components/MainPopup.tsx` — single copy-feedback toast (`copyToast` state, timer + exit timer with unmount cleanup, key replay): shown only after `db.copySnippet` resolves, `Copied successfully` / `Failed to copy snippet`, fixed bottom-center pill (`role="status"`, `aria-live="polite"`, emerald Check / rose XCircle), ~1.8 s visible + 160 ms exit; list-loading state gained the standard spinner; bulk toolbar buttons got `.nm-press`.
- `src/components/SnippetCard.tsx` — card root `.nm-press-sm`; copy + three-dot buttons `.nm-press` (handlers, layout, and classes otherwise untouched).
- `src/components/SearchAndFilters.tsx` — All / Favorites / All-Categories tabs, clear-search ×, and bulk-mode entry button got `.nm-press`; selection logic untouched.
- `src/components/SettingsView.tsx` — content scroll container keyed by `activeTab` with a 200 ms fade + 4 px rise entrance; banner toast uses the same entrance/exit pair (`dismissToast` with exit timeout + unmount cleanup, manual × routed through it); new `isImporting` state around the real import (`File` button → spinner + "Importing…", Merge/Replace disabled, `finally` always restores).
- `docs/design/DESIGN_SYSTEM.md` §9.11 — records the motion/feedback conventions.

### Discovery: entrance classes were no-ops
Runtime probing showed `animation: none` on elements styled with `animate-in fade-in zoom-in-95` — these Tailwind-plugin class names were never defined in this project (no animation plugin installed; `animate-out`/`animate-in` absent from the built CSS). Every pre-existing usage (modals, dropdowns, banners, panels) silently rendered without entrance motion. The fix defines those exact class names in `index.css`, so all pre-existing call sites animate without any component edits.

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: copy toast text/entrance (`nm-enter` 0.2 s) and exit (`nm-toast-out` 0.16 s, caught mid-flight) verified; list and card geometry byte-identical while the toast shows; clipboard read-back contains the copied snippet; failure path exercised by stubbing `navigator.clipboard` to reject → error toast with rose icon and NO false success check on the card; three rapid copies → exactly one toast; card three-dot menu opens animated with all 5 actions and closes on Escape; preview modal and category-delete modal animate (`nm-enter`) and open/cancel cleanly (no data mutation — Delete was cancelled); Settings tab switch replays the entrance; settings banner toast entrance + exit + unmount verified via the harmless Manage-button toast; reduced-motion emulation collapses a 0.2 s transition to 0.00001 s; favorites filter = 1 card, All = 5 cards, bulk mode enters/cancels; no horizontal overflow; 0 console errors across popup + settings.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → ✓ 349 ms; Compress-Archive fallback zip 1,139,072 bytes `[COMMAND-VERIFIED]`.
- Not exercised at runtime `[UNKNOWN]`: the import spinner state (would require running a real import against the dev database, which would mutate the preserved baseline) and real chrome-extension clipboard behavior (`navigator.clipboard` in `chrome-extension://` contexts not verifiable in the dev environment). The Settings banner toast remains in-flow (pushes content by its height when visible) — pre-existing approved layout, intentionally untouched.

---

## [2026-10-17] LOGO-GLOW-01: Standardize Extension Logo Placement and Add a Theme-Matched Glow

### Summary
The main popup's primary logo now renders the approved canonical master artwork (`public/icons/icon-master-1024.png`) inside the unchanged header plinth, the favicon/extension-icon locations keep the canonical 16/32/48/128 px pack variants (already integrated by FAVICON-PACK-01), and a new `.nm-logo-glow` class adds a soft light-red/coral silhouette glow to the popup header logo only.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/Header.tsx` — the 40×40 `rounded-[26%]` `rgb(240,85,88)` plinth (classes, `title`, size, position unchanged) now contains `<img src="icons/icon-master-1024.png">` (`object-cover`, `overflow-hidden`, alt "Snippet Organizer logo", `draggable=false`) instead of the white lucide `Layers` glyph; the now-unused `Layers` import was removed. The chip gained `nm-logo-glow` + `overflow-hidden`.
- `src/index.css` — new `.nm-logo-glow` beside the locked `.nm-logo-raised` (untouched): `filter: drop-shadow(0 0 5px rgba(254,202,202,.95)) drop-shadow(0 0 13px rgba(252,165,165,.55))` — rose-200/rose-300 family matching the snippet-card light-red accents; drop-shadows follow the rounded silhouette (no rectangular halo) and cause no layout shift.
- Favicon/extension-icon references: **no changes needed** — `public/manifest.json` (`action.default_icon` + `icons`) and the three HTML `<link rel="icon">` tags already point at the canonical pack variants per FAVICON-PACK-01; all paths re-verified to resolve.
- `docs/design/DESIGN_SYSTEM.md` §9.10 — records the master-artwork placement, the glow class + rationale, and the rule that the glow applies only to the popup header logo.

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: master artwork loads (1024×1024 natural, fills the chip exactly); computed `filter` on the chip matches the class definition exactly; header geometry identical to pre-change (chip right 85, pin button left 93, header height 60); screenshot-diff (glow on vs off) proves the effect renders and is deterministic (restore matches byte-for-byte); per-pixel delta at 12 identical ring points (3–7 px outside each chip edge) averages ΔRGB [+7.3, +21.4, +21.1] — the halo lifts the background from chip-red blend (e.g. [225,89,91]) toward pale pink ([236,125,126]), giving the red logo clear silhouette separation as a soft wash, not a neon outline; exactly 1 `.nm-logo-glow` element in the popup, 0 in settings; 5 snippet cards + search field + 480 px layout intact, no horizontal overflow; favicon asset request still 200; favicon.ico 404 still absent.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → ✓ 569 ms; documented Compress-Archive fallback zip 1,138,213 bytes; all four manifest icon paths resolve in `dist/`; `icon-master-1024.png` reference present in the built bundle `[COMMAND-VERIFIED]`.
- Artwork rendering inside a real chrome://extensions toolbar (docked/floating chrome-drawn contexts) is not verifiable in the dev environment `[UNKNOWN]`.

---

## [2026-10-17] FAVICON-PACK-01: Install and Standardize the Supplied Favicon Pack

### Summary
The user-supplied `snippet-organizer-icon-pack.zip` is installed flat into `public/icons/` (artwork preserved byte-for-byte), its four variants now back the exact paths `public/manifest.json` already references, the three Vite entry pages declare `<link rel="icon">` at the 16/32/48 px variants (eliminating the long-standing favicon.ico 404), and the pack is recorded as the canonical favicon source in project documentation.

### Source Changes `[SOURCE-VERIFIED]`
- `public/icons/` — pack extracted flat (no nested archive directory, nothing deleted, no unrelated asset touched): `icon16.png` 795b, `icon32.png` 2,419b, `icon48.png` 4,563b, `icon128.png` 21,078b, `icon-master-1024.png` 984,700b, `README.txt` (pack provenance). The four PNGs replaced same-named prior placeholders — confirmed intended replacements: identical filenames to the manifest's icon paths, correct 16/32/48/128 dimensions, pack README instructs the exact same paths. SHA-256 of every extracted file verified identical to the archive contents.
- `public/manifest.json` — **untouched**: `action.default_icon` and `icons` already referenced `icons/icon16/32/48/128.png`, which now resolve to the supplied pack; all other manifest settings unchanged.
- `index.html`, `popup.html`, `settings.html` (the three Vite inputs) — each gained three `<link rel="icon" type="image/png" sizes="…" href="icons/…">` tags (16/32/48 px, relative paths valid in dev and `dist/`) with a FAVICON-PACK-01 comment pointing to the canonical-source doc. The stale root `*-1.html` build-output duplicates are not vite inputs and were intentionally left untouched.
- `docs/project-knowledge/ARCHITECTURE.md` §6.2 — canonical-source rule: `public/icons/` holds the supplied pack; future favicon/icon work must use these assets or an explicitly provided replacement pack; never regenerate, redesign, or substitute the artwork.
- `README.md` (project tree table) and `docs/design/DESIGN_SYSTEM.md` §9.9 — synced notes (previously stated no favicon link existed).

### Verification Evidence
- Archive inspected before extraction (6 entries, README read, PNG dimensions verified 16/32/48/128/1024 square) `[COMMAND-VERIFIED]`.
- Build ✓ 392ms; `dist/icons/` carries the exact pack byte sizes + README; all four manifest icon paths resolve in `dist/`; documented Compress-Archive fallback zip 1,138,082 bytes (≈1MB growth from the master artwork shipping with the pack) `[COMMAND-VERIFIED]`.
- Runtime on the dev server `[RUNTIME-VERIFIED]`: the browser fetched `/icons/icon32.png` as the page icon → **200 OK**; `popup.html`, `settings.html`, and `index.html` all load with **0 console errors — the long-standing favicon.ico 404 is gone**; `settings.html` exposes all three favicon links with resolved `icons/…` URLs.
- `npm.cmd run lint` unaffected (no TS changes); no runtime verification of the artwork inside a real chrome://extensions load (needs the unpacked extension in Chrome) `[UNKNOWN]`.

---

## [2026-10-17] CAT-DEL-MODAL-01: Category Deletion Decision Modal

### Summary
Deleting a category in Settings no longer uses `window.confirm`. An in-app decision modal (Red Glass-Claymorphism) identifies the target category and requires an explicit choice between `Only Delete Category` (existing behavior: snippets preserved and moved to Default) and `Delete Category with Snippets` (existing snippet soft-delete → Trash with 3-day recovery, no Default migration).

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsView.tsx` (only file changed):
  - Added three db imports from the existing module (`getAllSnippets`, `updateSnippet`, `deleteSnippet`) — no new dependency.
  - New state: `categoryDeleteModal` (target `{id, name}` or null), `categoryDeleteChoice` (`'keep-snippets' | 'delete-snippets'`, defaults to Option A), `isDeletingCategory` (in-progress guard).
  - `handleDeleteCategory` keeps the Default-category guard and now only opens the modal — no deletion.
  - New `handleConfirmCategoryDelete`: Option A calls the unchanged `deleteCategory(id, 'default')` (snippets reassigned to Default). Option B loops the category's snippets through the EXISTING pathway — `updateSnippet(id, {categoryId:'default'})` so a later Trash restore never references a deleted category id, then `deleteSnippet(id)` (soft-delete → 3-day Trash) — before `deleteCategory(id, 'default')`, whose reassignment loop becomes a no-op; refreshes counts, toasts, closes the modal only on success, and leaves it open with the error toast on failure.
  - New modal JSX: fixed overlay (backdrop click cancels while idle), `role="dialog"`/`aria-modal` panel, `role="radiogroup"` with two `role="radio"` options (`aria-checked`, `nm-primary-inset` + Check when selected, `nm-raised` otherwise), Cancel, and `nm-danger-raised` Delete that shows `Deleting…` while disabled.

### Verification Evidence
- Static call-site analysis (GitNexus unavailable per AGENTS.md): `deleteCategory` is referenced only by SettingsView; `handleDeleteCategory` is invoked only by the category Delete button; no other module affected.
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: modal opened with exact title `Delete "Temp Keep"?`, both option labels + descriptions verbatim, Option A pre-selected (`aria-checked true/false`), toggling worked, Cancel closed it with the category untouched; **Option A** (on scratch category holding "Account Verification") removed only the category — the snippet survived byte-identical with badge `Default`; **Option B** (on scratch category holding "Order Cancellation") removed the category, the snippet left the main list (5→4), appeared in Trash (4→5), was NOT migrated to Default, and Restore returned it visible with badge `Default` (no dangling categoryId); Default category still renders no Delete button; all state restored afterward (5 snippets in original categories, Trash back to 4, both scratch categories gone); favicon-404 only console error.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; Compress-Archive fallback repack 124,593 bytes; dist carries both option labels + descriptions `[COMMAND-VERIFIED]`.

---

## [2026-10-17] BULK-DEL-01: Bulk Snippet Selection and Deletion Mode

### Summary
New bulk workflow: an icon-only trash button at the far right of the filter-tab row enters a Bulk Selection Mode with per-card checkboxes, a Select All/Unselect All toggle scoped to the active list, and a Delete action that soft-deletes exactly the selected snippets through the existing Trash pathway, then exits the mode.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SearchAndFilters.tsx` — new optional `onEnterSelectionMode` prop; icon-only lucide `Trash2` button (32 px, `nm-icon-btn`, hover rose, `aria-label="Select snippets to delete"`, `ml-auto`) appended inside the existing tab row; the row's tabs and category dropdown are untouched.
- `src/components/MainPopup.tsx` — `isSelectionMode` + `bulkSelectedIds: Set<string>` (explicit ids only); `enterSelectionMode`/`exitSelectionMode` (exit clears selection), `toggleBulkSelect`, `allShownSelected` derived from `filteredSnippets` (Select All therefore covers only the ACTIVE list — filter-hidden snippets can never be selected or deleted), `toggleSelectAll`, and `handleBulkDelete` which loops the EXISTING `db.deleteSnippet` soft-delete (deletedAt + 3-day Trash retention) over the selected ids with a single `getAllSnippets` refresh, then clears the selection and exits the mode; no-op when nothing is selected (button also disabled). A toolbar (Select All/Unselect All · `Delete (n)` · Cancel) renders between the search area and the list, outside the scroll region, only while the mode is active.
- `src/components/SnippetCard.tsx` — three optional props (`selectionMode`, `isBulkSelected`, `onToggleBulkSelect`, all defaulting off): a left-side checkbox (nm-primary-inset + white Check selected, bordered square unselected, `aria-pressed`, `stopPropagation`) and card-body clicks re-pointed from copy to selection toggling while in mode. Outside the mode the card markup/behavior is unchanged (left-click still copies; three-dot menu intact).

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: icon geometry verified (inside the tablist row, flush right, icon-only, 32 px); entering shows the toolbar + 5 checkboxes with Delete disabled and nothing deleted; individual toggles produced Delete (1)/(2)/(1); non-adjacent multi-select worked; Select All pressed all 5 visible cards and flipped the label to "Unselect All"; manually deselecting one reverted the label to "Select All"; Unselect All cleared to 0 pressed with Delete disabled and zero deletions; with the Favorites filter active, Select All selected only the 1 shown card and toggling never changed the active filter; in selection mode a card-body click left a clipboard sentinel untouched and opened no preview; Delete (2) removed exactly "Refund Approved" and "Contact Support" (3 cards remained), exited the mode, and left no checkboxes; both snippets then appeared in Settings → Trash (6, alongside 4 pre-existing test items) with the 3-day retention note, and Restore returned the main list to all 5 snippets; left-click copy outside the mode still copied; the three-dot menu (View snippet / Edit snippet / Copy snippet / Move to trash) still worked and View opened/closed the details modal; enter → Cancel cycles left zero artifacts; favicon-404 remained the only console error.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented Compress-Archive fallback repack (123,768 bytes); dist carries the Select All / Unselect All / `Delete (` / aria-label strings `[COMMAND-VERIFIED]`.

---

## [2026-10-17] CATEGORY-SEL-01: Mutually Exclusive Category / Favorites / All Selection

### Summary
Selecting a specific category after Favorites left the Favorites tab visually selected alongside the category. Category selection now also resets the tab filter state, making All, Favorites, and every category mutually exclusive in every order.

### Root Cause
Selection lives in two states: `activeFilter` ('all' / 'favorites' / …) and `selectedCategoryId`, with filtering giving `selectedCategoryId` precedence and each tab's visual keyed off its own state. The Favorites button already called `onSelectCategory(null)`, but the category dropdown items called only `onSelectCategory(cat.id)` — so `activeFilter` stayed 'favorites' after picking a category, and the Favorites tab (`activeFilter === 'favorites'`) kept its selected style while the category trigger showed selected too.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SearchAndFilters.tsx` — the specific-category menu-item handler now calls `onFilterChange('all')` in addition to `onSelectCategory(cat.id)`, so every selection path (All, Favorites, category) updates both states consistently. No state re-architecture, no style changes, no filtering-logic changes.

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`, all six required sequences, probing the `nm-primary-inset` selected class on the All tab, Favorites tab, and category trigger plus visible card counts: **A** open = All only → Favorites only (1 card) → Account category only (1 card); **B** category from All → only Shipping, All and Favorites unselected; **C** category → Favorites only (1 card); **D** Favorites → All only (5 cards); **E** Account → Shipping → only the latest; **F** eight rapid mixed steps → exactly-one-selected true with matching card counts (5/1/1/5/1/1/1/5) after every action; final state restored to All. 5 snippets intact; favicon-404 the only console error.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented Compress-Archive fallback repack (123,198 bytes) `[COMMAND-VERIFIED]`.

---

## [2026-10-17] SEARCH-CLEAR-01: Search Field — One-Click Clear Icon + Subtle Shortcut Placeholder

### Summary
The search field's solid `Ctrl + Shift + S` kbd badge was replaced by a subtle in-field placeholder hint, and an inline accessible clear (×) icon was added inside the field's right side for one-click query clearing.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SearchAndFilters.tsx` — removed the elevated kbd badge; the placeholder is now `Search snippets   ·   {focusSearchLabel}` (still driven by the live binding) with `placeholder-slate-400/55` for a subtle, integrated look; new clear button (lucide `X`, 24 × 24, right-3, `aria-label="Clear search"`) rendered only when the query is non-empty, with `onMouseDown` preventDefault + `inputRef.focus()` so focus never leaves the field, clearing via the existing `onSearchChange('')` path; input padding `pr-20 → pr-10` so text never reaches the icon.
- `src/index.css` — one scoped rule hides the WebKit-native `::-webkit-search-cancel-button` on `input[data-search-input]` so the custom × is the single clear affordance.

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: placeholder computed color at ~55% alpha, disappears while typing, returns when emptied; clear icon absent when empty, appears on typing and on paste, positioned 12 px inside the field's right edge (24 × 24 px, inside the input bounds); clicking it cleared "ship" → empty value, results restored 1 → 5 immediately, focus retained in the input, icon disappeared, immediate retype ("contact" → 1 result) and a second paste/clear cycle both worked; Ctrl+Shift+S still focuses the search field (cursor at 0); Enter handoff search → list intact; field geometry 44 × 390 px unchanged (no layout shift); 5 snippets intact; favicon-404 remains the only console error.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented Compress-Archive fallback repack (123,186 bytes); dist contains the `Clear search` aria-label, the placeholder string, and the `search-cancel-button` CSS rule `[COMMAND-VERIFIED]`.

---

## [2026-10-17] TWO-FIX-01: Remove Redundant Shortcuts Heading; Card Left-Click Copies

### Summary
Two locked fixes: (1) the Shortcuts settings tab's redundant "Keyboard Shortcuts" intro heading and description were removed; (2) left-clicking a snippet card now copies its content via the existing clipboard handler instead of opening Snippet Details — View Snippet remains in the three-dot menu.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsView.tsx` — deleted the Shortcuts tab's intro block (h3 "Keyboard Shortcuts" + "Work faster with intuitive keystrokes designed for rapid snippet management"). The tab navigation entry, the Default Shortcuts and Customize Shortcuts cards, all shortcut rows, capture controls, and Reset to Defaults are untouched.
- `src/components/SnippetCard.tsx` — the card's main info area changed `onClick={onOpen}` → `onClick={onCopy}` (the same handler the copy button and menu's Copy snippet item use — existing `copySnippet` logic and copied-check feedback, no duplicate clipboard code). `onOpen` stays wired for the menu's View snippet action; the three-dot menu is portaled to document.body and the actions row already stops propagation, so menu/trigger/button clicks cannot reach the copy path; the bubbled click still reaches the card's `onSelect`, keeping selection synced.

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: left-click on the card title and on its preview paragraph copied Shipping Delay's exact clipboard content with the copied-check indicator and NO preview modal; selection synced to the clicked card; the three-dot trigger left a clipboard sentinel untouched and opened the menu; View snippet opened and closed the details modal; the menu's Copy snippet item and the card's copy button still copied correctly; card visual classes unchanged; 5 snippets intact; Settings shows no intro heading/description, keeps Default Shortcuts + Customize Shortcuts + Reset + 3 Change rows and the Shortcuts nav entry; other tabs' headings intact.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented Compress-Archive fallback repack (123,090 bytes); dist contains no intro-heading string `[COMMAND-VERIFIED]`.

---

## [2026-10-17] SHORTCUTS-LAYOUT-01: Customize Browser Shortcut Section — Vertical Layout, Full-Width Manage Button

### Summary
The Customize Browser Shortcut card (bottom of Settings → Shortcuts) previously squeezed its long description into a narrow side column beside the Manage button. It is now a single-column vertical layout: title, one concise description sentence, and the Manage button spanning the full section width.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsView.tsx` (one section): the card's outer flex changed from `items-center justify-between` (two columns) to `flex flex-col items-stretch gap-2.5`; the title row keeps the Keyboard icon + "Customize Browser Shortcut"; the description was shortened to **"Manage your extension shortcuts in Chrome settings."** (accurate — the button opens `chrome://extensions/shortcuts` via `chrome.tabs.create`, with the same toast fallbacks); the existing Manage button gained `w-full justify-center` below the description (handler, label, ExternalLink icon, colors, radius, typography, hover state unchanged; only the obsolete `shrink-0` removed).

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: vertical order confirmed by geometry (title top 1623 → description 1651 → button 1690); button width 210 px equals the card's inner width ±2 px with centered content; computed button styles preserved (12 px radius, white/50 background, white/70 border, 12 px/600 font, rgb(159,4,9) text); Manage click fired the dev-browser toast fallback, proving the handler is wired; popup intact after closing Settings (5 snippet cards, search visible); the Default Shortcuts and Customize Shortcuts cards are unchanged (both headings present, Reset to Defaults present, exactly 3 Change buttons and 1 Manage button).
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented Compress-Archive fallback repack (123,140 bytes); dist contains the new description and none of the old wording `[COMMAND-VERIFIED]`.

---

## [2026-10-17] SNIPPET-KBD-02: Refine Keyboard Shortcuts — Arrow Navigation, Enter Copy, Five Defaults

### Summary
Replaced the SNIPPET-KBD-01 gesture model with a five-action system: Arrow-key navigation and Enter-to-copy are the core mechanisms, the modifier-only Shift/Ctrl+Shift and Space-to-copy behaviors are gone, and the Settings tab is now two clearly-titled cards — Default Shortcuts and Customize Shortcuts.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/MainPopup.tsx` — removed the Shift / Ctrl+Shift navigation branches and the Space-copy branch; Enter no longer opens Quick View (it copies via the existing `copySnippet` + feedback). ArrowUp/ArrowDown are the fixed navigation (filtered list only, modulo wrap). New bindings from preferences: `focusSearch` (default Ctrl+Shift+S, matched before the typing guard so it works anywhere in the popup), `copy` (default Enter), `clearSearch` (default Backspace — clears the query only from the list context; Backspace inside the input keeps normal editing). Escape-from-list back to search kept; modal suspension, repeat guard, scrollIntoView kept.
- `src/components/SearchAndFilters.tsx` — deleted the hardcoded Ctrl+K handler and the Escape-clears-search branch (category-menu Escape preserved); the search-field kbd badge now renders the active `focusSearch` binding via a new optional `focusSearchLabel` prop (default Ctrl+Shift+S).
- `src/types.ts` + `src/db.ts` — `UIShortcutBindings` reshaped to `{focusSearch: 'Ctrl+Shift+S', copy: 'Enter', clearSearch: 'Backspace'}`; `getPreferences` migrates on load via `normalizeUiShortcuts` (obsolete KBD-01 keys dropped; stored `copy:'Space'` — the removed default — migrated to Enter).
- `src/shortcutUtils.ts` — new defaults; `normalizeUiShortcuts` migration helper; `validateShortcut` rewritten: rejects modifier-only bindings (they can never fire), standalone Shift, Escape, Arrow/Tab, and plain letters/digits; functional keys (Enter/Backspace/Space/…) allowed unmodified; conflict detection unchanged.
- `src/components/SettingsView.tsx` — Shortcuts tab restructured into **Default Shortcuts** (informational five rows: Ctrl+Shift+S / ↑↓ / Enter / Backspace / Ctrl+Shift+X with honest global-command wording) and **Customize Shortcuts** (same five actions: three capture rows, a fixed-arrow row, a browser-global row driven by `chrome.commands.getAll` with Ctrl+Shift+X fallback, Reset to Defaults); capture flow no longer completes on standalone Shift; stale comments updated; Quick View entry removed.
- `public/manifest.json` — `toggle-organizer` suggested_key `Ctrl+Shift+Z` → **`Ctrl+Shift+X`** (command name and service-worker logic unchanged).

### Verification Evidence
- Runtime at 480 × 600 `[RUNTIME-VERIFIED]`: autofocus; Ctrl+Shift+S focuses+selects the search from body and list contexts; Ctrl+K dead; arrows navigate both directions with the visible selection, wrap safely, respect filtering (single 'ship' result wraps to itself; Enter copied exactly that snippet's clipboard content with no preview); Shift, Shift+Tab, Space, and Ctrl+Shift+Z are inert in the list; Enter-in-search is handoff-only (clipboard unchanged); Backspace cleared the query from the list and deleted a single character inside the input; Escape returned list→search and closed the category dropdown (open menu 22 buttons → 17 after Escape); three-dot Quick View still opens/closes; Ctrl+J captured (`['Ctrl','j']`) and copied live after close; Shift-alone attempt quiet-cancels; modifier-only Ctrl+Shift release cancels without saving a dead binding; Reset to Defaults restored Ctrl+Shift+S / Enter / Backspace and the stored IndexedDB record then contained only the three new keys (legacy keys purged); load-time migration verified against a pre-existing KBD-01 record (UI showed Enter while the raw store still held `copy:'Space'`); editor Ctrl+Z/Ctrl+Shift+Z undo/redo intact; 5 snippets intact; the only console error is the pre-existing favicon 404.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented Compress-Archive fallback repack (123,185 bytes); dist manifest parses with `Ctrl+Shift+X`; no `navigateDown`/`navigateUp`/Ctrl+Shift+Z-command remnants; both card headings present `[COMMAND-VERIFIED]`.
- Chrome limitations (unchanged, documented in the Default Shortcuts card) `[SOURCE-VERIFIED]` `[UNKNOWN]`: the toggle is the only browser-global command (customizable at chrome://extensions/shortcuts); a docked popup can only be opened programmatically (Chrome 127+), never closed; Ctrl+Shift+S, Enter, Backspace, and the arrows are in-UI only; chrome.commands delivery and the floating toggle cannot be exercised in the dev browser.

---

## [2026-10-16] SNIPPET-KBD-01: Customizable Keyboard Shortcut System

### Summary
One shortcut opens the extension and focuses search; inside the UI, configurable gestures move the snippet selection and copy the active snippet without opening any modal. Browser-global opening is a real Chrome command; navigation/copying are extension-UI shortcuts; both are customizable in their proper place.

### Source Changes `[SOURCE-VERIFIED]`
- `public/manifest.json` — new MV3 `toggle-organizer` command, suggested key `Ctrl+Shift+Z` (valid 3-part combo; user-changeable at chrome://extensions/shortcuts). `_execute_action` left untouched.
- `public/service-worker.js` — `onCommand` handler for `toggle-organizer` reusing the existing floating-window lifecycle: window exists → save position and close it (true toggle); otherwise create it (existing `createNewFloatingWindow`). Docked mode: `chrome.action.openPopup()` when the API exists (Chrome 127+). No polling, hidden windows, or delays.
- `src/components/SearchAndFilters.tsx` — search input autofocused on mount (docked popup / floating window open = fresh mount) with the cursor placed; input tagged `data-search-input` as the handoff hook.
- `src/components/MainPopup.tsx` — two-context keyboard system: SEARCH (typing never intercepted) → ArrowDown/Enter blurs the input into LIST context; LIST honors preferences-driven bindings — defaults Shift = select next, Ctrl+Shift = select previous (deterministic "Ctrl before Shift" order rule), Space = copy the ACTIVE filtered snippet via the existing `copySnippet` + copied-state feedback (no preview/edit navigation); `e.repeat` guarded; Escape returns to search; ArrowUp/ArrowDown/Enter preview kept; modals suspend the context; `scrollIntoView(block:'nearest')` keeps the active card visible. `handleCopy` relocated above the effect (declaration order only).
- `src/types.ts` + `src/db.ts` — `uiShortcuts` preference (`navigateDown`/`navigateUp`/`copy`, defaults Shift/Ctrl+Shift/Space) persisted through the existing `savePreferences` conventions; the unused legacy `customShortcut` data was left untouched.
- `src/shortcutUtils.ts` (new) — parse/format/match/validate helpers shared by the popup handler and Settings.
- `src/components/SettingsView.tsx` — Shortcuts tab shows the REAL global binding (`chrome.commands.getAll`, fallback to the declared default); the undocumented Alt+S row was replaced by the actual command row; a new "Snippet List Shortcuts" section (claymorphism inset sections) provides per-action capture controls (modifiers accumulate; a non-modifier key or the modifier release completes; Shift-alone completes immediately), validation (plain letters/digits rejected, Escape reserved, Space reserved for copy, conflicts rejected) and Reset to Defaults; the Chrome "Manage" card text now explains the split between browser-global and in-UI customization.

### Verification Evidence
- Runtime at 480 × 600 (dev server, real key events) `[RUNTIME-VERIFIED]`: search autofocus with cursor at 0; Ctrl+K refocus+select; "ABC test ok" typed with Shift uppercase and Space intact (no navigation while typing); handoff blur verified; Shift walked Shipping Delay → Contact Support → Refund Approved, Ctrl-first+Shift walked up, wraparound safe; synthetic `repeat:true` keydown produced no move; Space copied the ACTIVE snippet — clipboard contained the filtered card's exact content, not the stale selection — with the existing copied indicator and no preview/edit modal; Escape returned focus to search; Enter → preview regression passed; settings round-trip: invalid captures rejected with toasts and capture retained, Escape cancelled, Ctrl+J captured and copied live after close, Ctrl+Shift captured on release, Space-for-navigation rejected as reserved, Reset restored Space and Space copied again; editor Ctrl+B bold confirmed (`font-weight: bold` span, `queryCommandState('bold') = true`); title-field composition unaffected; 5 original snippets intact; 0 console errors beyond the pre-existing favicon 404.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (122,895 bytes); dist manifest parses with the command; worker chunk carries the toggle; MainPopup chunk has `uiShortcuts` + `data-search-input`; settings chunk has the new section `[COMMAND-VERIFIED]`.
- Audit outcomes: Ctrl+K implemented and working; ↑/↓/Enter implemented and working; Alt+S was documentation-only (never registered) — replaced by the real command in the tab; "Ctrl+B then Enter": no distinct intended behavior found in code or docs (Ctrl+B = editor bold, Enter = newline) — reported as unresolved rather than invented; the `customShortcut` preference is stored-but-unused (unchanged).
- Not verifiable in this environment `[UNKNOWN]`: actual `chrome.commands` delivery, the floating-window open/close toggle, and chrome://extensions/shortcuts customization (chrome.* APIs are absent in the dev browser) — statically verified against the existing worker lifecycle; docked-popup TOGGLE-CLOSE is impossible per Chrome (no API closes a docked popup) and is documented in Settings instead of hacked.

---

## [2026-10-16] SNIPPET-DUP-01: Duplicate Action in the Snippet Details Modal

### Summary
The Snippet Details modal now has a Duplicate button that creates a copy via the existing `db.duplicateSnippet` workflow and, after the duplicate is persisted, opens the Edit Snippet page loaded with the NEW duplicate. The old multi-step path (modal → Edit → editor Duplicate draft) is unchanged.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SnippetPreviewModal.tsx` — optional `onDuplicate(snippetId): Promise<boolean>` prop; a **Duplicate** button in the top action bar matching the Edit button's `nm-raised` styling (Copy icon, 26 px-class padding, `aria-label="Duplicate"`), disabled with a "Duplicating..." label while the promise is in flight (rapid-click guard); on failure the modal stays open and the bottom hint shows "Duplicate failed — snippet not found." (no navigation to a nonexistent snippet).
- `src/components/MainPopup.tsx` — imports `duplicateSnippet` and wires `onDuplicate`: duplicate via the existing db function (fresh unique id via `createSnippet`, title + " (Copy)", content/category/favorite copied — no duplication rules changed), `await loadData()` to refresh, close the preview, then `setEditorState({ mode: 'edit', snippetId: duplicate.id })` — navigation happens only after persistence succeeds. No other handler or flow touched.

### Verification Evidence
- Runtime at 480 × 600 (dev server, real clicks) `[RUNTIME-VERIFIED]`: card click opened the modal showing Back / Star / Edit / Duplicate / X with Duplicate in the same `nm-raised` styling; clicking Duplicate opened the editor in Edit mode with the title field "Shipping Delay (Copy)" — the NEW duplicate, not the original; the preview had closed; closing the editor without saving left the duplicate in the library (persisted before navigation) with the original "Shipping Delay" unchanged; regression: the modal's Edit action still opens the editor for the original snippet; the duplicate carried the original's content per the untouched `db.duplicateSnippet`.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (120,158 bytes); dist MainPopup chunk contains the Duplicating label `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and pixel-level visual review (no extension host; screenshots cannot be viewed by this model) `[UNKNOWN]`. Observation (pre-existing, not fixed — out of scope): the modal's "Esc to close" hint has no Escape handler; the Back button closes it.

---

## [2026-10-16] FOOTER-SYMBOL-01: Main Footer Developer Symbol Aligned with About Section

### Summary
The main window footer's developer attribution used a text love symbol (`❤`) after "AKASH". It now uses the same lucide `User` icon the About section's Developer Information card renders beside its "Developed by AKASH" attribution.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/Footer.tsx` — the ❤ span was removed and a `User` icon (already-used lucide component, `w-3.5 h-3.5`, brand red `text-[rgb(240,85,88)]`, `aria-hidden="true"`) now precedes "Developed by", matching the intended `[symbol] Developed by AKASH` treatment and the About section's exact icon. Attribution text, container classes, and footer layout are unchanged; About was not modified; no new dependency (lucide `User` already in the project).

### Verification Evidence
- Runtime at 480 × 600 (dev server, computed styles) `[RUNTIME-VERIFIED]`: the footer attribution renders a `lucide-user` SVG at 14 px in rgb(240,85,88) with no heart character anywhere in the attribution; the About card's icon was confirmed to be the identical `lucide-user` class family at 14 px in the same color; footer height unchanged (31 px) and "Developed by AKASH" text intact.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (120,158 bytes); the dist bundle contains no heart glyph `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and pixel-level visual review (no extension host; screenshots cannot be viewed by this model) `[UNKNOWN]`.

---

## [2026-10-16] SETTINGS-FOOTER-01: Settings Footer Full Popup Width

### Summary
The Settings footer bar ("Settings auto-save on change" + Done) started at the sidebar's right border. It now spans the full Claymorphism popup width — including the area beneath the left sidebar — with its height, position, styling, and controls unchanged.

### Root Cause `[SOURCE-VERIFIED]`
The footer bar was rendered as the last child of `<main>` (the right content column) inside the `flex flex-1` two-column row, rather than as a sibling of the full-width header under the settings root. `<main>` begins at the 123 px sidebar's right border, so the footer inherited that constraint.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsView.tsx` — the footer bar was moved out of `<main>` to be a direct child of the settings root (`flex flex-col h-full`), placed after the two-column row — mirroring the header's position at the opposite end. Every class on the footer, its label, and the Done button is byte-identical; no offsets, negative margins, transforms, or absolute positioning were used. No other element, file, or section changed.

### Verification Evidence
- Runtime at 480 × 600 (dev server, computed geometry) `[RUNTIME-VERIFIED]`: footer spans x=25–455 (430 px — the exact popup surface) with edges exactly aligned to the header (25–455); the footer's top edge (522) equals the sidebar's bottom (522) and the content row's bottom (522), so it sits in the same vertical position directly beneath the sidebar with no layout shift; height 53 px with padding 12 px/24 px, bg white/30, and border-t white/50 all preserved; label "Settings auto-save on change" left-aligned and Done right-aligned as before; clicking Done still closes Settings (5 popup cards intact afterward).
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (119,875 bytes); the footer label is present in the dist settings chunk `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and pixel-level visual review (no extension host; screenshots cannot be viewed by this model) `[UNKNOWN]`.

---

## [2026-10-16] ABOUT-DEV-01: Developer Information Card in the About Section

### Summary
A new Developer Information card was added directly below the existing Feature Highlights card in Settings → About, showing the developer attribution, the project GitHub link, and a clickable email address. Purely additive; no existing card, screen, or logic was modified.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsView.tsx` — one new card in the About tab after Feature Highlights, plus three lucide icon imports (`Github`, `Mail`, `User`). The card reuses the section's approved surface language (`nm-static-inset-section rounded-2xl p-4`, `text-[11px]` body, bold `text-xs` heading). Content exactly as specified: `Developed by AKASH`; `GitHub:` anchor to `https://github.com/mdnooor/Snippet-Organizer` (`target="_blank"`, `rel="noopener noreferrer"`, display text without the protocol); `Email:` anchor to `mailto:md.nooor.hossain@gmail.com` displayed exactly. Long URL text uses `break-words`/`min-w-0` for sensible word-boundary wrapping; both anchors carry a red `focus-visible` outline rgba(208,2,5,0.55). No other file or section changed.

### Verification Evidence
- Runtime at 480 × 600 (dev server, computed geometry + real interactions) `[RUNTIME-VERIFIED]`: card order Version → Feature Highlights → Developer Information with the section's 20 px `space-y-5` gap; card radius 16 px / padding 16 px / bg rgba(255,255,255,0.28) matching the neighboring cards; attribution string exact; GitHub `href`, `target`, and `rel` exact, and a real click opened a new tab at the exact URL; email displayed exactly with the exact `mailto:` destination, single line; GitHub display text wrapped at 2 punctuation boundaries (no character-level wrapping, nothing overflowing the card); exactly one developer card rendered; Version and Feature Highlights content unchanged (5 feature items); keyboard Tab (real key events) reached the GitHub link and computed style showed the visible red focus outline rgba(208,2,5,0.55).
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (119,870 bytes); dist settings chunk contains the developer-card strings (`Developer Information:`, `mdnooor/Snippet-Organizer`, `md.nooor.hossain@gmail.com`) `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime (no extension host) and pixel-level visual review (screenshots cannot be viewed by this model) `[UNKNOWN]`.

---

## [2026-10-16] TRASH-CARD-01: Trash Item Card Layout, Text Wrapping, and Content Hierarchy

### Summary
Trash item cards crammed the title, category badge, expiry pill and deletion date into one band with the action buttons beside them, clipping the title and crushing the expiry label into a character-per-line column. Cards now follow the required vertical hierarchy — Title → Category badge → short display-only summary → Restore/Delete Forever → Remaining time → Deleted date.

### Root Cause `[RUNTIME-VERIFIED]`
The card's top band was a `flex justify-between` row: a narrow left column (`min-w-0 flex-1`) holding a wrapping title/badge/expiry-pill row plus the deletion date, and a ~206 px action-button group on the right. Inside the 244 px card the left column collapsed to ~35 px: the title truncated at `max-w-[200px]` and sat in the same y-band as the buttons (`buttonsOverlapTitleBand: true`), and the expiry pill's inner span was squeezed to a measured **22 × 40 px**, wrapping its label one or two characters per line. With less than a day of retention left, that label begins with "0d …", so the crushed column's fragment next to Restore read like a stray "0." marker.

### Marker Investigation `[RUNTIME-VERIFIED]`
A DOM-wide sweep of the trash card found no "0." text node, no ordered list (the container is a plain `div`), and no `::marker`/`::before` generated content (`src/index.css` contains none). Conclusion: the "0."-like mark was a wrapped fragment of the remaining-time label — no numbering or data indicator exists to preserve, and the fix removes the wrapping condition itself rather than hiding the symptom.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsView.tsx` — trash item card only: the shared band was replaced by the required vertical order: (1) full-width title (`break-words`, natural word wrapping, `truncate`/`max-w` removed; typography unchanged); (2) category badge with its exact previous styling; (3) a display-only summary of the first 7 words of the existing `stripHtml` preview inside the previous white/50 panel (stored snippet content is never modified); (4) Restore + Delete Forever in one row using their original classes (26 px each); (5) a readable "Remaining: {label}" text line (rose + "· Expiring soon" when near expiry; no narrow container); (6) "Deleted {date}" with the existing format. Handlers, retention math, sorting, and the empty state are untouched; no other file changed.

### Verification Evidence
- Runtime at 480 × 600 (dev server, computed geometry) `[RUNTIME-VERIFIED]`: a long-title stress card ("Quarterly Infrastructure …", moved to Trash for the test) wraps to 3 lines with `truncated: false`, no button overlap, buttons on one row at 26/26 px inside the card; a sweep of 5 trash cards returned `allOk: true` — correct order, no overlap, equal same-row buttons, within bounds, 6–7-word summaries, zero character-wrapping, zero digit fragments, readable "Remaining: 2d 23h left" / "Deleted Oct 17, 03:20 AM". Restore verified end-to-end ("Restored "Shipping Delay" to library" toast, snippet back in the main popup with all 5 original snippets); Delete Forever verified with its confirmation (the stress item was removed permanently); the retention banner and empty state are unchanged.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (119,238 bytes); dist settings chunk contains the new "Remaining:" label and the old title truncate class is absent `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and pixel-level visual review (no extension host; screenshots cannot be viewed by this model) `[UNKNOWN]`.

---

## [2026-10-16] SETTINGS-BACKUP-01: Restore / Import Backup Button Alignment and Layout

### Summary
The Restore / Import Backup card on the Settings Backup & Data page had misaligned, unevenly sized buttons and the file button overflowed the section. The card now uses the required two-column layout: stacked Merge/Replace on the left, a full-height File button on the right, under a bold Mode label.

### Root Cause `[RUNTIME-VERIFIED]`
All three controls shared one squeezed flex row: the segmented Merge/Replace All buttons (`py-0.5`) and the separately padded Choose File... button (`py-1.5`, pushed by `ml-auto`) had different heights by construction, the row's intrinsic width exceeded the narrow settings content column, so flex shrinking wrapped the longer labels — measured baseline: Merge 19 px, Replace All 35 px (label wrapped), Choose File... 46 px (wrapped), with the file button's right edge 37 px past the section's inner right boundary and `scrollWidth > clientWidth`.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsView.tsx` — Restore / Import Backup card only: the row became a CSS grid (`grid-cols-[1fr_auto]`, `gap-x-2 gap-y-1.5`). A bold `Mode` label sits on its own line above the group. Merge (row 1) and Replace (row 2 — visible label renamed from "Replace All"; the unchanged `setImportMode('replace')` handler is preserved) are identical `h-8` buttons stretching across the left column. File (visible label renamed from "Choose File..."; same Upload icon, same `fileInputRef` picker trigger, `title="Choose backup file"` added) occupies the right column with `row-span-2 h-full`, so the grid stretches it to exactly the two left buttons' combined height including the gap. `whitespace-nowrap` on all three prevents wrap-induced height changes. Title, description, section container, `nm-inset`/`nm-raised` state styling, colors, and typography are unchanged; no other file or section was touched.

### Verification Evidence
- Runtime at 480 × 600 (dev server, computed geometry) `[RUNTIME-VERIFIED]`: title "Restore / Import Backup" and description byte-identical; `Mode` bold (font-weight ≥ 700) directly above the group; Merge and Replace stacked with identical x/width and heights 32/32 px; File in the right column with its icon, 70 px = 32 + 6 + 32 exactly; visible labels exactly `Merge` / `Replace` / `File`; no text wrapping; all three buttons inside the section bounds; no horizontal scroll. Mode toggling verified both directions (active `nm-inset` styling moves between Merge and Replace). File opened the real file chooser (verified via file-chooser events); a valid `{ "snippets": [] }` backup imported through the picker with the success feedback "Imported 0 snippets successfully"; a non-JSON file produced the parse-error feedback; after closing Settings all 5 original snippets were intact and the other Backup sections (Export / Reset) unchanged.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (119,276 bytes); dist settings chunk contains the `row-span-2` grid and zero `Choose File`/`Replace All` strings `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and pixel-level visual review (no extension host; screenshots cannot be viewed by this model) `[UNKNOWN]`.

---

## [2026-10-16] SNIPPET-DROPDOWN-02: Keep Snippet Card Dropdown Above All UI Layers Without Clipping

### Summary
The snippet-card three-dot dropdown was clipped by the snippet list's scroll container whenever it opened upward — its top items fell behind the category tabs and were unclickable. The menu now renders in a body-level portal with fixed, trigger-anchored positioning and can no longer be clipped by any ancestor.

### Root Cause `[RUNTIME-VERIFIED]`
The menu was `position: absolute` inside the snippet card, which lives inside the list's `overflow-y-auto` container. An absolutely positioned descendant is always clipped by such an ancestor regardless of stacking order — the UI-MENU-STACK-01 upward flip moved the menu above the card but only moved the clip point to the container's top edge. Measured baseline: card 2's menu spanned y=184–346 while the list's top edge sat at y=209, so the top 25 px (including the "View snippet" item, y=191–219) were cut off and not hit-testable; only 138 of 162 px of the menu remained visible.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SnippetCard.tsx` — the menu panel renders through `createPortal(…, document.body)` with `position: fixed`, anchored to the trigger button: 6 px gap, right edges aligned, opening downward when `rect.bottom + 6 + 170 ≤ innerHeight` and anchored above the trigger otherwise (the same pattern as the editor's More-formatting menu from SNIPPET-FORM-01). Outside-click dismissal now ignores clicks in both the trigger wrapper and the portaled panel; a capture-phase `scroll` listener plus a `resize` listener reposition the open menu so it follows the trigger while the list scrolls. The old list-relative `resolveMenuDirection`/`openUpward` flip logic was removed. Menu appearance, options, actions, and the open-card z-20 elevation are unchanged; no other file was touched.

### Verification Evidence
- Runtime at 480 × 600 (dev server, computed geometry + hit-tests) `[RUNTIME-VERIFIED]`: card 2's menu renders in `document.body` (`position: fixed`), fully in-window at y=389–551 with a 6 px gap to the trigger and **all 5 items hit-testable**; card 1 opens downward (y=279–441) and card 5 upward (y=278–440), likewise fully visible and fully hit-testable — menus paint above neighboring cards in both directions; "View snippet" opens the correct preview ("Contact Support"); an outside `mousedown` dismisses; moving the pointer from the trigger into the open menu does not close it; scrolling the list with the menu open re-anchors it to the trigger (menu bottom 441 vs trigger top 446 after a 60 px scroll) and it stays within the window; after dismissal the popup is intact (25 px ring, 430 × 550 surface, 5 cards, search and tabs visible); 0 console errors.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (119,080 bytes); dist MainPopup chunk contains the body-portal call and zero occurrences of the removed `resolveMenuDirection`/`openUpward` logic `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and pixel-level visual review (no extension host; screenshots cannot be viewed by this model) `[UNKNOWN]`.

---

## [2026-10-16] SNIPPET-PREVIEW-01: Fix Snippet Details Modal Design Consistency

### Summary
The Snippet Details (preview) modal was the last in-popup interface still wearing the old gray-dim architecture. Its raised card was already the approved `glass-clay-surface` — the gray cast came entirely from the overlay behind it.

### Root Cause `[SOURCE-VERIFIED]` + `[RUNTIME-VERIFIED]`
The overlay used `bg-slate-900/40 backdrop-blur-xs`: a 40% gray layer plus a 4 px backdrop blur covering the whole popup. The white/20 glass card composited over that gray backdrop, producing the grayish appearance; the blurred popup content also remained faintly visible through the stack.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SnippetPreviewModal.tsx` — the overlay now reuses the approved flat red gradient (`glass-app-bg` — the exact class the Main Window uses; no new palette, no redefined values) with `overflow-hidden rounded-[26px]` so it is clipped to the popup surface's rounded silhouette (the surface has no `overflow-hidden` of its own; `fixed inset-0` resolves against the surface → backdrop covers exactly 430 × 550). The card and everything inside it — title, category pill, dates, `glass-inset` content body, Back/star/Edit/X controls, Copy button, dimensions (`max-w-[420px]`, centered, `max-h-[85vh]`), typography, and animations — is unchanged.
- `src/components/MainPopup.tsx` — the content-hiding wrapper condition extended to include `Boolean(previewSnippetId)`: the popup content is `display:none` while the preview is open, preventing bleed-through through the gradient's lower-alpha stops (same state-preserving isolation the Settings and editor pages use).
- **Not changed**: card styling/tokens, modal layout/content/positioning, snippet-card styling, data layer, window dimensions. Separate finding (reported, not fixed — out of scope): the standalone web demo page (`src/App.tsx:344`) has its own Installation-Guide modal still using the gray `slate-900/40` dim; it is not part of the extension popup UI.

### Verification Evidence
- Runtime at 480 × 600 (dev server, computed geometry + hit-tests) `[RUNTIME-VERIFIED]`: overlay (25, 25, 430 × 550) with radius 26 and clipping; red gradient class present, slate dim absent, no backdrop-filter; card 398 × 342 horizontally centered; 0 popup elements painting behind the modal; corner-notch probe resolves to the app background.
- Previews opened for three different snippets (Shipping Delay, Contact Support, Refund Approved) — all render the red gradient with full content (title, dates, category pill, body); Back and X both close; favorite toggles from the modal; Copy shows the "Copied!" state; Edit opens the editor with the preview unmounted; long content clamps the card to 510 px (max-h) with a working 1311 px scroll in the body; closing restores the popup exactly (25 px ring, 5 cards).
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (119,022 bytes); dist check: the MainPopup chunk contains `glass-app-bg=1` and zero `slate-900/40 backdrop-blur-xs` occurrences `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and pixel-level visual review (no extension host; screenshots cannot be viewed by this model) `[UNKNOWN]`.

---

## [2026-10-16] SNIPPET-FORM-01: Implement and Polish New Snippet / Edit Snippet Pages with Strict Design Consistency

### Summary
The New Snippet and Edit Snippet pages (the `SnippetEditorModal`) were still the old floating-card-over-dim architecture that SETTINGS-ISO-01 had already removed from Settings — and at the fixed 480 × 600 viewport it was measurably broken, not just inconsistent.

### Initial State (baseline, runtime-measured) `[RUNTIME-VERIFIED]`
- Gray `bg-slate-900/40 backdrop-blur-xs` dim over the popup with a floating `max-w-[460px]` `glass-clay-surface` card rendering **391 × 755 — 217 px taller than the 430 × 550 popup surface**.
- The Save button sat at **y = 724–772, entirely below the 600 px window**; reaching it required scrolling the whole dim overlay by 229 px (the footer-actions-below-the-fold defect).
- All 5 snippet cards ghosted through the semi-transparent dim + glass card; the square-cornered unclipped overlay painted the popup surface's rounded corner notches (same two root causes SETTINGS-ISO-01 documented for Settings).
- Already correct: all form fields (Title, Category + inline creation, Category Color, rich-text Content with toolbar + char count, Snippet Actions, Cancel/Save), validation, duplicate/delete flows, data model, and persistence — no functional rework was needed.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SnippetEditorModal.tsx` — replaced the dim + floating card with the Settings isolation architecture: a transparent `fixed inset-0 z-50 overflow-hidden rounded-[26px] p-5 flex flex-col` clipper (no own background, no own clay surface; `fixed inset-0` resolves against the popup surface → the page fills exactly 430 × 550 with the app's 25 px ring visible). Page structure: pinned header; the form as a flexible column whose field region scrolls in its own `overflow-y-auto` region; the validation error and Cancel/Save actions pinned below it (`shrink-0`), so they can never be clipped. All field markup, `nm-*` classes, and handlers preserved unchanged.
- `src/components/SnippetEditorModal.tsx` (functional fix) — the floating More-formatting menu (`fixed z-[100]`) opened downward from the toolbar and its bottom reached y = 665, clipped by the window (the toolbar sits lower now that the form is a full page). It now uses the same upward-flip rule as the snippet-card menus (UI-MENU-STACK-01): anchored below the button when `bottom + 6 + 240 ≤ innerHeight`, otherwise anchored above it.
- `src/components/MainPopup.tsx` — the content-hiding wrapper's condition extended from `isSettingsOpen` to `isSettingsOpen || editorState.isOpen`, so the popup content is `display:none` (state-preserving) while either page is open.
- **Not changed**: SnippetPreviewModal (out of scope — still its own approved dim-overlay design), the data layer, validation rules, persistence, keyboard shortcuts, all field semantics, Main Popup/Settings styling, window dimensions, and the locked design tokens.

### Verification Evidence
- Runtime at 480 × 600 (dev server, computed geometry + hit-tests) `[RUNTIME-VERIFIED]`: both pages render at exactly (25, 25, 430 × 550), transparent clipper (`rgba(0,0,0,0)`, no background image, radius 26), **0 popup elements painting** behind them, corner-notch probe resolving to the app background, exactly 1 gradient layer in the tree; Save button visible at y = 507–555 in both modes.
- Functional (real interactions): Edit loads the correct snippet ("Shipping Delay", 153 chars) and saves the intended record (typed marker persisted to that card); New creates a snippet end-to-end (appears in the list); whitespace-only title shows the pinned "Title is required." error and keeps the page open (empty title is caught by the native `required` attribute first); long content keeps the editor clamped to its max-height with a scrollable field region while actions stay pinned; Duplicate shows feedback, appends "(Copy)", disables Delete, and saving creates the copy; Delete with confirm moves the snippet to trash; Cancel/Back close without saving; category dropdown fully visible; More-formatting menu flips above the toolbar (y = 122–348) with all 7 items hit-testable; popup restored intact (25 px ring, cards) after close; Settings unaffected through the shared wrapper.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (119,032 bytes); dist checks: the rounded-clipper signature present 2× (Settings + editor), the old editor dim signature absent `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and pixel-level visual review (no extension host; screenshots cannot be viewed by this model) `[UNKNOWN]`. Pre-existing gap reported, not fixed (out of scope): the preview modal has no Escape-to-close handler (documented in `DESIGN_SYSTEM.md` Section 12).

---

## [2026-10-16] SETTINGS-ISO-01: Isolate the Settings Page and Unify the Shared Background Design

### Summary
The SETTINGS-VP-01 overlay architecture left Settings with two visual defects at runtime: the main popup's content stayed faintly visible behind the Settings UI, and unwanted red fragments appeared around the Settings surface's rounded corners. Both came from Settings painting its **own** background and **own** raised card inside the popup's tree, instead of reusing the application's existing two-layer design.

### Root Causes `[SOURCE-VERIFIED]` + `[RUNTIME-VERIFIED]`
1. **Popup content ghosting through** — the Settings overlay's `glass-app-bg` gradient runs alpha 0.9 → 0.1 (nearly transparent at the bottom), and both glass layers are `rgba(255,255,255,0.2)` with `backdrop-filter: blur(5px)`. The full-opacity popup content sat directly beneath this semi-transparent stack.
2. **Corner fragments** — the overlay was square-cornered and unclipped: the MainPopup surface (`glass-clay-surface`, 26 px radius) has **no `overflow-hidden`**, so nothing clipped the overlay to the rounded silhouette. The opaque gradient painted past the surface's rounded corners, and the modal's second `glass-clay-surface` card double-stacked outer shadows and inset highlights over the surface's own.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsModal.tsx` — removed the overlay's own `glass-app-bg` background **and** its inner `glass-clay-surface` card. The modal is now a transparent `fixed inset-0 z-50 overflow-hidden rounded-[26px]` clipper that renders `SettingsView` directly: `fixed inset-0` resolves against the popup surface (its `backdrop-filter` is the containing block), so bounds remain exactly (25, 25, 430 × 550); `rounded-[26px]` + `overflow-hidden` preserve the identical corner clipping the deleted card provided.
- `src/components/MainPopup.tsx` — the popup content (Header, SearchAndFilters, snippet list, Footer) is wrapped in a box-free `display:contents` container that becomes `display:none` while Settings is open. Content stays mounted, so search text, selection, and scroll survive the round trip; the visible layout when Settings is closed is byte-identical (`display:contents` contributes no box).
- **Not changed**: the `glass-app-bg`/`glass-clay-surface` locked tokens, the window dimensions (480 × 600, 25 px ring), the popup surface styling, SettingsView internals (sidebar 123 px, vertical rows, controls), editor/preview modals, the standalone `settings.html` page, and all settings behavior/persistence.

### Verification Evidence
- Resulting hierarchy — the whole tree contains **exactly one** `linear-gradient` layer (the app root `glass-app-bg`) and **one** raised surface (MainPopup's `glass-clay-surface`); Settings contributes no background at all (computed `background-color: rgba(0, 0, 0, 0)`, no background image) `[RUNTIME-VERIFIED]`.
- With Settings open at 480 × 600: zero popup elements paint (cards, header, list region all report no client rects); a hit-test over the former snippet-list area resolves inside Settings; a probe inside the surface's bounding box but outside its 26 px corner radius resolves to the **app background** — no element paints the corner notch, so the extra corner shapes are gone.
- Dimensions preserved: settings clipper (25, 25, 430 × 550), surface 430 × 550 with the exact 25 px ring, sidebar 123 px.
- Regression: closing Settings restores the popup with the pre-open search text ("refund") and filtered result list intact; theme toggle works through the new container and reverts; the snippet-card menu → preview modal flow still works; no console errors from the change.
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; documented `Compress-Archive` fallback repack (118,962 bytes); dist check: the new transparent-container signature present in the MainPopup chunk, the old `glass-app-bg animate-in fade-in` overlay signature absent `[COMMAND-VERIFIED]`.
- Not verified: the loaded Chrome extension runtime and true pixel-level visual review (no extension host; screenshots cannot be viewed by this model) — all layering claims rest on computed geometry, computed styles, and hit-tests `[UNKNOWN]`.

---

## [2026-10-16] SETTINGS-VP-01: Settings Page Full-Viewport Optimization with Conditional UI Repair

### Summary
The Settings modal was designed for the old ~620 px-wide layout and rendered cramped inside the fixed 480 × 600 window. Baseline (runtime-measured): the overlay dimmed the popup with gray `bg-slate-900/40 backdrop-blur-xs` (no red gradient) and inset a `p-3` ring around a `max-w-[620px] × h-[580px]` card that actually rendered **406 × 540**; the `w-44` (176 px) sidebar left content rows ~133 px wide; horizontal overflow measured **+74 px** (General, Backup & Data), **+14 px** (Shortcuts), **+55 px** (About); Interface Theme's segmented picker crushed its row text to 48 px and Default View's dropdown to 47 px.

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsModal.tsx` — overlay now fills the popup surface with the locked red gradient (`glass-app-bg`) and the raised `glass-clay-surface` occupies exactly **430 × 550** — the same geometry as the main popup surface, so Settings reads as another page of the same application with the app's own 25 px flat-background ring visible around it. Key implementation detail: `fixed inset-0` resolves against the popup **surface** (its `backdrop-filter` makes it the containing block), so no padding is added inside it — the ring comes from the app background, and a `p-[25px]` overlay would have *shrunk* the card to 380 × 500 (attempted and rejected during verification).
- `src/components/SettingsView.tsx` — sidebar `w-44 sm:w-48` (176/192 px) → **`w-[123px] sm:w-[134px]`** (× 0.70), releasing ~53 px to the content column (224 → 292 px scroll region); nav items use slightly tighter padding (`p-2`, `px-2`, `gap-2`) and labels wrap (`min-w-0 leading-tight` instead of `truncate`) so no navigation label is ellipsized; **only the two rows that remained broken after Steps 1–3** were converted to vertical title → description → control layout: **Interface Theme** (200 px picker + 48 px text, +38 px overflow) and **Startup Filter Tab / Default View** (89 px text column narrower than its own 122 px dropdown, awkward fragmentation). All other rows kept their horizontal layout per the inspect-first decision rule.
- **Not changed**: browser window dimensions or window management, main popup, snippet editor/preview modals, settings business logic/persistence, all `nm-*` design tokens, standalone `settings.html` page structure (inherits the same SettingsView and sidebar widths).

### Verification Evidence
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success (documented `Compress-Archive` fallback; zip 118,914 bytes); dist checks: `w-[123px]` in the SettingsView chunk, `glass-app-bg` overlay in the MainPopup chunk, `max-w-[580px]` absent `[COMMAND-VERIFIED]`.
- Runtime at 480 × 600 (dev server, Playwright computed geometry) `[RUNTIME-VERIFIED]`:
  - After Steps 1–3 the card is 430 × 550 at (25, 25) with the red gradient behind and every tab measured **0 horizontal overflow** (was 74/14/55 px).
  - Step 4 inspection of every section (General: Appearance, Search Scope, Behavior, Default View; Shortcuts incl. Manage row; Backup & Data incl. Import row; Categories; Trash; About): all fit horizontally **except** the two rows converted in Step 5.
  - Step 5 post-check: Interface Theme text spans 210 px with the picker below inside its section; Startup Filter Tab text spans 210 px with the dropdown below; both inside section bounds, no overflow.
  - Sidebar: 123 px; all six labels readable, none truncated ("Backup & Data" wraps to two clean lines).
  - Regression: theme Light → Dark → **persisted across page reload** → reverted; Default View set to Favorites and back to All; Shortcuts tab renders 8 kbd indicators with the Manage button inside bounds; auto-save toast fires; closing Settings restores the main popup intact (ring exactly 25 px, surface 430 × 550, settings unmounted).
- Not verified: the loaded Chrome extension runtime (no extension host in this environment) `[UNKNOWN]`; screenshots were captured for the record but could not be visually reviewed in this session (model limitation) — all claims above rest on measured geometry, not screenshots.

---

## [2026-10-16] UI-MENU-STACK-01: Fix Snippet-Card Three-Dot Dropdown Overlap & Clickability

### Summary
Bug fix: the three-dot (⋮) dropdown on snippet cards rendered behind neighboring cards and was clipped near the list's top/bottom edges, making options unreliable to hover or click. Root cause was stacking semantics, not a missing `z-index`: **every snippet card is a stacking context** because `.nm-static-inset-card` applies `backdrop-filter: blur(5px)` (a non-`none` `backdrop-filter` creates a stacking context). The menu's `z-40` therefore only competed *inside its own card*; sibling cards (painted later in DOM order at `z-index: auto`) painted over the open menu wherever they overlapped. Independently, the snippet list is the locked only-scroll region (`overflow-y-auto`), so an absolutely positioned menu opening downward was clipped at the list's bottom edge for cards near it.

### Source Changes `[SOURCE-VERIFIED]` (single file: `src/components/SnippetCard.tsx`)
- **Stacking**: the card root now gets `z-20` while its menu is open, elevating the card's whole stacking context (menu included) above sibling cards — no global z-index arms race, no new stacking contexts.
- **Clipping**: the open direction is resolved per-open from live geometry — if the trigger sits within ~200 px of the scroll container's bottom edge (menu ≈ 162 px tall + margin), the menu opens upward (`bottom-9` instead of `top-9`); the container is found via `closest('[aria-label="Snippets list"]')` with a `window.innerHeight` fallback for non-popup contexts.
- **Not changed**: menu options, actions, dismissal logic (`mousedown`-outside on the wrapper ref still covers both button and menu), trigger button and panel styling, card design values, list scrolling, all other components.

### Verification Evidence
- `npm.cmd run lint` (`tsc --noEmit`) → 0 errors; `npm.cmd run build` → vite success (packaging python3 limitation unchanged → documented `Compress-Archive` fallback; zip refreshed, 118,917 bytes); dist spot-check: `bottom-9` flip + `z-20` elevation present in the built `MainPopup` chunk `[COMMAND-VERIFIED]`.
- Runtime (dev server `popup.html` at 480 × 600, Playwright with **real pointer events**) `[RUNTIME-VERIFIED]`:
  - Top card: menu opens downward, overlaps the next card, and a hit-test at a point over card 2 resolves **inside the menu** ("Edit snippet") — the open card wins the stacking order.
  - Bottom card: menu flips **upward**, fully inside the list viewport (no scroll clipping) and the 480 × 600 app viewport; all 6 sampled points (incl. over the previous card and near both menu edges) resolve inside the menu.
  - All 5 options ("View snippet", "Edit snippet", "Copy snippet", "Add favorite", "Move to trash") hoverable via real pointer moves with passing hit-tests; "View snippet" click opened the preview modal and it closed via "Back"; "Copy snippet" click closed the menu via the action path.
  - Outside-click dismissal intact; list scrolls to both ends; 25 px ring exact on all four sides; footer visible; no document overflow; no console errors from the change.
- Not runtime-clicked: "Add favorite" / "Move to trash" (hover + hit-test only, same code path as the two click-proven actions); clipboard-write success is environment-dependent; real Chrome extension runtime re-check pending as for prior tasks `[UNKNOWN]`.

---

## [2026-10-16] UI-WINDOW-LOCK-04: Synchronize Floating Browser Window with the 480 × 600 Background Layout (Frame Compensation)

### Summary
Bug fix: the background layout requires a **480 × 600 content viewport**, but `chrome.windows.create/update` interpret `width`/`height` as the **outer window size including the browser frame** (caption bar + borders), and `onBoundsChanged` reports outer bounds too — so a floating window created at exactly 480 × 600 outer shows less than 480 × 600 of content and clipped the fixed canvas (footer) on real Chrome. The layout numbers themselves were correct and unchanged; the window sizing semantics were the defect. `chrome.windows` has no content-size API and no `resizable` option, so the closest supported fix is runtime frame compensation.

### Source Changes `[SOURCE-VERIFIED]`
- `src/popup.tsx` — in floating mode, reports the measured frame delta once on load: `CALIBRATE_FLOATING_FRAME` with `{ width: outerWidth − innerWidth, height: outerHeight − innerHeight }` (guarded so the web demo no-ops).
- `public/service-worker.js` — `FIXED_WINDOW_WIDTH/HEIGHT` clarified as the required **content** viewport (480 × 600); new `floatingFrameDelta` state hydrated from `storage.session` (sanity-bounded 0–200 px per axis); `createNewFloatingWindow` creates at `compensatedOuterSize()` = layout + delta; new `CALIBRATE_FLOATING_FRAME` handler caches the delta and resizes the window once; the `onBoundsChanged` soft lock now enforces the **compensated outer size** (previously it would have snapped the compensation back to the raw outer 480 × 600 and re-clipped the content).
- **Not changed**: the 480 × 600 layout, the exact 25 px ring, the 430 × 550 raised popup, all design values, docked-mode behavior, permissions, window architecture, position persistence.

### Documentation Changes `[SOURCE-VERIFIED]`
- `docs/project-knowledge/DECISIONS.md` — ADR-002 Amendment 3 extended with the outer-vs-content dimension distinction and the frame-compensation mechanism + index row.
- `AGENTS.md`, `docs/project-knowledge/README.md` §5.2 — viewport non-negotiable updated with frame compensation.
- `ARCHITECTURE.md` (entry table, `OPEN_FLOATING_WINDOW` protocol, §7.6), `INTEGRATIONS.md` (create/update lines + new message), `FEATURES.md` (implementation highlights) — updated.
- `docs/tasks/BACKLOG.md` — UI-WINDOW-LOCK-04 row (VERIFIED); active status refreshed.
- `docs/tasks/UI-WINDOW-LOCK-01/HANDOFF.md` — addendum appended for UI-WINDOW-LOCK-04.

### Verification Evidence
- `node --check public/service-worker.js` → exit 0; `npm.cmd run lint` (`tsc --noEmit`) → **0 errors**; `npm.cmd run build` → `vite build` success (packaging python3 limitation unchanged → documented `Compress-Archive` fallback; zip refreshed, 118,818 bytes); dist spot-checks: `CALIBRATE_FLOATING_FRAME` handler in `dist/service-worker.js` (×2 incl. comment), `compensatedOuterSize` (×4), calibration sender present in the built popup chunk `[COMMAND-VERIFIED]`.
- Dev-server regression at exactly 480 × 600 (Playwright computed geometry, both modes): layout pixel-identical to the LOCK-03 state — background `padding: 25px`, card 430 × 550, ring exactly 25/25/25/25, footer fully inside, list scrolls internally, no document overflow; console clean except the pre-existing favicon 404, confirming the calibration send is skipped safely outside the extension `[RUNTIME-VERIFIED]`.
- Real-Chrome frame behavior NOT verified — no extension host in this environment: the actual caption-bar/border delta, the one-time compensation snap on first open, and the compensated soft lock remain `[UNKNOWN]`; manual verification required (load the extension, open the floating window, confirm the full background and footer are visible with no clipping, then attempt a resize and confirm snap-back to the compensated size).

---

## [2026-10-16] UI-WINDOW-LOCK-03: Fixed 480 × 600 Window with Exactly 25px Outer Padding

### Summary
Two targeted adjustments to the approved fixed layout: (1) the fixed application viewport is now **480 × 600 px** in both docked and floating modes, with the service worker's exact two-way size lock updated accordingly; (2) the `src/popup.tsx` background root padding was raised from 10 px to **exactly `p-[25px]`**, so the flat main background shows as an exact 25 px ring on all four sides around the raised popup. The raised popup (`.glass-clay-surface` in `MainPopup.tsx`) is now **`w-[430px] h-[550px]`** — precisely the specified inner area (480 − 2×25 × 600 − 2×25). Box model is safe: the card uses explicit utility dimensions inside the fixed `overflow-hidden` root, and borders/padding cannot grow the outer window. **No design values changed** (radius, shadows, blur, colors, typography, header/footer/cards); no responsive sizing reintroduced; no unrelated functionality touched.

### Source Changes `[SOURCE-VERIFIED]`
- `popup.html` — fixed canvas `html, body { width: 480px; height: 600px }` (both modes).
- `src/popup.tsx` — unconditional 480 × 600 inline sizing; background root → `glass-app-bg w-[480px] h-[600px] p-[25px] overflow-hidden` (padding on the background/container layer, not inside the raised popup).
- `src/components/MainPopup.tsx` — raised card `w-[460px] h-[560px]` → `w-[430px] h-[550px]` (dimensions only; all styling classes unchanged).
- `public/service-worker.js` — `FIXED_WINDOW_HEIGHT = 600` (create + exact two-way `onBoundsChanged` clamp); comments updated.
- **Not changed**: manifest/permissions, window type/architecture, all visual design values, snippet/storage/search/settings logic, modals, position persistence.

### Documentation Changes `[SOURCE-VERIFIED]`
- `docs/project-knowledge/DECISIONS.md` — ADR-002 Amendment 3 updated to the final state (480 × 600 viewport, exact 25 px ring, 430 × 550 raised popup; UI-WINDOW-LOCK-03 noted) + index row.
- `AGENTS.md`, `docs/project-knowledge/README.md` §5.2 — viewport non-negotiable updated.
- `ARCHITECTURE.md` (entry table, `OPEN_FLOATING_WINDOW` protocol, §7.6), `PROJECT_BRIEF.md`, `FEATURES.md`, `INTEGRATIONS.md`, `docs/design/DESIGN_SYSTEM.md` (§1 layout bullet, §10.6), `docs/design/SCREEN_REGISTRY.md`, `docs/design/INTERACTION_FLOWS.md`, `docs/project-knowledge/UI_REGISTRY.md` §7 — updated to 480 × 600 + exact 25 px ring.
- `docs/tasks/BACKLOG.md` — UI-WINDOW-LOCK-03 row (VERIFIED); UI-WINDOW-LOCK-02 marked adjusted; active status refreshed.
- `docs/tasks/UI-WINDOW-LOCK-01/HANDOFF.md` — addendum appended for UI-WINDOW-LOCK-03.

### Verification Evidence
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors**; `npm.cmd run build` → `vite build` success (packaging python3 limitation unchanged → documented `Compress-Archive` fallback; zip refreshed, 117,711 bytes); dist spot-checks confirm `width:480px;height:600px`, `FIXED_WINDOW_HEIGHT = 600`, the `w-[430px] h-[550px]` card, and the `p-[25px]` utility `[COMMAND-VERIFIED]`.
- Dev-server runtime (Playwright computed geometry, viewport exactly 480 × 600): background 480 × 600 with `padding: 25px`; raised card 430 × 550 at (25,25); **flat ring measured exactly 25/25/25/25 in both docked and floating modes**; card radius/background/blur/shadow unchanged; header, list, and footer all contained within the card; footer fully inside with the design 20 px margin and no overlap with the list; snippet list scrolls internally (529 > 301); **no horizontal or vertical document overflow**; console shows only the pre-existing favicon 404 `[RUNTIME-VERIFIED]`.
- Real-Chrome window behavior (600 px create size, snap-back, outer-frame units, and the visual 3D appearance in the loaded extension) NOT verified — source/dev-server level only `[UNKNOWN]`.

---

## [2026-10-16] UI-WINDOW-LOCK-02: Height 560 → 580 px + Restored Visible Flat-Background Ring

### Summary
Two targeted adjustments to the approved fixed layout: (1) the fixed application viewport height is now **580 px** (width unchanged at 480 px) in both docked and floating modes, with the service worker's exact two-way size lock updated to 480 × 580; (2) the `src/popup.tsx` background root received **`p-[10px]`** so the flat main background is again visible as a balanced 10 px ring on all four sides around the raised popup, restoring the layered 3D claymorphism appearance. The raised popup (`.glass-clay-surface` in `MainPopup.tsx`) is now `w-[460px] h-[560px]` — the +20 px height funds the vertical ring, so the verified 520 px inner content height is unchanged and the footer stays fully visible. **No design values changed** (radius, shadows, blur, colors, typography, header/footer/cards); no responsive sizing reintroduced; no unrelated functionality touched.

### Source Changes `[SOURCE-VERIFIED]`
- `popup.html` — fixed canvas `html, body { width: 480px; height: 580px }` (both modes).
- `src/popup.tsx` — unconditional 480 × 580 inline sizing; background root → `glass-app-bg w-[480px] h-[580px] p-[10px] overflow-hidden` (the padding sits on the background/container layer, not inside the raised popup).
- `src/components/MainPopup.tsx` — raised card `w-[480px] h-[560px]` → `w-[460px] h-[560px]` (only the width changed; height and all styling classes unchanged).
- `public/service-worker.js` — `FIXED_WINDOW_HEIGHT = 580` (create + exact two-way `onBoundsChanged` clamp); comments updated.
- **Not changed**: manifest/permissions, window type/architecture, all visual design values, snippet/storage/search/settings logic, modals, position persistence.

### Documentation Changes `[SOURCE-VERIFIED]`
- `docs/project-knowledge/DECISIONS.md` — ADR-002 Amendment 3 updated to the final state (480 × 580 viewport, 10 px ring, 460 × 560 raised popup; UI-WINDOW-LOCK-02 noted) + index row.
- `AGENTS.md`, `docs/project-knowledge/README.md` §5.2 — viewport non-negotiable updated.
- `ARCHITECTURE.md` (entry table, `OPEN_FLOATING_WINDOW` protocol, §7.6), `PROJECT_BRIEF.md`, `FEATURES.md`, `INTEGRATIONS.md`, `docs/design/DESIGN_SYSTEM.md` (§1 layout bullet, §10.6), `docs/design/SCREEN_REGISTRY.md`, `docs/design/INTERACTION_FLOWS.md`, `docs/project-knowledge/UI_REGISTRY.md` §7 — updated to 480 × 580 + ring.
- `docs/tasks/BACKLOG.md` — UI-WINDOW-LOCK-02 row (VERIFIED); UI-WINDOW-LOCK-01 marked adjusted; active status refreshed.
- `docs/tasks/UI-WINDOW-LOCK-01/HANDOFF.md` — addendum appended for UI-WINDOW-LOCK-02.

### Verification Evidence
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors**; `npm.cmd run build` → `vite build` success (packaging python3 limitation unchanged → documented `Compress-Archive` fallback; zip refreshed, 117,669 bytes); dist spot-checks confirm `width:480px;height:580px`, `FIXED_WINDOW_HEIGHT = 580`, and the `w-[460px] h-[560px]` card `[COMMAND-VERIFIED]`.
- Dev-server runtime (Playwright computed geometry, viewport exactly 480 × 580): background 480 × 580 with `padding: 10px`; raised card 460 × 560 at (10,10); **flat ring measured 10/10/10/10 in both docked and floating modes**; card radius/background/blur/shadow unchanged; footer fully inside with the design 20 px margin; snippet list scrolls internally (529 > 311); **no horizontal or vertical document overflow**; console shows only the pre-existing favicon 404 `[RUNTIME-VERIFIED]`.
- Real-Chrome window behavior (580 px create size, snap-back, outer-frame units, and the visual 3D appearance in the loaded extension) NOT verified — source/dev-server level only `[UNKNOWN]`.

---

## [2026-10-16] UI-WINDOW-LOCK-01: Fixed 480 × 560 px Application Viewport (Both Modes) + Overflow Containment

### Summary
Replaced the responsive 772 × 572 system with **one fixed 480 × 560 px application viewport** (the entire outer window) shared by docked and floating modes — supersedes the 30 px outer-spacing work (UI-SPACING-01/02). The popup card now fills the viewport edge to edge (`w-[480px] h-[560px]`) with **no outer spacing**; no responsive sizing exists anywhere. The floating window is **size-locked** at exactly 480 × 560 by the existing `chrome.windows.onBoundsChanged` listener: any deviation in either direction snaps back immediately via `chrome.windows.update` (`chrome.windows` has no `resizable` option for extension popup windows — soft lock, documented as the closest supported behavior; not runtime-verifiable without a real Chrome host). Footer/static-card overflow fixed at the root: the snippet list is the only scroll region (`flex-1 min-h-0 overflow-y-auto`, removing `max-h-[460px] min-h-[220px]`), keeping the footer pinned inside the viewport. **Approved design untouched**: radius, shadows, blur, translucency, typography, header/footer/card appearance all unchanged.

### Source Changes `[SOURCE-VERIFIED]`
- `popup.html` — fixed `html, body { width: 480px; height: 560px }` for both modes; removed the `html.floating` responsive rules.
- `src/popup.tsx` — unconditional 480 × 560 sizing; background root `glass-app-bg w-[480px] h-[560px] overflow-hidden` (removed `popup-shell-canvas`, `p-[30px]`, flex-centering).
- `src/index.css` — removed the UI-SPACING-02 responsive rule (`.popup-shell-canvas > .glass-clay-surface`); no locked value touched.
- `src/components/MainPopup.tsx` — card `w-[712px] max-w-[712px] h-[512px]` → `w-[480px] h-[560px]`; snippet list → `flex-1 min-h-0 overflow-y-auto` (footer-containment fix).
- `public/service-worker.js` — `FIXED_WINDOW_WIDTH = 480` / `FIXED_WINDOW_HEIGHT = 560`; create uses them; `onBoundsChanged` performs an immediate exact two-way size restore; debounced position save unchanged.
- **Not changed**: manifest/permissions, window type/architecture, all visual design values, snippet/storage/search/settings logic, modals.

### Documentation Changes `[SOURCE-VERIFIED]`
- `docs/project-knowledge/DECISIONS.md` — **ADR-002 Amendment 3** (fixed 480 × 560 viewport, two-way soft lock, overflow containment) + index row; Amendment 2 marked superseded.
- `AGENTS.md`, `docs/project-knowledge/README.md` §5.2 — viewport non-negotiable updated to the fixed 480 × 560 shared viewport.
- `ARCHITECTURE.md` (entry table, `OPEN_FLOATING_WINDOW` protocol, §7.6 HTML-level styling), `PROJECT_BRIEF.md`, `FEATURES.md`, `INTEGRATIONS.md`, `docs/design/DESIGN_SYSTEM.md` (§1 layout bullet, §10.6), `docs/design/SCREEN_REGISTRY.md`, `docs/design/INTERACTION_FLOWS.md`, `docs/project-knowledge/UI_REGISTRY.md` §7 — updated to the fixed-viewport model.
- `docs/tasks/BACKLOG.md` — UI-WINDOW-LOCK-01 row (VERIFIED); UI-SPACING-01/02 marked superseded; active status refreshed.
- `docs/tasks/UI-WINDOW-LOCK-01/HANDOFF.md` — **created** (root causes, mechanism and platform limitation, containment fix, verification, real-Chrome manual-test list).

### Verification Evidence
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors** `[COMMAND-VERIFIED]`.
- `npm.cmd run build` → `vite build` **success**; packaging python3 limitation unchanged → documented `Compress-Archive` fallback; zip refreshed (117,618 bytes); `dist/popup.html`, `dist/service-worker.js`, and the `MainPopup` chunk spot-checked for 480/560 `[COMMAND-VERIFIED]`.
- Dev-server runtime (Playwright computed geometry, viewport exactly 480 × 560): docked and floating pages pixel-identical — card exactly 480 × 560 at (0,0), radius 26 px, locked surface values unchanged; footer fully inside with the design `p-5` margins and **no overlap** (list bottom 495 < footer top 509); snippet list scrolls internally (529 > 311); **no horizontal or vertical document overflow**; web demo card also 480 × 560; settings page untouched; console shows only the pre-existing favicon 404 `[RUNTIME-VERIFIED]`.
- Real-Chrome floating-window behavior (create size, snap-back on resize attempts, outer-frame units) NOT verified — source-level only `[UNKNOWN]`; listed for manual testing in `docs/tasks/UI-WINDOW-LOCK-01/HANDOFF.md` §5.

---

## [2026-10-16] UI-SPACING-02: 30 px Outer Background Spacing + Floating-Window Maximum & Responsive Behavior

### Summary
Increased the outer flat-background gap from 10 px to **30 px on all four sides**, making the complete flat-background layout **772 × 572 px** (= 712 + 2×30 × 512 + 2×30). Constrained the floating window to that maximum (soft clamp via the existing `onBoundsChanged` listener + `chrome.windows.update`; `chrome.windows` has no declarative maxWidth/maxHeight for extension popup windows) and made smaller windows adapt responsively: the floating canvas now fills the live viewport and the popup surface shrinks (scoped `max-width/max-height: 100%`) while keeping the 30 px ring. **The protected popup is untouched** — `.glass-clay-surface` keeps its exact classes, 712 × 512 px dimensions, radius, padding, and locked shadows; no new window architecture, no manifest changes.

### Source Changes `[SOURCE-VERIFIED]`
- `popup.html` — docked canvas 732×532 → **772×572**; NEW `html.floating, html.floating body, #root { width/height: 100% }` rules (the `#root` height pass-through is required for the responsive percentage chain — a broken chain was found and fixed during runtime verification).
- `src/popup.tsx` — conditional JS sizing (docked: fixed 772×572; floating: `100%`); background root → `glass-app-bg popup-shell-canvas w-full h-full p-[30px] overflow-hidden flex items-center justify-center`.
- `src/index.css` — NEW additive scoped rule `.popup-shell-canvas > .glass-clay-surface { max-width/max-height: 100% }` (no locked value altered; scoped so the settings page — which nests a `.glass-clay-surface` directly under its own `.glass-app-bg` root — and the web demo are unaffected, both runtime-verified).
- `public/service-worker.js` — derived constants `MAX_FLOATING_WIDTH (772)` / `MAX_FLOATING_HEIGHT (572)`; `createNewFloatingWindow` uses them; max clamp added inside the existing `onBoundsChanged` listener (scoped to `floatingWindowId`, `state === 'normal'`) via `chrome.windows.update`.
- **Not changed**: `src/components/MainPopup.tsx`, manifest, window modes/architecture, all logic and features.

### Documentation Changes `[SOURCE-VERIFIED]`
- `docs/project-knowledge/DECISIONS.md` — **ADR-002 Amendment 2** (30 px gap, 772 × 572 complete layout, max clamp + responsive behavior) + index row.
- `AGENTS.md`, `docs/project-knowledge/README.md` §5.2 — viewport non-negotiable updated to the 772 × 572 complete layout with clamp/responsive notes.
- `ARCHITECTURE.md` (entry table, `OPEN_FLOATING_WINDOW` protocol, §7.6 HTML-level styling), `PROJECT_BRIEF.md`, `FEATURES.md`, `INTEGRATIONS.md`, `docs/design/DESIGN_SYSTEM.md` (§1 layout bullet, §10.6), `docs/design/SCREEN_REGISTRY.md`, `docs/design/INTERACTION_FLOWS.md`, `docs/project-knowledge/UI_REGISTRY.md` §7 — updated to the complete-layout model.
- `docs/tasks/BACKLOG.md` — UI-SPACING-02 row (VERIFIED); UI-SPACING-01 marked superseded; active status refreshed.
- `docs/tasks/UI-SPACING-02/HANDOFF.md` — **created** (element ownership, mechanism and limits, responsive fallback, verification, extension-host caveats).

### Verification Evidence
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors** `[COMMAND-VERIFIED]`.
- `npm.cmd run build` → `vite build` **success** (1675 modules); packaging python3 limitation unchanged → documented `Compress-Archive` fallback; zip refreshed (117,679 bytes); `dist/popup.html` + `dist/service-worker.js` spot-checked for the new values `[COMMAND-VERIFIED]`.
- Dev-server runtime (Playwright computed geometry): docked `/popup.html` — body 772×572, background `padding: 30px`, popup (30,30) **712 × 512** with unchanged classes/radius/shadows/backdrop, **gap 30/30/30/30**, no overflow. Floating `?mode=floating` — body `100%`; 700×520 → popup **640×460**, gap 30/30/30/30, background covers viewport, no overflow, snippet list still scrollable; 620×460 after a live no-reload resize → popup **560×400**, gap 30/30/30/30. Web demo popup still 712×512 (`max-height: none`); settings surface unchanged; console shows only the pre-existing favicon 404 `[RUNTIME-VERIFIED]`.
- Extension-host runtime (real floating-window clamp, docked popup sizing, `chrome.windows` frame-unit semantics) NOT verified — source-level only `[UNKNOWN]`; listed for manual testing in `docs/tasks/UI-SPACING-02/HANDOFF.md` §6.

---

## [2026-10-16] UI-SPACING-01: 10 px Outer Flat-Background Gap Around the Main Popup

### Summary
Enlarged the window canvas for both docked and floating modes from 712 × 512 px to **732 × 532 px** and applied `p-[10px]` on the outer flat-background root, producing a **10 px visible gap on all four sides** around the main popup. **The protected popup element is untouched**: `.glass-clay-surface` keeps its exact classes, 712 × 512 px dimensions, radius, padding, locked shadows, and all behavior. Constraint discovered pre-change (background and popup were both exactly 712 × 512 px at (0,0) — 0 px gap; a 10 px gap around an unchanged popup requires a 732 × 532 canvas, touching the ADR-002 viewport lock) was reported and the user **approved the canvas enlargement**; recorded as an ADR-002 amendment.

### Source Changes `[SOURCE-VERIFIED]`
- `popup.html` — inline `html, body { width/height }`: 712×512 → 732×532.
- `src/popup.tsx` — JS-set `documentElement`/`body` sizes → `'732px'/'532px'`; background root (line 61): `w-[712px] h-[512px]` → `w-[732px] h-[532px] p-[10px]` (the only spacing applied; no extra wrappers).
- `public/service-worker.js` — `chrome.windows.create` floating window: `width: 732, height: 532`.
- **Not changed**: `src/components/MainPopup.tsx`, `src/index.css` (all locked values), manifest, settings page, web demo, all logic/behavior.

### Documentation Changes `[SOURCE-VERIFIED]`
- `docs/project-knowledge/DECISIONS.md` — **ADR-002 amendment** (user-approved 732 × 532 canvas, popup surface unchanged) + index row update.
- `AGENTS.md` — Target Viewport Dimensions bullet updated (732 × 532 canvas / 712 × 512 popup surface).
- `docs/project-knowledge/README.md` §5.2, `ARCHITECTURE.md` (entry table, `OPEN_FLOATING_WINDOW` protocol, HTML-level styling note), `PROJECT_BRIEF.md`, `FEATURES.md`, `INTEGRATIONS.md`, `docs/design/DESIGN_SYSTEM.md` (§1 layout bullet, §10.6), `docs/design/SCREEN_REGISTRY.md`, `docs/design/INTERACTION_FLOWS.md`, `docs/project-knowledge/UI_REGISTRY.md` §7 — current-state descriptions updated to the canvas/popup-surface split.
- `docs/tasks/BACKLOG.md` — UI-SPACING-01 row (VERIFIED) + active-task status refresh.
- `docs/tasks/UI-SPACING-01/HANDOFF.md` — **created** (constraint, decision, changes, evidence, limitations).

### Verification Evidence
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors** `[COMMAND-VERIFIED]`.
- `npm.cmd run build` → `vite build` **success (515 ms)**; packaging python3 limitation unchanged → documented `Compress-Archive` fallback applied; zip refreshed (117,043 bytes) `[COMMAND-VERIFIED]`.
- Runtime (dev server `popup.html`, computed geometry): canvas/body **732 × 532**; background root **`padding: 10px`**; popup rect (10,10) **712 × 512** with identical classes, 26 px radius, `p-5`, locked background/shadows/`blur(5px)`; **gap measured 10 / 10 / 10 / 10 px** `[RUNTIME-VERIFIED]`.
- Extension-host runtime (docked/floating in real Chrome) NOT re-verified `[UNKNOWN]`; `chrome.windows.create` size change is source-verified.

---

## [2026-10-16] UI-READ-01: Visual Polish — Text Readability, Disabled Labels, Placeholders & Solid Logo

### Summary
Targeted visual-polish pass on the locked Red Glass-Claymorphism UI (ADR-009): darkened unreadable `text-slate-400` secondary text to `text-slate-500/600` tiers, made editor/search placeholders and disabled Duplicate/Delete labels readable (removing whole-element opacity dimming from disabled states), and replaced the glassy header logo plinth with a solid theme-matched mark. **No behavior, data-model, storage, manifest, or permission changes; no locked CSS values edited** (`src/index.css` untouched).

### Source Changes `[SOURCE-VERIFIED]`
- `src/components/SettingsView.tsx` — header description & footer status → `text-slate-600`; 13 low-contrast helper/description/meta text spots → `text-slate-500`.
- `src/components/SnippetEditorModal.tsx` — title `placeholder-slate-400` → `placeholder-slate-500`; character count → `text-slate-600`; disabled Duplicate/Delete branches now `text-slate-500 cursor-not-allowed` without element `opacity-60/50`; Delete Trash2 icon muted (`text-slate-400`) only while disabled (enabled icon stays `text-rose-500`, `.nm-danger-raised` untouched).
- `src/components/SearchAndFilters.tsx` — search `placeholder-slate-400/90` → `placeholder-slate-500/90`.
- `src/components/Header.tsx` — logo plinth: `.nm-logo-raised` → solid inline `rounded-[26%] bg-[rgb(240,85,88)] shadow-sm shadow-red-500/30` (26% radius preserved; user-approved removal of the glass treatment from the logo itself; locked class definitions remain in `src/index.css`).
- `src/components/SnippetPreviewModal.tsx` — "Created … · Updated …" metadata and "Esc to close" → `text-slate-600`.

### Documentation Changes `[SOURCE-VERIFIED]`
- `docs/design/DESIGN_SYSTEM.md` — §3 row 5 (`.nm-logo-raised` now reference-only), §5 (solid header logo row), §6 (disabled-row label treatment), §7 (new secondary-text-tier + placeholder + disabled-label subsection), §9.9 (UI-READ-01 divergences incl. favicon-asset note: `public/icons/*.png` referenced only by `public/manifest.json`, no HTML favicon link), §12 (corrected Escape-scope claim with pre-existing preview-modal gap).
- `docs/project-knowledge/UI_REGISTRY.md` — §7 header logo row + verification note.
- `docs/tasks/BACKLOG.md` — UI-READ-01 row (VERIFIED) + refreshed active-task status (adds the Escape-handler follow-up candidate).
- `docs/tasks/UI-READ-01/HANDOFF.md` — **created** (task record: changes, evidence, limitations).

### Verification Evidence
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors** `[COMMAND-VERIFIED]`.
- `npm.cmd run build` → `vite build` **success (804 ms)**; `pack-extension.js` failed on absent `python3` (known limitation); documented fallback applied: `Compress-Archive` of `dist/*` → `public/snippet-organizer-extension.zip` + `dist/` copy `[COMMAND-VERIFIED]`.
- Dev-server runtime checks (Playwright, web demo + `settings.html`): computed styles confirm solid opaque logo (`rgb(240,85,88)`, 26% radius, no backdrop-filter), slate-500/600 text tiers, disabled labels at full opacity with `disabled: true` and `cursor: not-allowed`, placeholders darker yet lighter than entered text, exact locked inset values intact, search filtering works, Escape behavior unchanged `[RUNTIME-VERIFIED]`.
- Contrast figures in docs are compositing-based estimates `[INFERRED]`, not certified pixel measurements.
- Extension-host runtime (docked/floating) NOT verified (no extension host available) `[UNKNOWN]`.

### Findings (recorded, NOT fixed)
1. Preview modal "Esc to close" is descriptive-only — no global Escape handler exists for preview/editor/Settings modals (pre-existing; out of scope). Documented in `DESIGN_SYSTEM.md` §12 and added to BACKLOG follow-ups.
2. Literal label "Unchanged" named in the task brief does not exist in source; the Settings footer status text is "Settings auto-save on change" (grep-verified).
3. Favicon remains a separate PNG asset set; regenerating icons to match the solid logo requires an approved follow-up task.

---

## [2026-10-15] DOC-AUDIT-02: A-to-Z Documentation Audit for Red Glass-Claymorphism

### Summary
Documentation-only audit (per task mandate, **no application source code was modified**). Audited the implemented Red Glass-Claymorphism system (UI-CLAY-03) against the approved locked specification and reconciled every canonical document; corrected contradictions with superseded design eras; added traceable ADR, task record, and future-agent handoff.

### Documentation Changes `[SOURCE-VERIFIED]`
- `docs/design/DESIGN_SYSTEM.md` — **rewritten**: canonical locked reference values (verbatim), approved→implementation mapping with usage and status, full class inventory from `src/index.css`, component-to-style map, state matrix, color semantics, documented divergences (§9), extension rules, superseded-era summary. Removed stale original-blue-era claims and obsolete indigo/neumorphic value tables that contradicted the live stylesheet.
- `docs/project-knowledge/DECISIONS.md` — added **ADR-009** (Adopt Locked Red Glass-Claymorphism Design System) + index row.
- `docs/project-knowledge/ARCHITECTURE.md` — added **§7 Styling Architecture** (single CSS entry, Tailwind v4 unlayered cascade, class-name stability contract, where-to-change-what, constraints); packaging `python3` fallback note.
- `docs/project-knowledge/UI_REGISTRY.md` — added **§7 Visual Design Treatment Map** (surface→component→selector→treatment→states→verification) + residual-accent list.
- `docs/project-knowledge/README.md` — reading order now includes `AGENTS.md` and `DESIGN_SYSTEM.md`; status-vocabulary mapping; **§3.1 Known Documentation Caveats** (stale archives, legacy root files).
- `docs/project-knowledge/PROJECT_BRIEF.md`, `docs/project-knowledge/FEATURES.md`, root `PROJECT_BRIEF.md` — snapshot 2026-10-15; current-design pointers; behavior-vs-presentation distinction; packaging environment note.
- `AGENTS.md` — added durable rules: read-docs-first, **Design System Lock (ADR-009)**, documentation-only-task restriction, no-duplicate-documentation, strengthened honesty/verification wording.
- `docs/tasks/BACKLOG.md` — added UI-CLAY-01/02/03 (UI-CLAY-03 VERIFIED with explicit runtime caveats; earlier styling phases marked superseded) and **DOC-AUDIT-02**; refreshed active-task status with follow-up candidates.
- `docs/tasks/UI-CLAY-03/SPEC.md` + `HANDOFF.md` — **created** (repo task-folder convention); HANDOFF is the future-agent entry point.
- Root `README.md` — **corrected**: previously claimed the repo was build-output-only with no source and referenced a nonexistent `INSTRUCTIONS.md`; now describes the TypeScript source repository, active vs legacy files, the current design system, and build commands.
- `docs/engineering-knowledge/UI_ELEMENT_REGISTRY.md` — supersession banner added (historical subset of the canonical registry).

### Audit Findings (recorded, NOT fixed — documentation-only mandate) `[SOURCE-VERIFIED]`
1. Residual blue accents requiring a semantic-vs-theme decision: `Footer.tsx:19`, `App.tsx:315`, `App.tsx:374`, `SettingsView.tsx:354` (+ intentional semantic blues listed in `DESIGN_SYSTEM.md` §9.6).
2. `.clay-btn` / `.clay-decor` are locked-spec reference implementations **unused by components**; shipping classes `.nm-primary-raised` / `.nm-logo-raised` duplicate the exact values — sync obligation documented.
3. `.nm-inset` (Settings nav) omits the locked 15px radius; component `rounded-xl` (12px) applies — documented exception (DESIGN_SYSTEM §9.5).
4. Extension-host runtime (docked/floating) not re-verified for the new skin — recorded `[UNKNOWN]` in BACKLOG/UI_REGISTRY.
5. Repo hygiene: root `*-1.*` duplicates (`service-worker-1.js` byte-identical to `service-worker.js`; `manifest-1.json` differs), stray `200`/`350` files, stale `snippet-organizer-document/` archive, stale `docs/engineering-knowledge/CHANGELOG.md` (stops at 2026-10-13) — flagged for an approved cleanup task.

### Validation Evidence
- Fresh run this audit: `npm.cmd run lint` (`tsc --noEmit`) → **0 errors** `[COMMAND-VERIFIED]`; `npx.cmd vite build` → **success** `[COMMAND-VERIFIED]`.
- Cross-checked every documented file path, selector, and usage line reference against the working tree; all links are repository-relative and resolve `[SOURCE-VERIFIED]`.
- No documentation linting/link-checking tooling exists in the repo; none was added (per task constraints).

---

## [2026-10-15] UI-CLAY-03: Locked Red Glass-Claymorphism Applied

### Summary
Applied the approved, locked **Red Glass-Claymorphism** design system across the entire extension UI. Visual-only transformation using the exact locked constants (global red gradient, glass-clay surfaces, clay buttons with locked hover, permanent red insets, decorative clay elements). No functional, structural, or data-flow changes.

### Locked values honored `[SOURCE-VERIFIED]`
- Global background: locked red gradient (`rgba(208,2,5,0.9) → rgba(208,2,5,0.1)`, to bottom, no-repeat) via `.glass-app-bg` on `App.tsx`, `settings.tsx`, `popup.tsx`.
- Main glass-clay surface: exact locked values via `.glass-clay-surface` on `MainPopup.tsx`, `SnippetEditorModal.tsx`, `SnippetPreviewModal.tsx`, `SettingsModal.tsx`, `settings.tsx`, and the App install-guide modal.
- Clay button: exact locked base + hover (including `translateY(-5px)` and 0.5s transitions) via `.nm-primary-raised`/`.clay-btn`; hover transform suppressed for `:disabled`.
- Permanent red inset: exact locked values via `.nm-static-inset-field` (search + editor title), `.nm-static-inset-editor` (content editor), `.nm-inset` (selected settings nav); insets persist in normal and focused states; focus adds a 2px red outline without removing the inset.
- Decorative clay: `.nm-logo-raised` now uses the locked `rgb(240,85,88)` / 26% / locked shadows spec.

### Documented adaptations (no silent value changes)
- Compact controls (icon buttons, tabs) and in-list cards/sections use proportionally scaled shadows from the same palette to prevent muddy stacking in the 712×512 popup; rationale recorded in `docs/design/DESIGN_SYSTEM.md` §3.2.
- Additive `text-shadow` on clay buttons preserves white label legibility during the light locked-hover state.
- Removed three decorative white sheen strips that conflicted with locked inset shadows (`SearchAndFilters.tsx` 1, `SnippetEditorModal.tsx` 2); editor wrapper close-tag nesting preserved.
- Semantic colors preserved: 8 category swatches untouched; success/warn/info/danger tints kept as translucent glass; blue info banners unchanged.
- Theme-chrome blue accents (pins, checks, links, buttons, logo plinths, checkboxes, selected menu items, swatch selection rings, Done/Add/Export buttons) recolored to the red system.

### Verification Evidence
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `vite build`: **success** (~670 ms); extension repackaged to `public/snippet-organizer-extension.zip` `[COMMAND-VERIFIED]`
- Visual/runtime verification via dev server + Chrome DevTools screenshots `[RUNTIME-VERIFIED]`:
  - Main popup: red gradient, glass surface, glass cards + selected card, red active tab, search inset, glass icon buttons.
  - Locked button hover: Download CTA lightens + lifts (`translateY(-5px)`).
  - Snippet editor: title input inset in normal state AND while focused (red focus ring, inset intact); content editor inset; 8 category swatch colors intact.
  - Settings: container/sidebar/header glass; all six sections inspected (General, Categories, Shortcuts, Backup & Data, Trash, About) with red-inset active nav, glass sections, red-accented checkboxes/inputs/buttons.
- NOT VERIFIED: Chrome docked popup & detached floating window runtime (no extension host in this environment); native `<select>` dropdown popup styling (OS-rendered).

---

## [2026-10-15] UI-CLAY-02: Clay Material Correction (solid bodies, contact shadows, AO)

### Summary
Corrected UI-CLAY-01's remaining gap: the UI read as colored neumorphism rather than solid clay. Rebuilt the material system around **solid clay body → molded shape → broad highlight → bottom ambient occlusion → contact shadow → minimal glow**, on a white canvas with solid indigo/blue clay objects.

### Scope of Changes
- `src/index.css`: replaced v1 gradient/shadow tokens with material tokens (`--clay-body-*`, `--clay-highlight`, `--clay-ao`, `--clay-contact[-strong]`, `--clay-inset-*`, `--clay-glow-soft`). Raised controls & icon buttons are now solid white clay bodies with contact shadows; primary CTAs are solid indigo clay; selected tabs are sunk deep-indigo clay; permanent inset surfaces use recessed-well lighting (dark inner top + light inner bottom); swatches keep inline color as the clay body with shadow-only material. Removed thin bright borders/glass look and heavy glow. `[SOURCE-VERIFIED]`
- `src/App.tsx`, `src/settings.tsx`: canvas switched to white→`#edf1ff` with subtle orbs; settings shell is a white clay slab with deep-indigo contact shadow. `[SOURCE-VERIFIED]`
- `src/popup.tsx`: popup base `#f5f7ff`. `src/components/MainPopup.tsx`, `src/components/SnippetEditorModal.tsx`: white clay slabs with deep-indigo contact shadows. `[SOURCE-VERIFIED]`

### Verification Evidence
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `vite build`: **success** (~678ms) `[COMMAND-VERIFIED]`
- Visual acceptance via dev-server screenshots: main popup (solid clay CTAs, molded icon buttons, recessed search/cards, indigo selected tab), Favorites tab hover (recessed — existing semantic), editor modal (clay swatches, recessed title field/editor), Settings (white clay nav, persistent inset General tab, recessed sections). Layout/dimensions/labels unchanged; logo artwork and 8 category colors intact. `[RUNTIME-VERIFIED]`
- Chrome docked/floating runtime: **NOT VERIFIED** (no extension host in this environment).

---


### Summary
Transformed the visual material of the entire UI from soft neumorphism to Indigo Glowing Blue Claymorphism. Pure visual-token change: no layout, structure, functionality, or interaction-semantic changes.

### Scope of Changes
- `src/index.css`: All `.nm-*` classes re-skinned with clay tokens (`--clay-*` added to `:root`); indigo/blue gradients, layered molded shadows, restrained glow. Class names and state semantics unchanged. Rich-editor formatting rules untouched except link/blockquote brand hue `#2563eb/#3b66f5 → #4f46e5`. `[SOURCE-VERIFIED]`
- `src/App.tsx`, `src/settings.tsx`: ambient background mesh shifted from warm cream to indigo/blue. `[SOURCE-VERIFIED]`
- `src/popup.tsx`: popup base `bg-slate-50 → bg-[#f4f6ff]`. `[SOURCE-VERIFIED]`
- `src/components/MainPopup.tsx`, `src/components/SnippetEditorModal.tsx`: container surfaces `bg-white/95 → bg-[#f4f6ff]/95` with indigo ambient shadow. `[SOURCE-VERIFIED]`

### Verification Evidence
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `vite build`: **success** (built in ~410ms, all bundles emitted) `[COMMAND-VERIFIED]`
- `npm run build` packaging step: fails in this environment only because the pack script shells out to `python3`, which is not on PATH (pre-existing environment limitation, unrelated to this change). Equivalent zip produced via `Compress-Archive` → `public/snippet-organizer-extension.zip`. `[COMMAND-VERIFIED]`
- Visual verification via dev-server screenshots: main popup, Settings (General), and Snippet Editor modal all render indigo/blue clay correctly; layout, dimensions (712×512), persistent inset semantics, selected states, and the 8 category swatch colors preserved. `[RUNTIME-VERIFIED]`

---

## [2026-10-12] REPAIR-01: Remove Redundant "Move Category" Button

### Summary
Removed the redundant "Move Category" button from the Snippet Actions section beneath the editor text area in `SnippetEditorModal.tsx`.

### Context & Rationale `[INFERRED]`
The Add/Edit Snippet Editor already provides a primary category selection dropdown control situated above the editor content area. The auxiliary "Move to Category" button placed in the actions row beneath the editor content area was redundant and duplicated category assignment functionality.

### Scope of Changes
- **Target File**: `src/components/SnippetEditorModal.tsx` `[SOURCE-VERIFIED]`
- **Modifications**:
  1. Removed the redundant `<button onClick={() => setIsCategoryMenuOpen(true)}>...Move to Category</button>` from the Snippet Actions row (`[SOURCE-VERIFIED]`).
  2. Removed unused icon import `FolderInput` from `lucide-react` (`[SOURCE-VERIFIED]`).
- **Preserved Functionality**:
  - Primary category selector dropdown and category badge picker (`[SOURCE-VERIFIED]`).
  - Snippet Actions: "Favorite" toggle button (`[SOURCE-VERIFIED]`).
  - Snippet Actions: "Duplicate" button (`[SOURCE-VERIFIED]`).
  - Snippet Actions: "Delete" button for existing snippets (`[SOURCE-VERIFIED]`).
  - Rich-text editor formatting toolbar, text area, title input, and Cancel/Save buttons (`[SOURCE-VERIFIED]`).
  - All category persistence, filtering, and assignment logic (`[SOURCE-VERIFIED]`).

### Verification Evidence
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `compile_applet`: **Build succeeded** `[COMMAND-VERIFIED]`
- `npm run build && node scripts/pack-extension.js`: **Succeeded**, generated updated bundles and `public/snippet-organizer-extension.zip` `[COMMAND-VERIFIED]`
- Dev server running on port 3000: `[RUNTIME-VERIFIED]`
## [2026-10-13] TASK-08: Fix Search Filter Priority Ranking

### Summary
Fixed the search result priority ranking in Snippet Organizer so that matching results strictly follow the canonical hierarchy: **Title** > **Content** > **Category**.

### Context & Rationale `[INFERRED]`
Previously, live search queries in `MainPopup.tsx` and `searchSnippets` in `db.ts` filtered candidates using a logical OR condition without applying a priority sort. As a result, snippets matching Content with more recent timestamps appeared above snippets matching Title. The ranking logic now classifies matches into explicit priority tiers:
1. **Title** (Tier 1: exact = 10, prefix = 11, substring = 12)
2. **Content** (Tier 2: exact = 20, prefix = 21, substring = 22)
3. **Category** (Tier 3: exact = 30, prefix = 31, substring = 32)

### Scope of Changes
- **Target Files**:
  - `src/db.ts` `[SOURCE-VERIFIED]`
  - `src/components/MainPopup.tsx` `[SOURCE-VERIFIED]`
- **Modifications**:
  1. Exported `stripHtml` from `src/db.ts` for clean plain-text search indexing `[SOURCE-VERIFIED]`.
  2. Implemented `filterAndRankSnippets(snippets, query, categoriesMap, searchFields)` in `src/db.ts` adhering strictly to Cases A–E and the canonical `Title > Content > Category` priority order `[SOURCE-VERIFIED]`.
  3. Ensured that multi-field matches (e.g. Title + Content) are ranked according to their highest-priority matching field (Title) and not demoted `[SOURCE-VERIFIED]`.
  4. Preserved existing relevance sub-tiers (Exact > Prefix > Substring) and preserved original list order for ties `[SOURCE-VERIFIED]`.
  5. Updated `searchSnippets` in `src/db.ts` to use `filterAndRankSnippets` `[SOURCE-VERIFIED]`.
  6. Connected `filterAndRankSnippets` into `MainPopup.tsx`'s search filter effect and added `preferences` to the effect dependencies `[SOURCE-VERIFIED]`.
- **Preserved Functionality**:
  - Search UI, input field, and debounce behavior `[SOURCE-VERIFIED]`.
  - Settings UI search toggles for Title, Content, and Category `[SOURCE-VERIFIED]`.
  - Category dropdown filtering, tabs (All, Recent, Favorites), cards, modals, and persistence `[SOURCE-VERIFIED]`.

### Verification Evidence
- Verification test suite covering Cases A–E, multi-field matching, sub-tiers, and tie-breakers: **10/10 PASSED** `[COMMAND-VERIFIED]`
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `compile_applet`: **Build succeeded** `[COMMAND-VERIFIED]`
- `npm run build && node scripts/pack-extension.js`: **Succeeded**, generated updated bundles and `public/snippet-organizer-extension.zip` `[COMMAND-VERIFIED]`
- Dev server running on port 3000: `[RUNTIME-VERIFIED]`
- End-user visual verification in Chrome browser: `[UNKNOWN / PENDING-USER-VERIFICATION]`

## [2026-10-14] DOC-AUDIT-01: Existing Project Audit & Documentation Restructuring

### Summary
Conducted a comprehensive codebase audit and established the canonical project knowledge base under `docs/project-knowledge/`, `docs/tasks/`, and `docs/design/`. Resolved historical discrepancies regarding source code availability and standardized cross-session documentation maintenance.

### Context & Rationale `[SOURCE-VERIFIED]`
Prior documentation snapshots (from initial repository bootstrap) contained outdated assumptions claiming that TypeScript source code was absent and that only minified build artifacts existed. In reality, the full TypeScript and React source resides under `src/` and is actively built and packaged by Vite. Furthermore, documentation was previously fragmented across competing locations (`docs/engineering-knowledge/`, `snippet-organizer-document/`). The canonical structure was established to provide future coding agents with immediate, reliable, and verified context.

### Scope of Changes
- **New Canonical Documentation**:
  - `docs/project-knowledge/README.md`: Master agent entry point, reading order, confidence standards, and documentation maintenance contract `[SOURCE-VERIFIED]`.
  - `docs/project-knowledge/PROJECT_BRIEF.md`: Up-to-date project brief, capabilities, boundaries, and verification commands `[SOURCE-VERIFIED]`.
  - `docs/project-knowledge/ARCHITECTURE.md`: Complete system architecture, entry points, component hierarchy, IndexedDB schema, and service worker protocol `[SOURCE-VERIFIED]`.
  - `docs/project-knowledge/FEATURES.md`: Full feature inventory, user-visible behaviors, modules, and edge case handling `[SOURCE-VERIFIED]`.
  - `docs/project-knowledge/DECISIONS.md`: Approved architectural decisions (ADR-001 through ADR-008) `[SOURCE-VERIFIED]`.
  - `docs/project-knowledge/INTEGRATIONS.md`: Chrome extension APIs, permissions, web capabilities, and fallback boundaries `[SOURCE-VERIFIED]`.
  - `docs/project-knowledge/UI_REGISTRY.md`: Comprehensive interactive element and handler mapping `[SOURCE-VERIFIED]`.
  - `docs/project-knowledge/code-graph/metadata.md`: Dependency matrix and tooling status `[SOURCE-VERIFIED]`.
  - `docs/tasks/BACKLOG.md`: Historical and active task status index `[SOURCE-VERIFIED]`.
  - `docs/design/DESIGN_SYSTEM.md`: Implemented design tokens, 712 × 512 px sizing, and component conventions `[SOURCE-VERIFIED]`.
  - `docs/design/SCREEN_REGISTRY.md`: Screen and modal inventory `[SOURCE-VERIFIED]`.
  - `docs/design/INTERACTION_FLOWS.md`: Sequence and state diagrams for core flows `[SOURCE-VERIFIED]`.
- **Harmonized Files**:
  - `PROJECT_BRIEF.md`: Corrected outdated claims and linked to canonical documentation `[SOURCE-VERIFIED]`.
  - `AGENTS.md`: Updated to point to `docs/project-knowledge/README.md` and enforce the canonical reading order `[SOURCE-VERIFIED]`.
- **Preserved Code & Configuration**:
  - Zero application code, dependencies, styles, or permissions were modified `[SOURCE-VERIFIED]`.
  - Legacy folders `docs/engineering-knowledge/` and `snippet-organizer-document/` were preserved intact `[SOURCE-VERIFIED]`.

### Verification Evidence
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `compile_applet`: **Build succeeded** `[COMMAND-VERIFIED]`
- `npm run build && node scripts/pack-extension.js`: **Succeeded** `[COMMAND-VERIFIED]`
- Dev server running on port 3000: `[RUNTIME-VERIFIED]`

## [2026-10-14] TASK-09: Persist Floating Window Position Across Sessions

### Summary
Implemented persistent positioning for the detached floating window so that the extension remembers the user's last moved screen position and restores the floating window to that exact position every time it is closed and reopened across repeated sessions.

### Context & Rationale `[SOURCE-VERIFIED]`
Previously, when the user detached the popup into a floating window and moved it, its screen position was never recorded in storage. Reopening the floating window caused it to either reset to browser default placement or reset to an initial offset `(30, 30)` in the web simulation. This required the user to repeatedly drag the floating window back to their preferred screen location.

### Scope of Changes
- **Application Files**:
  - `service-worker.js` & `public/service-worker.js`:
    - Added `isValidPosition(left, top)` validation helper.
    - Updated `OPEN_FLOATING_WINDOW` to retrieve `floatingWindowPosition` from `chrome.storage.local`.
    - Updated `createNewFloatingWindow` to apply saved `left` and `top` with boundary clamping (`Math.max(0, ...)`), while preserving native default placement on first use when no position is stored.
    - Added `chrome.windows.onBoundsChanged` debounced listener (200ms) to track and store user movement in real time.
    - Updated `CLOSE_FLOATING_WINDOW` to record latest bounds before window removal.
    - Added `SAVE_FLOATING_POSITION` message handler for explicit position reporting.
  - `src/popup.tsx`:
    - Added `beforeunload` and `pagehide` event listeners when `isFloating === true` to report the latest window screen coordinates via `SAVE_FLOATING_POSITION`.
  - `src/App.tsx`:
    - Added `loadSavedFloatingPos()` and `persistFloatingPos()` helpers leveraging `localStorage` (`snippet_organizer_floating_pos`).
    - Updated `handleTogglePin` to restore saved coordinates upon reopening rather than resetting to `(30, 30)`.
    - Updated `handlePointerUp` to persist the latest valid dragged position upon movement completion.
- **Documentation Updates**:
  - `docs/project-knowledge/FEATURES.md`: Updated Feature 1 to document persistent floating positioning across sessions.
  - `docs/project-knowledge/ARCHITECTURE.md`: Updated Section 5 service worker message protocol table and bounds tracking.
  - `docs/design/INTERACTION_FLOWS.md`: Updated Flow 5 sequence diagram to illustrate position retrieval, window placement, and `onBoundsChanged` tracking.
  - `docs/tasks/BACKLOG.md`: Added `TASK-09` to task index with `VERIFIED` status.

### Verification Evidence
- Verification test suite covering Scenarios A–F (first use, first move, 5 repeated close/reopen cycles, new position replacement, boundary clamping, and invalid coordinate rejection): **5/5 PASSED** `[COMMAND-VERIFIED]`
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `compile_applet`: **Build succeeded** `[COMMAND-VERIFIED]`
- `npm run build && node scripts/pack-extension.js`: **Succeeded**, generated updated extension packages `[COMMAND-VERIFIED]`
- Dev server running on port 3000: `[RUNTIME-VERIFIED]`

## [2026-10-15] FIX-WINDOW-01: Prevent Floating Window Re-attaching on Reopen

### Summary
Fixed the runtime issue where closing a detached floating window caused the extension to unexpectedly reattach itself to the toolbar popup on subsequent open actions instead of reopening directly as a floating window at the last saved position.

### Context & Rationale `[SOURCE-VERIFIED]`
Previously, when the user detached into floating mode and then closed the floating window, `isFloatingMode` was either not maintained across sessions or the Chrome action button continued to open `popup.html` anchored to the toolbar because Chrome MV3 actions default to opening the popup if `default_popup` is set. As a result, subsequent clicks on the Chrome extension toolbar icon or preview reopens unexpectedly reattached the UI to docked mode.
Per the core invariant: once detached into floating mode, closing the window must not reset the user's mode to attached/popup mode. Only an explicit user click on the Pin control to unpin can restore docked popup mode.

### Scope of Changes
- **Target Files**:
  - `service-worker.js` & `public/service-worker.js`:
    - Persisted `isFloatingMode: true` in `chrome.storage.local` upon entering floating mode.
    - Synchronized `chrome.action.setPopup({ popup: '' })` when floating mode is active, directing toolbar icon clicks to `chrome.action.onClicked`.
    - Implemented `chrome.action.onClicked` and `chrome.commands.onCommand` listeners to directly open or focus the floating window at `floatingWindowPosition`.
    - Maintained `isFloatingMode: true` and empty popup string when the window is closed via OS controls or `window.close()`.
    - Added explicit `UNPIN_FLOATING_WINDOW` message handling that sets `isFloatingMode: false`, restores `chrome.action.setPopup({ popup: 'popup.html' })`, and closes the floating window.
    - Added `syncActionPopup()` on startup, installation, and service worker module initialization.
  - `src/popup.tsx`:
    - Added defensive check: if `popup.html` opens while `isFloatingMode` is active, it dispatches `OPEN_FLOATING_WINDOW` and immediately closes itself without rendering docked mode.
  - `src/components/MainPopup.tsx`:
    - Updated `handleTogglePin` inside floating window (`internalPinned === true`) to send `UNPIN_FLOATING_WINDOW` to explicitly restore attached mode.
  - `src/App.tsx`:
    - Added `FLOATING_MODE_STORAGE_KEY` and `loadSavedFloatingMode()` / `persistFloatingMode()` helpers.
    - Fixed `onClose` in `MainPopup` to set `isDismissed = true` without resetting `isFloating` to `false`.
    - Updated dismissed screen state to display "Floating Window Closed" and "Reopen Floating Window" button restoring the window at its saved coordinates.
- **Documentation Updates**:
  - `docs/tasks/BACKLOG.md`: Added `FIX-WINDOW-01` with `VERIFIED` status.
  - `docs/project-knowledge/FEATURES.md`: Updated Feature 1 with persistent mode retention and core invariant specifications.
  - `docs/project-knowledge/ARCHITECTURE.md`: Updated Section 5 with `UNPIN_FLOATING_WINDOW` protocol and `chrome.action.onClicked` lifecycle.
  - `docs/design/INTERACTION_FLOWS.md`: Updated Flow 5 sequence diagram with window close, direct toolbar reopen, and explicit unpin flows.

### Verification Evidence
- Service Worker automated test suite (`scripts/verify-floating-mode.js`): **7/7 PASSED** `[COMMAND-VERIFIED]`
  - Test 1: Initial state has `actionPopup === 'popup.html'`
  - Test 2: Detaching via `OPEN_FLOATING_WINDOW` sets `isFloatingMode: true` and `actionPopup: ''`
  - Test 3: Moving floating window persists screen coordinates `(420, 260)`
  - Test 4: Closing floating window preserves `isFloatingMode: true` and `actionPopup: ''`
  - Test 5: Reopening extension via action click directly restores floating window at `(420, 260)` with 712 × 512 px dimensions
  - Test 6: Repeated close/reopen cycle with new position `(650, 310)` restores new position
  - Test 7: Explicit unpin resets `isFloatingMode: false`, restores `actionPopup: 'popup.html'`, and closes window
- Web Preview test suite (`scripts/verify-web-preview.js`): **6/6 PASSED** `[COMMAND-VERIFIED]`
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `compile_applet`: **Build succeeded** `[COMMAND-VERIFIED]`
- `npm run build && node scripts/pack-extension.js`: **Succeeded**, generated updated bundles and zip packages `[COMMAND-VERIFIED]`
- Dev server running on port 3000: `[RUNTIME-VERIFIED]`

## [2026-10-15] UI-NEUMORPH-01: Phase 1: Universal Soft Neumorphic Styling for Interactive UI Elements

### Summary
Implemented a unified, reusable soft-neumorphic design system across all interactive buttons, clickable icons, filter tabs, navigation options, and dropdown/selectable items in Snippet Organizer.

### Context & Rationale `[SOURCE-VERIFIED]`
To provide a cohesive tactile interface, interactive elements now adhere to standard soft neumorphism rules:
- **Default interactive state**: Soft dual-shadow raised elevation with subtle specular highlights.
- **Hover state**: Smooth elevated lift (`-0.5px translateY`) and glowing spread.
- **Pressed/clicked state**: Visible inset/pressed shadows giving tactile depression feedback.
- **Persistently selected state**: Remains indented/inset for as long as the option/tab is active.
- **Unselected options**: Softly raised above the backdrop.
- **Static logo container**: Recessed into an inset neumorphic well without adding interactive behaviors.

### Scope of Changes
- **Target Files**:
  - `src/index.css`: Added utility tokens (`.nm-raised`, `.nm-inset`, `.nm-primary-inset`, `.nm-primary-raised`, `.nm-logo-container`, `.nm-icon-btn`, `.nm-icon-btn-inset`, `.nm-danger-raised`, `.nm-success-inset`, `.nm-dropdown-panel`, `.nm-menu-item-*`) `[SOURCE-VERIFIED]`.
  - `src/components/Header.tsx`: Converted logo container to `.nm-logo-container`; icon buttons to `.nm-icon-btn`; pinned state to `.nm-icon-btn-inset` `[SOURCE-VERIFIED]`.
  - `src/components/SearchAndFilters.tsx`: Unselected tabs softly raised (`.nm-raised`), active tabs persistently inset (`.nm-primary-inset`). Dropdown portal upgraded to `.nm-dropdown-panel` with `.nm-menu-item-*` states `[SOURCE-VERIFIED]`.
  - `src/components/SnippetCard.tsx`: Copy button and 3-dot overflow menu use `.nm-icon-btn`; dropdown items use `.nm-menu-item-unselected` `[SOURCE-VERIFIED]`.
  - `src/components/SnippetPreviewModal.tsx`: Back, Edit, Favorite, Close, and Copy buttons use neumorphic raised, inset, and primary classes `[SOURCE-VERIFIED]`.
  - `src/components/SnippetEditorModal.tsx`: Header Back/Close buttons, Category dropdown & New Category button, Color swatches, Rich text toolbar buttons, Snippet Action buttons (Favorite inset toggle, Duplicate, Delete), Cancel and Save Snippet styled with neumorphic classes `[SOURCE-VERIFIED]`.
  - `src/components/SettingsView.tsx`: Sidebar navigation items softly raised when unselected and persistently inset (`.nm-inset`) when active. Theme segmented picker, Default View select, Export/Import, and Trash buttons styled with neumorphic classes `[SOURCE-VERIFIED]`.
  - `src/App.tsx`: Header buttons, Reset Position, and Reopen buttons updated with neumorphic classes `[SOURCE-VERIFIED]`.
- **Documentation Updates**:
  - `docs/design/DESIGN_SYSTEM.md`: Documented Section 4 soft-neumorphism design tokens and component mapping `[SOURCE-VERIFIED]`.
  - `docs/tasks/BACKLOG.md`: Added `UI-NEUMORPH-01` with `VERIFIED` status `[SOURCE-VERIFIED]`.
  - `docs/tasks/UI-NEUMORPH-01/SPEC.md` & `HANDOFF.md`: Created specification and handoff `[SOURCE-VERIFIED]`.

### Verification Evidence
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `compile_applet`: **Build succeeded** `[COMMAND-VERIFIED]`
- `npm run build`: **Succeeded**, generated updated bundles and `public/snippet-organizer-extension.zip` `[COMMAND-VERIFIED]`
- Floating mode test suite (`scripts/verify-floating-mode.js`): **7/7 PASSED** `[COMMAND-VERIFIED]`
- Web preview test suite (`scripts/verify-web-preview.js`): **6/6 PASSED** `[COMMAND-VERIFIED]`
- Dev server running on port 3000: `[RUNTIME-VERIFIED]`

## [2026-10-15] UI-NEUMORPH-02: Phase 1.1 Neumorphic Styling Corrections

### Summary
Addressed user feedback from Phase 1 by refining soft-neumorphic shadow depths, restoring the vibrant raised brand logo container, implementing smooth hover-inset transitions with automatic leave-restoration, guaranteeing persistent inset states for active filter tabs, and ensuring 100% visibility for all category color swatches.

### Context & Rationale `[SOURCE-VERIFIED]`
During Phase 1, several visual aspects were identified for correction:
1. **Brand Logo Faded/Recessed**: The logo was placed in a recessed gray well which subdued the brand identity. The original rich blue-to-indigo gradient with glossy sheen overlay was restored and given an elevated `.nm-logo-raised` 3D soft-neumorphic shadow with subtle blue ambient glow.
2. **Elevated Depth & Subtle Glow**: `.nm-raised`, `.nm-icon-btn`, `.nm-primary-raised`, and `.nm-danger-raised` were tuned with stronger dual-shadow contrast and ambient outer glow (`0 0 10px rgba(255, 255, 255, 0.5)`).
3. **Hover-Inset Interaction**: Mouse hover transitions interactive elements from raised into a soft inset state, smoothly returning to raised on mouse leave.
4. **Deep Inset Depressions**: Inset active states and persistent toggles have deeper concave contrast without blurriness.
5. **Persistent Active Tabs**: Active filter tabs (`.nm-primary-inset`) and settings tabs (`.nm-inset`) maintain their inset state without jitter or reverting to raised on hover.
6. **Always-Visible Color Swatches**: Replaced background-overriding utility classes on category color buttons with dedicated `.nm-color-swatch` and `.nm-color-swatch-selected` classes that preserve inline `backgroundColor`.

### Scope of Changes
- **Target Files**:
  - `src/index.css`: Tuned `.nm-raised`, `.nm-inset`, `.nm-primary-inset`, `.nm-primary-raised`, `.nm-icon-btn`, `.nm-icon-btn-inset`, `.nm-danger-raised`, `.nm-logo-raised`, `.nm-color-swatch`, and `.nm-color-swatch-selected` `[SOURCE-VERIFIED]`.
  - `src/components/Header.tsx`: Restored brand logo container with original artwork, gradient, glossy sheen, and white `Layers` icon under `.nm-logo-raised` `[SOURCE-VERIFIED]`.
  - `src/components/SnippetEditorModal.tsx`: Applied `.nm-color-swatch` and `.nm-color-swatch-selected` to category color picker and inline category modal `[SOURCE-VERIFIED]`.
- **Documentation Updates**:
  - `docs/design/DESIGN_SYSTEM.md`: Updated Section 4 tokens and component conventions `[SOURCE-VERIFIED]`.
  - `docs/tasks/BACKLOG.md`: Added `UI-NEUMORPH-02` `[SOURCE-VERIFIED]`.
  - `docs/tasks/UI-NEUMORPH-02/SPEC.md` & `HANDOFF.md`: Created specification and handoff `[SOURCE-VERIFIED]`.

### Verification Evidence
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `compile_applet`: **Build succeeded** `[COMMAND-VERIFIED]`
- `npm run build`: **Succeeded**, generated updated bundles and `public/snippet-organizer-extension.zip` `[COMMAND-VERIFIED]`
- Floating mode test suite (`scripts/verify-floating-mode.js`): **7/7 PASSED** `[COMMAND-VERIFIED]`
- Web preview test suite (`scripts/verify-web-preview.js`): **6/6 PASSED** `[COMMAND-VERIFIED]`
- Dev server running on port 3000: `[RUNTIME-VERIFIED]`

## [2026-10-15] UI-NEUMORPH-03: Phase 2 Static Inset Soft Neumorphism for Specific UI Elements

### Summary
Implemented always-visible, static inset soft neumorphism for the 5 strictly scoped UI targets: the main popup search field, every snippet card, all existing Settings section and subsection containers, snippet editor title input, and snippet editor textareas.

### Context & Rationale `[SOURCE-VERIFIED]`
In contrast to interactive elements that feature raised elevation and hover-inset transitions, the 5 designated container and input groups require a static recessed appearance immediately on render that remains indented regardless of hover, focus, typing, or selection.

### Scope of Changes
- **Target Files**:
  - `src/index.css`: Added static inset utility tokens (`.nm-static-inset-field`, `.nm-static-inset-card`, `.nm-static-inset-card-selected`, `.nm-static-inset-section`, `.nm-static-inset-subsection`, `.nm-static-inset-danger-section`, `.nm-static-inset-warn-section`, `.nm-static-inset-info-section`, `.nm-static-inset-editor`) `[SOURCE-VERIFIED]`.
  - `src/components/SearchAndFilters.tsx`: Updated main search field to `.nm-static-inset-field` `[SOURCE-VERIFIED]`.
  - `src/components/SnippetCard.tsx`: Updated cards to `.nm-static-inset-card` (unselected) and `.nm-static-inset-card-selected` (selected) `[SOURCE-VERIFIED]`.
  - `src/components/SettingsView.tsx`: Updated section containers across General, Categories, Shortcuts, Data Management, Trash, and About tabs to `.nm-static-inset-section` and contextual subsection tokens `[SOURCE-VERIFIED]`.
  - `src/components/SnippetEditorModal.tsx`: Updated Title input to `.nm-static-inset-field` and Content editor surface to `.nm-static-inset-editor` `[SOURCE-VERIFIED]`.
- **Documentation Updates**:
  - `docs/design/DESIGN_SYSTEM.md`: Added Section 4.1 for Phase 2 Static Inset Neumorphic tokens `[SOURCE-VERIFIED]`.
  - `docs/tasks/BACKLOG.md`: Added `UI-NEUMORPH-03` with status `VERIFIED` `[SOURCE-VERIFIED]`.
  - `docs/tasks/UI-NEUMORPH-03/SPEC.md` & `HANDOFF.md`: Created task specification and handoff `[SOURCE-VERIFIED]`.

### Verification Evidence
- `tsc --noEmit` (`npm run lint`): **0 errors** `[COMMAND-VERIFIED]`
- `compile_applet`: **Build succeeded** `[COMMAND-VERIFIED]`
- `npm run build`: **Succeeded**, generated updated bundles and `public/snippet-organizer-extension.zip` `[COMMAND-VERIFIED]`
- Floating mode test suite (`scripts/verify-floating-mode.js`): **7/7 PASSED** `[COMMAND-VERIFIED]`
- Web preview test suite (`scripts/verify-web-preview.js`): **6/6 PASSED** `[COMMAND-VERIFIED]`
- Dev server running on port 3000: `[RUNTIME-VERIFIED]`




