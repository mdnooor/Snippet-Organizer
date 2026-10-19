# Security & Privacy Audit (Version 1)

Date: 2026-10-20. Severity-labeled findings from manifest, source, ignore rules. **No formal security certification performed.** Narrative doc: [`docs/SECURITY_AND_PRIVACY.md`](../docs/SECURITY_AND_PRIVACY.md).

## Findings

| # | Severity | Finding | Evidence |
|---|---|---|---|
| S-1 | Info | Permissions are minimal: `storage` + `identity` only; no host permissions, tabs, content scripts | `public/manifest.json` |
| S-2 | Info | Single OAuth scope `https://www.googleapis.com/auth/drive.appdata` (non-sensitive, app-private folder) | manifest + `auth.ts:DRIVE_APPDATA_SCOPE` |
| S-3 | Low | OAuth **client id** committed in manifest — public identifier, standard for extensions; not a secret | manifest `oauth2.client_id` |
| S-4 | Medium (inherent, mitigated) | `getAuthToken` token lifecycle depends on Chrome cache; mitigation: silent-only probe, 401 → `removeCachedAuthToken` + retry, explicit Disconnect evicts token and persists `gdriveUserDisconnected` (blocks all auth/network; pinned by tests) | `connection.ts`, `gdrive-connection` suite |
| S-5 | Low | `.env.example` advertises `GEMINI_API_KEY`/`APP_URL` (AI Studio template) — **unused by extension** (`@google/genai` unimported per `docs/generated/dependency-inventory.md`); `.gitignore` excludes `.env*` | `.env.example`, generated inventory |
| S-6 | Info | External transmission only to `www.googleapis.com` and only on user-initiated Drive ops / silent probe while connected; no telemetry endpoints | endpoint grep over `src/` |
| S-7 | Low | Stray repo artifacts (`Snippet-Organizer-project.zip`, legacy `*-1.*` files) could confuse a public push; audit before publishing | root listing |
| S-8 | Info | No token or snippet-content logging found in production source | grep `console.*` review |

## Privacy posture

- User content lives in IndexedDB locally; Drive copies exist only in the user's own `appDataFolder` after explicit snapshot creation; uninstall leaves Drive files until deleted (documented).
- Disconnect guarantee: after explicit Disconnect, zero Drive auth/network on every path; only the explicit Connect control restores access. Limitation: Google-side revocation/testing-token expiry are external and surface as honest `not-connected` states.

## Pre-push recommendations

1. Resolve S-7 (hygiene task), 2. pin manifest `key` before any store upload, 3. keep `.env*` out of commits (already ignored), 4. re-review any added logging before shipping.
