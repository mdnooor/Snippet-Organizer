# Google Drive Backup — OAuth Contract & Official-Docs Verification (GD-02)

**Status**: IMPLEMENTED-UNVERIFIED (auth foundation + tests delivered; live `chrome.identity`/Google-account verification is GD-08's gate)
**Date**: 2026-10-18
**Canonicality**: Canonical record for GD-02: official-source verification, OAuth decision, configuration contract, and setup steps. Builds on the snapshot data contract in [`data-contract.md`](data-contract.md) (GD-01) and ADR-010/011; decisions D1/D3–D6 are not restated here.

---

## 1. OAuth mechanism decision

**Chosen: `chrome.identity.getAuthToken`** (Google-only flow, manifest-declared client), implemented in `src/gdrive/auth.ts`.

| | `getAuthToken` (chosen) | `launchWebAuthFlow` |
|---|---|---|
| Official support for Google OAuth in extensions | The documented path: "Gets an OAuth2 access token using the client ID and scopes specified in the **oauth2 section of manifest.json**" | Generic flow, "enables auth flows with **non-Google** identity providers" |
| Account picker / consent / Chrome-sign-in UI | Managed by Chrome | Must be built by hand inside a web view |
| Token cache & expiration | Chrome-managed, in-memory, "automatically handles expiration" | Extension-managed (implicit tokens in URL fragments) |
| Redirect handling | None | Extension must catch `https://<app-id>.chromiumapp.org/*` and parse fragments |
| Least privilege | Scopes declared in manifest and enforced per-call (the call's `scopes` field **overrides** the manifest list — our code always passes exactly `[drive.appdata]`) | Manual scope/URL construction |

The tutorial's architecture note settles why an identity API is needed at all: "Because extensions don't load over HTTPS, can't perform redirects or set cookies, they rely on the Chrome Identity API to use OAuth2."

## 2. Official documentation verification record (2026-10-18)

| Source (fetched live) | Conclusions it supports |
|---|---|
| [browser.identity API reference](https://developer.chrome.com/docs/extensions/reference/api/identity) | API requires the **`identity` permission**; `getAuthToken` reads `oauth2` manifest key; **in-memory token cache handles expiration automatically**; `interactive` flag semantics (false ⇒ fails whenever a prompt would be required); per-call `scopes` **overrides** manifest; promise result `{token, grantedScopes}` (Chrome 105+); **`clearAllCachedAuthTokens`** (Chrome 87+) removes all cached tokens, account prefs, and de-authorizes all auth flows; `removeCachedAuthToken` for invalid tokens; `launchWebAuthFlow`/`getRedirectURL` produce `https://<app-id>.chromiumapp.org/*`; UX rule: **interactive prompts must be initiated by UI explaining the authorization, never at app launch**; `getProfileUserInfo` would additionally require `identity.email` (**not requested** — least privilege). |
| [Manifest key: oauth2](https://developer.chrome.com/docs/extensions/reference/manifest/oauth2) + [Manifest file format](https://developer.chrome.com/docs/extensions/reference/manifest) | `oauth2` is an optional key: object with required **`client_id`** and **`scopes`**; docs recommend pairing with the extension's **`key`** "to keep a consistent extension ID"; official example itself uses a placeholder client-ID string. |
| [OAuth 2.0 tutorial](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth) (canonical; redirects from `mv3/tut_oauth`) | Stable-ID procedure: upload unpublished zip to the **Developer Dashboard → Package → View public key** → copy PEM body, strip headers/newlines → manifest **`key`**. OAuth client: Google API Console → Clients → Create → **Application type: "Chrome Extension"** → **Item ID = extension ID** → no client secret. Manifest registration + `chrome.identity.getAuthToken({interactive: true})` is the official usage pattern; the target API (here **Google Drive API**) must be enabled in the project's API Library. |
| [Store application-specific data (appDataFolder)](https://developers.google.com/workspace/drive/api/guides/appdata) | appDataFolder is a special **hidden per-app folder**: "Only the application that created the data in the appDataFolder can access it"; hidden from the user and other Drive apps; auto-created on first write. Scope: `https://www.googleapis.com/auth/drive.appdata` (page calls it a **non-sensitive scope**). Constraints: **cannot share**, cannot move between spaces, **cannot trash** appDataFolder files (`notSupportedForAppDataFolderFiles`) ⇒ deletions there are permanent; the folder is deleted if the user removes the app's access from My Drive or deletes it manually (recovery caveat). API surface: `files.create(parents=['appDataFolder'])`, `files.list(spaces='appDataFolder')`, `files.get(alt=media)`. |
| [Choose Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) | `drive.appdata` (alias `drive.appfolder`) is listed under **"Non-sensitive scopes"** — "View and manage the app's own configuration data in your Google Drive". Scopes are declared in **two places**: consent-screen config (maximum set) and app code. Public apps using data-accessing scopes may require verification; prefer the narrowest scope. **Correction recorded**: GD-01's preparation review had flagged `drive.appdata` as *possibly sensitive* (`[UNVERIFIED-EXTERNAL]`); both official pages now verify it as **non-sensitive** — consent-screen verification burden for this scope is accordingly lighter. |
| [Configure the OAuth consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent) | Google Auth platform setup: **Branding** (app name, support email), **Audience** (user type **Internal** or **External**; External ⇒ **Test users** must be added), **Data Access** (declared scopes; prefer non-sensitive). |
| [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2) + [web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server) | Access tokens **expire**; `invalid_grant` ⇒ re-authenticate; revoking a grant revokes **all** its scopes (combined authorization); `redirect_uri_mismatch` semantics (not applicable to `getAuthToken`, which uses no redirect URI). **Not re-verified here** (page moved / 404): the "refresh tokens expire after 7 days in Testing-mode projects" policy — `[UNKNOWN]`; it does not affect this design because `getAuthToken` exposes no refresh token to manage (Chrome's cache handles expiry). |

Distinguishing: everything in the table above is `[SOURCE-VERIFIED]` (fetched live this session via browser). Items explicitly **not** verified: the 7-day-testing-token policy (`[UNKNOWN]`), Chrome's exact runtime error strings for `getAuthToken` failures (our classifier matches case-insensitively on cancel/dismiss/interaction and treats anything else as generic `error` — tolerant by design), and all live Chrome/Google behavior (GD-08).

## 3. Stable extension ID and redirect configuration

- `getAuthToken` needs **no redirect URI** and no `chromiumapp.org` registration — that machinery belongs to `launchWebAuthFlow`, which we do not use.
- What the OAuth client binds to is the **extension ID** (console "Item ID"). An unpacked extension's ID derives from its absolute path (unstable across machines), so the official procedure pins it via the manifest **`key`** field (public key obtained through an unpublished Developer Dashboard upload). The `key` value is **user-owned configuration**: we do not generate, fabricate, or commit one. Until it is set, the extension ID may differ per machine, and the user's OAuth client must be registered against whichever ID their build produces.

## 4. Manifest changes (shipped in `public/manifest.json`)

```json
"permissions": ["storage", "identity"],
"oauth2": {
  "client_id": "YOUR_EXTENSION_OAUTH_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/drive.appdata"]
}
```

- `identity` permission: required by the identity API (verified).
- `oauth2.scopes`: **exactly** `drive.appdata` — least privilege (verified non-sensitive). A regression test asserts the on-disk manifest never requests more.
- `client_id`: the official docs' own placeholder style, until the publisher substitutes their real client ID. It is a public identifier, not a secret — but we never invent one. With the placeholder present, Chrome still loads the extension; authorization simply reports `not-configured` until replaced.
- No `key` field yet (user-owned; §3). No other manifest keys changed.

## 5. Authorization flow, token handling, and states

Implementation: `src/gdrive/auth.ts` (`createAuthController`), pure against an injectable `AuthDeps` seam binding `chrome.identity` / `chrome.runtime.getManifest`.

- **Acquisition**: `authorize({interactive})` → validates config → `getAuthToken({interactive, scopes: [drive.appdata]})` (per-call scope override = belt-and-braces least privilege).
- **Reuse/expiry**: call sites get a token per operation; Chrome's cache serves repeat calls and handles expiration — we **never persist, log, or transmit** tokens (GD-00 D10 posture; tokens never enter `chrome.storage`).
- **Invalid token**: `removeCachedAuthToken` exists for invalid-token recovery (verified); GD-03 will call it before retrying a failed Drive call (401-class errors).
- **Failure mapping** (typed, never thrown): `not-configured` (placeholder/missing config, short-circuits before any Chrome call) · `denied` (user cancelled/dismissed) · `interaction-required` (silent call when a prompt is needed — UI must re-invoke interactively from explicit user action) · `error` (everything else, message preserved). `[INFERRED]` string matching is case-insensitive and tolerant; exact Chrome error strings are `[UNKNOWN]`.
- **Sign-out**: `signOut()` → `clearAllCachedAuthTokens()` (clears cached tokens and de-authorizes pending flows). Full server-side revocation is a user account action at the Google Account permissions page (`GOOGLE_ACCOUNT_PERMISSIONS_URL`, surfaced for GD-04/07 UI); per Google docs, revoking a grant removes all its scopes.
- **User-facing auth states** (for GD-04/07 to render): `not-configured` → "Cloud backup needs publisher setup" (with setup pointer); `signed-out/idle` → explicit "Connect Google Drive" button (never auto-prompted — official UX rule); `in-progress` (Chrome picker/consent); `authorized`; `denied` → re-try guidance; `error` → message + retry. Auto-consent on app launch is explicitly avoided.
- Multi-account note: `getAuthToken` without an `account` hint uses the Chrome profile's account; `onSignInChanged` exists for future account-change handling — out of GD-02 scope, noted for GD-04.

## 6. User-owned Google Cloud configuration (exact steps; blockers for live use only)

These are publisher actions in **their own** Google Cloud project — no code can substitute for them, and nothing here touches a developer's personal account or secrets (D1):

1. Create/select a Google Cloud project (this project owns the OAuth client; the Drive API must be enabled in its API Library).
2. Google Auth platform: configure **Branding** (app name, support email) and **Audience** — **External** user type ⇒ add **Test users** (up to the console-stated limit) for pre-publication testing; **Internal** works inside a Workspace org. **Data Access**: declare exactly `…/auth/drive.appdata`.
3. Pin a stable extension ID: unpublished Dashboard upload → Package → View public key → PEM body as manifest `key` (§3). Add `"key"` to `public/manifest.json`.
4. Create the OAuth client: API Console → Clients → Create → Application type **"Chrome Extension"** → **Item ID = the pinned extension ID** → copy the generated **client ID** (format `<num>-<hash>.apps.googleusercontent.com`) → replace the placeholder in `public/manifest.json` `oauth2.client_id`.
5. Load the unpacked extension, verify `chrome://extensions` shows the expected ID, then exercise auth from UI (GD-04+) — the runtime gate stays with GD-08.

Nothing else is user-supplied: no secrets exist for extension OAuth clients, and no scopes beyond `drive.appdata` may be added without reopening ADR-012.

## 7. Security & privacy constraints

- OAuth client ID is public configuration; **no client secret** exists in this flow and none may be committed.
- Tokens: in-memory only; never logged, stored, or sent anywhere except Google API calls (GD-03); never rendered.
- The consent prompt is only triggered by explicit user action with explanatory UI (official UX rule verified above).
- Scope additions require a decision-record amendment; the regression test fails any manifest scope drift.
- Cloud data remains untrusted input per the GD-01 contract (`data-contract.md` §10); the auth module adds no parsing of cloud content.

## 8. Module map, tests executed, and boundaries

- `src/gdrive/auth.ts` — constants (`DRIVE_APPDATA_SCOPE`, `OAUTH_SCOPES`, `PLACEHOLDER_CLIENT_ID`, `GOOGLE_ACCOUNT_PERMISSIONS_URL`), `resolveOAuthConfig`, `classifyAuthError`, `createAuthController` (`authorize`/`getToken`/`signOut`/`resolveConfig`/`isConfigured`).
- `src/gdrive/connection.ts` (PR-1, 2026-10-19) — `createConnectionProbe`: silent startup verification of the REAL connection state (config gate → non-interactive `getAuthToken` → Drive `about.get` with `fields=user(displayName,emailAddress,photoLink)`); typed `DriveConnectionState` (`setup-needed` / `disconnected` / `connection-error` / `connected` + in-memory identity); 401 → clear cache + ONE silent retry, still-401 ⇒ honest `disconnected` (Connect offered). **Scope fact (official Drive v3 reference, verified 2026-10-19): `about.get` explicitly accepts `https://www.googleapis.com/auth/drive.appdata` — account identity needs NO additional OAuth scope or manifest permission.** Never prompts; no logging; identity never persisted.
- `tests/gdrive-auth.test.ts` — **21 tests** `[COMMAND-VERIFIED]` (`npx.cmd tsx tests/gdrive-auth.test.ts`): config validation (missing key, empty/placeholder/malformed client ID, scope drift incl. extra/`drive.file`/`drive` attempts, missing `identity` permission), **on-disk manifest regression**, controller flows (not-configured short-circuit, interactive success + per-call scope assertion, silent → `interaction-required`, cancel → `denied`, unknown error passthrough, empty-token guard, double sign-out), classifier casing. GD-01 suite still 27/27.
- `npm.cmd run lint` → exit 0 `[COMMAND-VERIFIED]`.
- **Not verified** (honestly): real `chrome.identity` behavior, real consent screens, and real Drive calls in Chrome — GD-04+/GD-08 with a user-configured client `[UNKNOWN]`. Placeholder client ID loads in Chrome `[INFERRED]` from manifest-key semantics (load-time validation checks shape, not Google registration).
- **Boundaries**: no GD-03 Drive client calls, no GD-04 browse UI, no GD-05 restore, no GD-07 status cleanup, no background sync (D6), no new dependencies.

## 9. GD-08 verification status, evidence levels, and publisher checklist (2026-10-18)

### Evidence levels reached
| Area | Level | Basis |
|---|---|---|
| OAuth config validation, states, disconnect safety | `UNIT TESTED` | 22 tests incl. the GD-08 surface guard (controller exposes no Drive/network capability; `signOut` makes zero token calls) `[COMMAND-VERIFIED]` |
| Snapshot schema/serializer/integrity, conflicts, restore atomicity | `UNIT TESTED` | 27 + 28 tests, stubbed deps `[COMMAND-VERIFIED]` |
| Upload/browse/download/delete flows | `UNIT TESTED` (mocked Drive REST) | 22 + 19 tests; **mocks do NOT prove Drive E2E** |
| Type check / build | `BUILD VERIFIED` | `npm.cmd run lint` exit 0; `npx.cmd vite build` exit 0 (pack needs `python3`; documented Compress-Archive fallback produced the zip) `[COMMAND-VERIFIED]` |
| Real consent screen, token exchange, live Drive upload/list/download/restore/delete | **NOT RUN — blocked** | No user-owned Cloud project/client configured (placeholder client ID, no pinned manifest `key`); no real Chrome extension runtime in the verification environment |
| Extension screen rendering, keyboard/focus/screen-reader behavior | **NOT RUN** | No browser harness; TSX-only verification |

### PR-1 update (2026-10-19): user-owned configuration live + startup connection verification
- **Configuration state change**: the user completed the §6/publisher checklist themselves — own Cloud project ("Snappy Organization"), OAuth consent **External/Testing** with self as Test user, Drive API enabled, and a **real Chrome-extension OAuth client ID** placed in `public/manifest.json` (`permissions` unchanged: `storage`, `identity`; scopes unchanged: exactly `drive.appdata`; manifest `key` still unpinned). **Live auth + cloud snapshot create/list work — USER-ATTESTED, not agent-observed** (`[UNKNOWN]` for the agent; no Chrome runtime here).
- **Bug 1 root cause & fix**: Chrome's `chrome.identity` token cache **survives extension/app restarts**, but the GD-07 connection row derived its state only from in-session outcomes — so after restart it showed `Connect` while the grant was still valid. Fix: silent startup probe (`src/gdrive/connection.ts`) verifying config + cached token + live Drive access; UI reports `checking` until known, `connected` only on a working `about.get`, and honest `disconnected` for revoked/expired grants (one silent retry after cache clear, then Connect is offered).
- **Identity (Task 3)**: `about.get` returns email/displayName/https-photoLink with the EXISTING token — **zero scope increase** (docs-verified above). Shown in Settings → Backup & Data only while connected; cleared on Disconnect; in-memory only. `chrome.identity.getProfileUserInfo` was rejected (would need the extra `identity.email` permission).
- **Precise errors (Task 4)**: Drive rate-limits with **403** for the documented reason family (`rateLimitExceeded`, `userRateLimitExceeded`, `dailyLimitExceeded`, `rateLimitExceededUnreg`, `sharedLimitExceeded`) — previously mislabeled "permissions". `reasonFrom` parses `error.errors[].reason` / `error.details[].reason`; 403 rate-limit reasons map to `rate-limited`; `insufficientPermissions`/`serviceDisabled` messages point at Drive-API/Test-user setup.
- **Verification**: `tests/gdrive-connection.test.ts` (14 tests: never-prompt, restart-connected, denied/interaction, 401 retry semantics, precise 403s, offline, identity hygiene); driveClient reason tests in the backup suite; **136/136** across six suites + lint 0 + `vite build` 0 + zip root-`manifest.json` verified `[COMMAND-VERIFIED]`. Manifest source↔dist byte-identical; client ID verified well-formed and non-placeholder (masked in all reports). Remaining honestly-unverified: in-Chrome restart/identity/error rendering (manual checklist in `reports/PR1-production-readiness-report.md`).

### PR-1b update (2026-10-19): persistent user-requested disconnect
- **Reported bug**: after Disconnect, reopening the popup showed Connected again. Root cause: Disconnect only evicted Chrome's local token cache (`signOut`) and cleared in-memory UI state — the OAuth **grant** stays valid at Google, so the next silent `getAuthToken` minted a fresh token and the (correctly working) probe reported connected. **Removing a cached token can never persist a disconnect.**
- **Fix**: persisted user-intent flag in `chrome.storage.local` (`gdriveUserDisconnected`, `src/gdrive/connection.ts` `ConnectionIntentStore` + `createChromeConnectionIntentStore`). Disconnect writes the flag FIRST, then evicts the token cache; the probe checks it BEFORE any token lookup or network call — while set, it returns `disconnected{reason:'user-requested'}` with zero auth/network activity, so no cached or freshly minted token can override it. Only an explicit Connect click clears the flag (before the interactive authorize). This is an app-level switch, NOT server-side revocation — Chrome's identity API has no grant revocation; full revocation remains a Google Account action (§5).

### PR-1c update (2026-10-19): disconnect intent gates ALL Drive operations (Browse inconsistency fix)
- **Reported bug**: after Disconnect (flag persisted, probe honest), clicking Browse Drive still showed the saved backup. Root cause: the browse path (`snapshotStore.withAuthorizedClient`) never consulted `gdriveUserDisconnected` — its `authorize({interactive:true})` resolves SILENTLY because a prompt is only needed for consent/account selection, so Chrome re-minted a token from the still-valid grant and the listing shown was a **LIVE Drive response**, not cached data (the app has no Drive listing cache; UI list state is in-memory only). The UI said disconnected while Drive browsing silently reconnected.
- **Fix (one policy seam)**: `withAuthorizedClient` (browse/download/delete/restore-download) and the backup orchestrator's `run()` now check the persisted intent BEFORE authorize — while set they return typed `user-disconnected` failures with ZERO token acquisition and ZERO Drive requests. UI adds a distinguishable `disconnected` list phase (never an empty list, never stale entries; Disconnect clears the in-memory listing). Explicit Connect is still the only flag-clearing path; remote snapshots are never deleted by Disconnect (Delete itself is gated while disconnected).

### Publisher (user-owned) checklist — everything required before live use
*Status after PR-1 (2026-10-19): steps 2–4 are DONE (user-executed, user-attested); step 1 (pin the manifest `key`) is still pending; step 5 becomes the PR-1 manual Chrome checklist.*

1. Pin the stable extension ID: unpublished Developer Dashboard upload → copy the public-key PEM body into `public/manifest.json` as `key` (§3; **never** generated or committed by an agent).
2. Create/select **your own** Google Cloud project; enable the **Google Drive API**.
3. Auth platform: Branding + Audience (**External** → add yourself as Test user, or Workspace Internal); Data Access declares exactly `…/auth/drive.appdata`.
4. Create the OAuth client: application type **Chrome Extension**, Item ID = the pinned extension ID; replace the `oauth2.client_id` placeholder in `public/manifest.json` with the generated client ID.
5. Load unpacked, confirm `chrome://extensions` shows the expected ID, then exercise: Connect → Create backup → Browse → Download → Restore (preview + Merge/Replace) → Delete → Disconnect — verifying Drive's appDataFolder contents at each step.
6. **Never commit** client secrets (extension OAuth clients have none), access/refresh tokens, credential JSON, or private keys; revoke test grants at the Google Account permissions page (`GOOGLE_ACCOUNT_PERMISSIONS_URL`) after testing if desired.

### Known limits (unchanged by GD-08)
- Unpacked-ID instability until `key` is pinned; placeholder client ID keeps authorization at `not-configured`.
- Disconnect clears only Chrome's cached tokens; full server-side revocation is a Google Account action (§5).
- Auto-sync does not exist and must not be added without reopening GD-06/§17 and ADR-011.
