# Security & Privacy

Findings are severity-labeled and grounded in source (`public/manifest.json`, `src/gdrive/*`, `.gitignore`, `.env.example`). **No formal security certification has been performed.**

## Permissions & justification `[SOURCE-VERIFIED]`

| Permission | Why | Risk |
|---|---|---|
| `storage` | `chrome.storage.local`: preferences mirror, floating-window state, **disconnect intent** | low — local only |
| `identity` | `chrome.identity.getAuthToken` OAuth for Drive | medium — token handling (below) |
| oauth2 scope `https://www.googleapis.com/auth/drive.appdata` | read/write the extension's **own** hidden Drive folder only | narrowest Drive scope; no access to user files in My Drive |

No `tabs`, no host permissions, no `unlimitedStorage`, no content scripts. `commands` binds only `Ctrl+Shift+X` (toggle window).

## Data handling

- Snippets, categories, preferences: **local-only** (IndexedDB). The web demo entry (`index.html`) runs without `chrome.*` and must never be used to judge privacy behavior.
- Leaves the machine **only** when the user explicitly uses a Drive feature: snapshot create/list/download/delete/restore, or the silent `about` probe while connected (and not explicitly disconnected). Payloads go to `www.googleapis.com` exclusively.
- Drive `appDataFolder` data is per-user per-application; not visible in My Drive; survives uninstall until deleted.
- No telemetry, analytics, or third-party endpoints anywhere in `src/` (endpoint grep: only `googleapis.com` + Google account-help URL).

## Secrets

- `oauth2.client_id` in the manifest is a **public identifier**, not a secret — safe to commit (standard for browser extensions).
- `.env.example` mentions `GEMINI_API_KEY`/`APP_URL` — **AI Studio template leftovers**, unused by the extension (no imports of `@google/genai` in `src/`; see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)). `.gitignore` excludes `.env*` (keeps `.env.example`). Never commit real keys or user data; the repo also contains stray snapshot artifacts (`Snippet-Organizer-project.zip`, legacy `*-1.*` files) — audit before any push (finding, untouched).

## Disconnect guarantees & limitations

Guarantee (pinned by tests): after explicit Disconnect, `gdriveUserDisconnected` blocks **all** Drive auth/network on every path; nothing reconnects silently; only the explicit Connect control clears it.
Limitations (honest): Google-account-level revocation and testing-mode token expiry are external; the extension can claim truthfully only what its probe verifies (GD-07). If the user disconnects at myaccount.google.com instead, the app reports `not-connected` on the next probe — no local flag change is required or performed.

## Logging risks

Production code does not log tokens or snippet content; review any added `console.*` before shipping (debug logging in dev entries only). No sensitive values found in current source logs `[SOURCE-VERIFIED: grep]`.

## Pre-release considerations (Web Store)

Justifications above map to the store permission declarations; `appDataFolder` usage and narrow scope should be stated in the listing. The unpinned manifest `key` must be resolved first ([BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md)). No CSP deviations; MV3 service worker only. Severity summary: no high findings; medium = token lifetime management inherent to `getAuthToken` (mitigated by eviction + typed errors); low/info = template leftovers.
