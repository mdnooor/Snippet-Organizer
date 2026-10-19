# Glossary

Terms as used **in this repository's code and docs** (some differ from generic usage — noted where it matters).

- **Snippet** — the core record: rich-text content (`content`, HTML string), title, category, favorite flag, timestamps, soft-delete marker, `version`. Stored in IndexedDB `snippets`.
- **Category** — color-coded grouping for snippets; 8-color swatch palette locked by ADR-009. Stored in `categories`.
- **IndexedDB** — browser-local database. This app's DB: `snippet-organizer` v1 (stores `snippets`, `categories`, `preferences`). The **only** source of truth for user data.
- **Repository** — `src/db.ts`, the single data-access module owning all IndexedDB reads/writes (a repository-layer function, not a class).
- **Service layer** — `src/gdrive/*` modules (auth, connection, driveClient, backup/gather/snapshot/snapshotStore, restore/conflict): pure-ish logic with injected dependencies, unit-tested without Chrome.
- **Orchestrator** — factory returning a controller with strict lifecycle guarantees; e.g. `popupRefresh.ts` (single-flight refresh) and `auth.ts` `createAuthController`.
- **OAuth** — Google authorization via `chrome.identity.getAuthToken`; the extension requests exactly one scope.
- **`drive.appdata` / `appDataFolder`** — the Drive scope / hidden per-user-per-app folder. Files there are invisible in normal My Drive listings and private to this application+user pair.
- **Snapshot** — a `BackupData` JSON file uploaded to `appDataFolder` (the Drive-side backup). Created/listed/downloaded/deleted/restored only by explicit user action.
- **Backup** — the act/content of a snapshot (local gather → serialize → upload).
- **Restore** — downloading a snapshot, previewing conflicts, and applying the user's resolutions through the repository.
- **Conflict** — divergence between a snapshot and local data: `content-conflict` (both changed) or `deletion-state-conflict` (deleted on one side). Resolved per item: `keep-local` / `take-incoming` / `keep-both`.
- **Explicit disconnect intent** — `chrome.storage.local.gdriveUserDisconnected`, set only by the user's Disconnect action; blocks every Drive auth/network path until the user explicitly reconnects. The project's most important invariant.
- **Silent authorization** — `getAuthToken({ interactive: false })`; never shows a prompt, used by the connection probe. If it would require interaction, the probe reports `not-connected`/interaction-required instead of prompting.
- **Connection probe** — silent check (`drive/v3/about`) producing the truth-only footer status: `connected` / `not-connected` / `checking` (real call in flight) / disconnected.
- **Automatic sync / GD-06** — the deferred feature: background, scheduled, or implicit synchronization with Drive-side conflict automation. **Does not exist** in V1 code or schema; reserved ID GD-06 in `docs/tasks/`.
- **GD-xx** — task IDs in the Google Drive integration backlog (`snippet-organizer-google-drive-handoff/tasks/`).
- **ADR** — architecture decision record (`docs/project-knowledge/DECISIONS.md`), e.g. ADR-002 (window lock), ADR-009 (Red Glass-Claymorphism design lock).
- **`nm-*` classes** — the locked design-system class API in `src/index.css` (e.g. `nm-scrollbar`, `nm-icon-btn`).
- **Floating mode** — detached 480×600 window managed by the MV3 service worker (`toggle-organizer`, bounds-locked); distinct from the docked action popup.
- **Epoch guard** — `MainPopup` pattern stamping each `loadData` run so stale async results are discarded.
