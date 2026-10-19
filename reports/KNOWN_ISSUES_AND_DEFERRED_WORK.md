# Known Issues & Deferred Work (consolidated, V1 baseline 2026-10-20)

Single consolidated view; details in [`docs/KNOWN_LIMITATIONS.md`](../docs/KNOWN_LIMITATIONS.md) and [`docs/TECHNICAL_DEBT.md`](../docs/TECHNICAL_DEBT.md). **None of these were changed by the documentation audit** — recorded findings only.

## Release blockers

1. **Unpinned manifest `key`** — CWS ID reassignment breaks the OAuth client pairing. Fix: generate/pin key, re-pair client (`public/manifest.json`).
2. **Repo hygiene before public push** — legacy `*-1.*` files, stray `200`/`350`, `Snippet-Organizer-project.zip`, `bun.lock`, duplicate root `PROJECT_BRIEF.md`, template deps (`express`, `jszip`, `@google/genai`, `dotenv`, `motion` — unimported per generated inventory), `package.json` name `react-example`.

## Deferred by decision (binding)

3. **GD-06 automatic sync & sync-conflict automation** — deferred; no background Drive code exists; revisit requires an ADR. Do not "helpfully" implement it.

## Known defects / gaps (accepted for V1)

4. Editor toolbar `no-scrollbar` rows (`SnippetEditorModal.tsx:917,950`) — undefined class → classic scrollbars (dropdown + tab row already fixed; these two flagged-only in turn 18 scope lock).
5. No React-layer automated tests; Chrome-runtime behavior (service worker windows, real OAuth) manual-only.
6. `scripts/pack-extension.js` requires `python3` (absent here; `npm run build` pack step fails; PowerShell workaround documented and verified).
7. No IndexedDB migration framework (DB pinned v1).
8. `user_preferences` `chrome.storage` mirror can diverge transiently from IndexedDB truth.
9. Root README historically claimed 712×512 — corrected in this audit; any cached/older clones should re-read.

## Unverified assumptions (investigation queue)

10. Chrome minimum-version floor (no `minimum_chrome_version` set).
11. Long-session mirror divergence magnitude; store-review copy for `identity`; real-Chrome visual pass of final UI (user-owned).
