# PR-1 Completion Report — Production Readiness Phase 1
**Startup Connection State · Account Identity · Precise Drive Errors**
Date: 2026-10-19 · Status: `implemented-unverified` (in-Chrome manual checklist pending)

> Secret hygiene: the user's real OAuth client ID appears in this report only in masked form
> (`1085314759…j63.apps.googleusercontent.com`, 73 chars). It was verified well-formed and
> non-placeholder by command, never printed in full.

---

## 0. Context

The user completed the Google Cloud setup themselves: project **"Snappy Organization"**, OAuth
consent screen **External / Testing** with themselves as Test user, **Drive API enabled**, and a
**real Chrome-application OAuth client ID** placed in `public/manifest.json`. The user reports
that **live authorization and cloud snapshot create/list work** in Chrome
(USER-ATTESTED — the agent has no Chrome runtime and did not observe this).

Two bugs were reported against this now-live setup:
1. After an app/extension restart, Settings shows **Connect** even though the account is still
   authorized (clicking it silently "reconnects").
2. The connected account's **email/profile picture are not shown** anywhere.

## 1. Root causes found

### Bug 1 — stale `Connect` after restart
`[SOURCE-VERIFIED]` Chrome's `chrome.identity` **token cache persists across extension restarts**,
but the GD-07 connection row derived its state ONLY from in-session outcomes:
`SettingsView.tsx` initialized `driveConnection` as `'disconnected'` whenever the OAuth config
was present, and only an in-session success (Connect click / create / refresh) ever flipped it to
`'connected'`. After a restart — with a perfectly valid cached grant — the row therefore claimed
"disconnected". The old code comment ("derived ONLY from in-session auth outcomes — never
assumed") documented an intentionally session-truthful design that became wrong the moment the
user's grant outlived the session. Clicking the stale `Connect` succeeded instantly because
`getAuthToken({interactive:true})` resolves silently from the cache.

### Bug 2 — no identity display
Never implemented: the GD-02 auth layer requested no identity surface, and the safe mechanism was
only established during PR-1 research (below).

### Task 4 — imprecise errors
`[SOURCE-VERIFIED]` `driveClient.ts`'s failure mapper mapped **every 403 to `'forbidden'`**, and
the UI rendered it as *"Google Drive refused the request (permissions)"*. Drive's documented
behavior includes **rate-limiting via 403** (`rateLimitExceeded`, `userRateLimitExceeded`,
`dailyLimitExceeded`, `rateLimitExceededUnreg`, `sharedLimitExceeded`), so transient quota
failures were mislabeled as permission problems. Error-body reasons (`error.errors[].reason`,
`error.details[].reason`) were parsed nowhere.

## 2. Files changed and why

| File | Change | Why |
|---|---|---|
| `src/gdrive/connection.ts` **(NEW)** | `createConnectionProbe`: config gate → **silent** `getAuthToken({interactive:false})` → `GET https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)`; typed `DriveConnectionState` (`setup-needed` / `disconnected{reason,message}` / `connection-error{message}` / `connected{account}`); 401 → `removeCachedAuthToken` + ONE silent re-auth + retry, still-401 ⇒ `disconnected`; 403 reason-specific messages; network throw ⇒ `connection-error` | Real startup state (Bug 1) + identity (Bug 2) in one call; separate module so the GD-08 auth-controller surface guard (5 members, no network capability on `signOut`) stays intact; never prompts; no logging; identity in-memory only |
| `tests/gdrive-connection.test.ts` **(NEW)** | 14 tests: config gate, **every auth call non-interactive**, restart-connected (with URL/headers/fields assertions), denied/interaction-required/error → disconnected, 401-retry ×3 (recover / interaction / endless-loop guard), 403 `insufficientPermissions` vs `rateLimitExceeded` vs unknown reason vs 500, offline, identity hygiene (empty fields, non-https photo → null) | Prove the lifecycle the UI now depends on |
| `src/gdrive/driveClient.ts` | Exported `reasonFrom` + `DRIVE_RATE_LIMIT_403_REASONS`; optional `reason` on unauthorized/forbidden/rate-limited/not-found results; extended mapper **promotes 403 rate-limit reasons → `'rate-limited'`**; `messageFrom` falls back to reason-bearing text | Task 4 — precise, honest errors |
| `src/gdrive/snapshotStore.ts` | `ServiceFailure` members carry optional `reason` | Reason flows through the service layer unchanged (client results stay assignable) |
| `src/gdrive/backup.ts` | Forbidden failures append Drive's reason to the user-facing message | Task 4 |
| `src/components/SettingsView.tsx` | Mount-time silent probe; `driveConnection` gains `'checking'`/`'connection-error'`; identity row (avatar `<img referrerPolicy="no-referrer">` with brand-red initial fallback + email); Disconnect clears identity; Connect re-probes; `describeDriveError` reason-aware; comment updated from the outdated session-truth contract | Bug 1 + Bug 2 UI; multi-account disambiguation via the email itself |
| `src/components/Footer.tsx` | Optional `driveStatus` prop → left-side dot + "Google Drive connected" / "Google Drive not connected" (`role="status"`); attribution unchanged; doc comment updated honestly | Task 2 — real state only, **zero sync claims** (GD-06/GD-07 hold) |
| `src/components/MainPopup.tsx` | Silent probe on mount (`disposed` guard), status state → `Footer`; comment updated | Task 2 wiring |
| Packaging | Zip rebuilt via .NET `ZipArchive` — **forward-slash entry names** | `Compress-Archive` wrote `assets\…` backslash entries AND stale duplicates (35 entries vs the correct 17); backslash entries extract as flat malformed names on non-Windows tools |
| Docs | `oauth-contract.md` §8+§9, `ARCHITECTURE.md` §8, `DOCUMENTATION_CHANGELOG.md`, both `BACKLOG.md`s, handoff `tasks/{active,completed}.md` | Canonical-docs maintenance contract |

**Untouched (per constraints):** backup/restore behavior, snapshot schema, conflicts, checkpoint,
local data, GD-06/§17, dependencies, manifest permissions/scopes.

## 3. Tests / lint / build results

| Check | Result | Evidence |
|---|---|---|
| `npx.cmd tsx tests/gdrive-connection.test.ts` | **14/14 pass, 0 fail** | `[COMMAND-VERIFIED]` |
| auth / contract / backup / browse / restore regression | **22 / 27 / 26 / 19 / 28 — all pass, 0 fail** (backup 22→26 with the 4 new reason tests) | `[COMMAND-VERIFIED]` |
| Total | **136/136** across six suites (was 118/118) | `[COMMAND-VERIFIED]` |
| `npm.cmd run lint` (`tsc --noEmit`) | **exit 0** | `[COMMAND-VERIFIED]` |
| `npx.cmd vite build` | **exit 0** (~518 ms) | `[COMMAND-VERIFIED]` |
| `npm.cmd run build` | exit 1 — **pack step only** (absent `python3`; pre-existing documented environment limit, unchanged by PR-1) | `[COMMAND-VERIFIED]` |
| `dist/manifest.json` | **byte-identical to `public/manifest.json`**; client ID present, well-formed, non-placeholder (masked above); scopes **exactly** `https://www.googleapis.com/auth/drive.appdata`; permissions `storage,identity` | `[COMMAND-VERIFIED]` |
| `dist/snippet-organizer-extension.zip` | 17 entries, all forward-slash; **`manifest.json` at zip ROOT**; root manifest byte-identical to source | `[COMMAND-VERIFIED]` |

## 4. What needs manual Chrome testing (agent could not)

1. **Restart truthfulness**: connect → close/reopen the popup (or reload the extension) → the
   Settings row should show **connected** (email + avatar) and the footer "Google Drive
   connected" — without any prompt.
2. **Footer both states**: Disconnect → footer shows "Google Drive not connected"; Connect →
   flips back to connected.
3. **Disconnect identity**: after Disconnect, email/avatar disappear from the connection row.
4. **Revoked token**: revoke the app at myaccount.google.com/permissions → reopen → row shows
   **disconnected** (not connected-error); Connect prompts and recovers.
5. **Precise error wording**: temporarily disable the Drive API in the Cloud console → create a
   backup → expect the Drive-API/Test-user guidance; (rate-limit wording is covered by unit
   tests; live triggering is impractical).
6. **Offline**: with network blocked, row/footer must show a connection-error, never a false
   "disconnected"/"connected".
7. **Avatar**: confirm the Google profile picture renders (and the initial fallback if photos are
   blocked by policy).

## 5. Is an extra OAuth scope needed? — **NO**

`[SOURCE-VERIFIED]` The official Drive v3 `about.get` reference (fetched via web proxy,
2026-10-19) lists `https://www.googleapis.com/auth/drive.appdata` among the scopes that
authorize `about.get`. The probe therefore reads `user(displayName,emailAddress,photoLink)`
**with the existing token** — zero scope or permission increase. The alternative,
`chrome.identity.getProfileUserInfo`, was **rejected** because it requires the new
`identity.email` manifest permission. Scopes in `public/manifest.json` remain exactly
`drive.appdata`; permissions remain `storage,identity`.

## 6. What remains before Chrome Web Store publishing

1. **Pin the extension ID** — upload the zip (unpublished) in the Developer Dashboard, copy the
   public-key PEM body into `public/manifest.json` as `key` (user-owned action; the agent never
   generates it). **This is the only hard blocker.** If the pinned ID differs from the current
   unstable one, the OAuth client's Item ID must be updated to match.
2. Run the §4 manual checklist in real Chrome.
3. Re-verify the packaged zip after the `key` edit (root `manifest.json`, scopes, client ID).
4. Store listing assets (description, screenshots, privacy policy), CWS privacy disclosures
   (limited-use: `drive.appdata`, `identity`), and a final decide on the consent-screen
   Testing→Production promotion (Testing tokens expire after 7 days; Production avoids
   re-consent churn for real users).

## 7. Honesty ledger

- Everything tagged `[COMMAND-VERIFIED]` above was executed in this session with observed output.
- Live OAuth/Drive behavior with the real client is **USER-ATTESTED** (`[UNKNOWN]` for the agent).
- In-Chrome rendering of the new probe/identity/error UI is **not verified** — no Chrome runtime
  in this environment; covered by 14 unit tests instead, which do not substitute for the manual
  checklist.
- One mid-task correction: the zip was rebuilt after verification caught `Compress-Archive`
  writing backslash entry names and stale duplicates (35 → 17 entries); the final zip is the
  verified one.

---

## 8. Follow-up fix (2026-10-19, PR-1b): Disconnect did not survive popup reopen

### 8.1 Confirmed root cause
`[SOURCE-VERIFIED]` **`chrome.identity.removeCachedAuthToken` only evicts Chrome's LOCAL token
cache entry — it does NOT revoke the OAuth grant.** The Disconnect flow (`signOut()` →
`clearAllCachedAuthTokens`) therefore removed the cached token and cleared in-memory UI state,
but the user's consent remained valid at Google. On the next popup open, PR-1's startup probe ran
`getAuthToken({interactive:false})` — Chrome **silently minted a brand-new token** from the
still-valid grant — `about.get` succeeded, and the probe honestly (but wrongly, from the user's
point of view) reported `connected`. The disconnect decision lived only in component state, which
dies with the popup. Conclusion: removing a cached token can never persist a disconnect; the
user's choice must be persisted and honored BEFORE any token lookup. (Chrome's identity API has
no grant-revocation call; true revocation remains a Google Account action — oauth-contract §5.)

### 8.2 Files changed
| File | Change |
|---|---|
| `src/gdrive/connection.ts` | `ConnectionIntentStore` seam + `createChromeConnectionIntentStore()` (guarded `chrome.storage.local`, key `gdriveUserDisconnected`; missing/broken API degrades to `false` without throwing). Probe step 1.5 — BEFORE any token lookup or network call: flag set ⇒ `disconnected{reason:'user-requested'}` with **zero** auth/Drive calls; storage read failure ⇒ treated as not-disconnected. |
| `src/components/SettingsView.tsx` | Disconnect persists the flag FIRST (choice survives reopen even if token eviction fails), then `signOut()`; row note "You disconnected Google Drive. Click Connect to reconnect."; Connect clears the flag BEFORE the interactive authorize — an explicit click is the only path that may clear it. |
| `tests/gdrive-connection.test.ts` | +5 regression tests (14 → 19), see 8.3. |
| Docs | oauth-contract §9 (PR-1b), ARCHITECTURE §8, DOCUMENTATION_CHANGELOG, both BACKLOGs, handoff records. |

Untouched: identity/avatar/footer display logic, backup, restore, snapshot schema, GD-06/§17,
dependencies, manifest scopes/permissions.

### 8.3 Tests and build results `[COMMAND-VERIFIED]`
- New regression tests: (1) persisted flag beats a VALID cached token — probe makes **zero**
  `authorize` calls and **zero** Drive calls; (2) popup-reopen simulation with a fresh probe
  instance and a freshly minted token — still `disconnected`; (3) explicit Connect clears the
  intent and reconnection succeeds; (4) storage read failure → probe proceeds (never stuck);
  (5) `chrome.storage.local` adapter roundtrip + missing/broken-API degradation.
- Battery: connection **19/19**, auth 22, contract 27, backup 26, browse 19, restore 28 —
  **141/141, fail 0**. `npm.cmd run lint` exit 0. `npx.cmd vite build` exit 0 (447 ms).

### 8.4 Packaging limitations
- `npm.cmd run build` still exits 1 at the pack step only (absent `python3` — pre-existing,
  documented). The zip was produced with the documented .NET `ZipArchive` fallback: 17 entries,
  all forward-slash, **`manifest.json` at the zip root**, byte-identical to
  `public/manifest.json`; `dist/manifest.json` == source; the fix marker
  (`gdriveUserDisconnected`) is present in the shipped bundle (`src-BjuS1HR5.js`).
- Reload the unpacked extension (or re-zip after pinning `key`) so Chrome loads this build — the
  old background copy keeps the old behavior.

### 8.5 Exact manual Chrome steps
1. **Disconnect**: open the popup → Settings → Backup & Data → Google Drive connection →
   **Disconnect**. Expect: email/avatar disappear, row note "You disconnected Google Drive. Click
   Connect to reconnect.", footer dot gray "Google Drive not connected".
2. **Reopen**: close the popup completely and reopen it (also try reloading the extension at
   `chrome://extensions`). Expect: footer "Google Drive not connected"; Settings row still
   disconnected with the same note — **no silent reconnect, no prompt**.
3. **Drive-side sanity (optional)**: the account is still authorized at Google — this is
   expected; the app-level switch keeps the extension disconnected until you reconnect. Full
   revoke = myaccount.google.com/permissions → remove access.
4. **Explicit reconnect**: click **Connect** → Google consent (if Chrome prompts) → row shows
   connected + email/avatar, footer "Google Drive connected". Create a backup to confirm the
   pipeline still works end-to-end.
5. **Reconnect survives reopen**: close/reopen the popup after Connect — it must show connected
   again (the flag was cleared by your explicit click).
6. **Failure honesty (optional)**: with DevTools → Network offline, reopen — footer/row must
   show a connection error, never a fabricated "connected".

**Agent-side verification remains `[UNKNOWN]` for steps 1–6** (no Chrome runtime here); the unit
battery above proves the state machine, not the browser integration.

---

## 9. Follow-up fix (2026-10-19, PR-1c): Browse Drive fetched live data while disconnected

### 9.1 Confirmed root cause — the list was LIVE, not cached
`[SOURCE-VERIFIED]` PR-1b made the *connection UI* honest, but the persisted flag
(`gdriveUserDisconnected`) was only consulted by the startup **probe**. Browse Drive ran a
different path: `SettingsView.handleDriveRefresh` → `getDriveService().browse()` →
`snapshotStore.withAuthorizedClient` → `authorize({interactive:true})` — **which never checked
the flag**. Chrome's `getAuthToken` prompts only when consent/account-selection UI is needed;
with the OAuth grant still valid at Google it resolves silently by minting a fresh token, so the
browse **did issue real Drive `files.list` requests** and the displayed backup file was a **live
API response — NOT cached data** (the app has no Drive listing cache; the UI list is in-memory
component state that dies with the popup). A successful browse even flipped the row back to
`connected` ("a successful browse IS a connection proof"), deepening the contradiction. Restore's
download, per-row Save (download), Delete, and backup **Create** all shared this unguarded
authorize seam.

### 9.2 Files changed
| File | Change |
|---|---|
| `src/gdrive/snapshotStore.ts` | `withAuthorizedClient` checks the persisted intent BEFORE any token lookup — browse/download/delete (restore's download shares the seam) return typed `user-disconnected` failures with **zero** auth/network calls; `ServiceFailure` + `user-disconnected`; `DriveServiceDeps.connectionIntent` (default chrome adapter; read failure ⇒ proceeds — probe parity). While disconnected, Delete is gated — Disconnect can never delete remote data. |
| `src/gdrive/backup.ts` | Orchestrator `run()` step 0: same intent check → `failed{reason:'user-disconnected'}` with zero auth/local-reads/uploads. |
| `src/gdrive/connection.ts` | Shared `USER_DISCONNECTED_DRIVE_MESSAGE` const (single message everywhere). |
| `src/components/SettingsView.tsx` | One shared intent store injected into both service seams (no separate auth path); new distinguishable `disconnected` list phase (its own message + "Connect above to browse again"; never an empty list, never a generic error); Disconnect clears the in-memory listing so nothing stale can masquerade as live data; `describeDriveError` case. |
| Tests | `tests/gdrive-browse.test.ts` +4 (→23), `tests/gdrive-backup.test.ts` +2 (→28). |
| Docs | oauth-contract §9 (PR-1c), ARCHITECTURE §8, DOCUMENTATION_CHANGELOG, both BACKLOGs, handoff records. |

### 9.3 Regression tests and results `[COMMAND-VERIFIED]`
1. Flag true → Browse: **zero** `authorize` calls, **zero** Drive requests, typed result (store read exactly once).
2. Flag true → Delete + Download gated — Disconnect can never delete or fetch remote backups (zero requests).
3. Clearing the intent (the explicit-Connect contract) → live listing works again on the same service instance.
4. Intent-store read failure → probe parity: proceeds normally (never permanently stuck).
5. Flag true → backup Create: zero auth, zero local reads, zero network, typed failure.
6. Intent cleared → Create proceeds to authorization and succeeds end-to-end.
Results: browse **23/23**, backup **28/28**; full battery **147/147, fail 0**; `npm.cmd run lint`
exit 0 (one TS18048 in a new test fixed); `npx.cmd vite build` exit 0 (456 ms).
Requirement mapping: stale-as-live (§Step5-2) — the guard returns before any request and the UI
clears/labels via the disconnected phase; API-failure-vs-empty (§Step5-8) — failures stay typed
and render in the distinct error phase (existing coverage intact).

### 9.4 Build and packaging `[COMMAND-VERIFIED]`
`npm.cmd run build` still exits 1 at the pack step only (absent `python3` — pre-existing).
Zip via the documented .NET `ZipArchive` fallback: **17 entries, all forward-slash, root
`manifest.json` byte-identical to `public/manifest.json`; `dist/manifest.json` == source**; the
PR-1c marker is present in the shipped bundle (`src-CfAgpCci.js`). Reload the unpacked extension
before testing.

### 9.5 Exact manual Chrome steps
1. **Preparation**: with Drive connected and at least one snapshot in Drive, note the visible
   backup list. Then **Disconnect** (Settings → Backup & Data → Disconnect).
2. **Disconnected state**: email/avatar hidden, row note shown, footer "Google Drive not
   connected", and the Snapshots card shows the **disconnected panel** ("Google Drive is
   disconnected — click Connect to reconnect." + "Snapshots already stored … are untouched") —
   **no file list**, and the button reads "Browse Drive" (not "Refresh").
3. **Browse while disconnected**: click "Browse Drive". Expect: NO Google prompt, the same
   disconnected panel (never a list, never "No cloud snapshots yet"). Optional proof of no live
   call: DevTools → Network stays silent (no `drive/v3/files` request).
4. **Operations gated**: Create shows the disconnected failure toast; Restore/Save/Delete per-row
   actions are unreachable (no rows rendered) and would return the same typed failure.
5. **Explicit Connect**: click **Connect** → consent if Chrome asks → row connected + email/
   avatar return, footer green.
6. **Existing backup visible**: after Connect, browse lists the **previously saved snapshot**
   (Drive data was never deleted — PR-1b/1c only evict the local token cache and set an app-level
   flag). Restore from it to confirm end-to-end.

**Real Chrome verification was NOT performed by the agent** — no Chrome runtime exists in this
environment; all evidence above is `[COMMAND-VERIFIED]` (unit battery/lint/build/zip) plus
`[SOURCE-VERIFIED]` code tracing. Step 9.5 is user-owned and unverified (`[UNKNOWN]`).
