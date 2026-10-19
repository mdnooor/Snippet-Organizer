# Architecture Audit (Version 1)

Source-verified 2026-10-20 against `src/`, `public/`, `scripts/`, `tests/`. Narrative docs: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md); diagrams: [`docs/diagrams/`](../docs/diagrams/).

## Verified structural claims

1. **Three HTML entries** (`vite.config.ts` rollup inputs): `index.html` (web demo), `popup.html` (docked/floating popup), `settings.html` (options). Each has its own TSX bootstrap (`main.tsx`, `popup.tsx`, `settings.tsx`) converging on `App.tsx`.
2. **Single data accessor**: `indexedDB` appears only in `src/db.ts` (grep-verified). DB `snippet-organizer` v1, stores `snippets`/`categories`/`preferences`, seed data on first run, no migrations.
3. **Service layer with injected dependencies**: `auth.ts` (`createAuthController`, `resolveOAuthConfig`), `connection.ts` (probe + disconnect guard, reads `chrome.storage.local.gdriveUserDisconnected`), `driveClient.ts` (Drive REST), `backup/gather/snapshot/snapshotStore` (create path), `restore.ts`+`conflict.ts` (restore path). Tests inject fakes — zero live network/IndexedDB in suites.
4. **Refresh orchestrator** (`popupRefresh.ts`): single-flight, `Promise.allSettled([loadData, probe])`, error funnel, `minDurationMs` floor, never throws. Wired from `MainPopup.tsx`; button rendered unconditionally.
5. **Service worker = window plumbing only**: floating-window lifecycle, bounds lock, `toggle-organizer`, `action.openPopup`; storage keys `isFloatingMode`/`floatingWindowId`/`floatingWindowPosition`; **no Drive, no IndexedDB**.
6. **Manifest facts**: MV3; permissions `storage`, `identity`; OAuth scope exactly `https://www.googleapis.com/auth/drive.appdata`; no `key`; commands `_execute_action` + `toggle-organizer` (Ctrl+Shift+X).

## Invariants re-verified in source at audit time

- Disconnect guard ordering: intent flag checked before any token request in the probe path (`connection.ts` step 1.5; pinned by `gdrive-connection` suite). Only the explicit Connect flow clears the flag.
- Truth-only status: no "synced/last-synced" strings exist in UI source (GD-07).
- No background/scheduled Drive operations anywhere (GD-06).
- Soft delete via `deletedAt`; `version` used by conflict classification (`conflict.ts`).

## Architecture risks / observations (recorded, not fixed)

- `MainPopup.tsx` and `SettingsView.tsx` are large; a future regression is cheapest to catch at the orchestrator seam (pattern proven by `popup-refresh` suite).
- `db.ts` mixes repository, seeding, search, and backup/restore helpers — acceptable at v1, split before schema v2.
- The web-demo entry stubs `chrome.*`; privacy/security reasoning must always cite the extension entries, not the demo.

Verdict: implemented architecture matches the documented architecture; no contradiction found between code and the current doc set after the README viewport correction (see [DOCUMENTATION_AUDIT.md](DOCUMENTATION_AUDIT.md)).
