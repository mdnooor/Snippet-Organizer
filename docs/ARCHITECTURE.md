# Architecture — Snippet Organizer (Version 1)

`[SOURCE-VERIFIED]` against `src/`, `public/`, `scripts/`, `tests/` (2026-10-20). The living session-level architecture log is [`project-knowledge/ARCHITECTURE.md`](project-knowledge/ARCHITECTURE.md); ADRs are in [`project-knowledge/DECISIONS.md`](project-knowledge/DECISIONS.md).

## Layers

```
Chrome surfaces (popup.html / settings.html / index.html demo)
        │  React 19 (useState/useEffect only — no state library)
        ▼
UI components  src/components/*  ── call ──►  orchestration helpers (src/popupRefresh.ts)
        │                                      │
        ▼                                      ▼
Data access (repository)  src/db.ts  ────►  IndexedDB "snippet-organizer" v1
        │                                      (stores: snippets / categories / preferences)
        ▼
Integration services  src/gdrive/*  ────►  chrome.identity (OAuth) + Drive REST v3 (appDataFolder)
        │
Browser plumbing  public/service-worker.js  ──► chrome.windows / action / runtime / storage.local
```

## Entry points

| Entry | File | Role |
|---|---|---|
| Docked popup + floating window | `popup.html` → `src/popup.tsx` → `App.tsx` → `MainPopup.tsx` | Main UI; `isFloatingMode` from `chrome.storage.local` toggles window chrome |
| Options page | `settings.html` → `src/settings.tsx` → `SettingsModal`/`SettingsView` | Settings (same React tree, own entry) |
| Web demo (no chrome APIs) | `index.html` → `src/main.tsx` → `App.tsx` | Browser preview with `chrome` stubbed |
| Service worker (MV3, module) | `public/service-worker.js` | Floating-window lifecycle, `toggle-organizer`, bounds lock, `action.openPopup` |
| Build-time packaging | `scripts/pack-extension.js` | Zips `dist/` (python3) |

## Module boundaries (the important ones)

- **`src/db.ts`** — the ONLY IndexedDB accessor. Owns schema (v1), seeding, and all repository functions (`getAllSnippets`, `saveSnippet`, soft delete, `getCategories`, `saveCategory`, `getPreferences`, `savePreferences`, `buildBackupData`, `restoreBackupData`, `filterAndRankSnippets`). UI never touches `indexedDB` directly.
- **`src/gdrive/auth.ts`** — OAuth config resolution + `chrome.identity.getAuthToken` wrapper (silent & interactive paths), error classification. No Drive API calls here.
- **`src/gdrive/connection.ts`** — silent connection probe (`drive/v3/about`), identity, disconnect-intent handling (`gdriveUserDisconnected` in `chrome.storage.local`), explicit connect/disconnect, token-cache eviction edge cases. Truth-only status (GD-07).
- **`src/gdrive/driveClient.ts`** — thin Drive REST v3 client over `fetch` + bearer token (list/create/get/delete on `appDataFolder`).
- **`src/gdrive/backup.ts`, `gather.ts`, `snapshot.ts`, `snapshotStore.ts`** — snapshot assembly (gather local data → serialize → filename/timestamps) and upload; `snapshotStore.ts` caches the last local snapshot metadata for restore comparisons.
- **`src/gdrive/browse`** (in `backup.ts`/`driveClient.ts`) — listing + download; **`src/gdrive/restore.ts` + `conflict.ts`** — restore preview, conflict classification (`content-conflict` / `deletion-state-conflict`), resolution plan, apply.
- **`src/popupRefresh.ts`** — tested orchestrator for the popup Refresh button: single-flight, concurrent local reload + silent probe (`Promise.allSettled`), error funnel, connection-independent minimum feedback duration.
- **`public/service-worker.js`** — window management only; performs **no** Drive or IndexedDB work.

## Fixed-window constraints

UI-WINDOW-LOCK-01/02/03/04 + ADR-002 Amendment 3: outer window is exactly **480 × 600 px** in both docked and floating mode; the floating window is frame-compensated via `CALIBRATE_FLOATING_FRAME`; the popup content area is `w-[430px] h-[550px]` on a 25px ring. No responsive sizing. Visual system is locked (ADR-009, Red Glass-Claymorphism, `nm-*` class API in `src/index.css`).

## Key invariants

1. **Disconnect intent is authoritative**: after `gdriveUserDisconnected` is set, every probe path returns early with zero auth/network; only the explicit Connect control may clear it. Pinned by `tests/gdrive-connection.test.ts`.
2. **No automatic sync** (GD-06 deferred): no background upload/download; all Drive operations are user-initiated.
3. **Truth-only status** (GD-07): the UI may never show connection/sync state that the silent probe did not verify.
4. **Single data owner**: `db.ts` is the only IndexedDB writer; the service worker never reads snippet data.
5. **Soft delete**: snippets use `deletedAt`; trash/restore flows depend on it — never hard-delete in UI paths that expect recoverability.

Failure-mode notes per module: see [CODEBASE_MAP.md](CODEBASE_MAP.md). Diagrams: [CODE_GRAPH.md](CODE_GRAPH.md) and [diagrams/](diagrams/).
