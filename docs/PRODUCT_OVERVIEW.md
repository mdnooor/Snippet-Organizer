# Product Overview — Snippet Organizer (Version 1)

`[SOURCE-VERIFIED]` unless noted. Sources: `src/`, `public/manifest.json`, `docs/project-knowledge/{PROJECT_BRIEF,DECISIONS,FEATURES}.md`, `docs/tasks/BACKLOG.md`.

## What it is

Snippet Organizer is a personal snippet/productivity manager that lives entirely in a Chrome extension. Users save reusable text snippets (rich-text content), organize them into color-coded categories, mark favorites, find them with instant multi-field search, and copy them to the clipboard with one click. All data is stored locally (IndexedDB). An optional, strictly manual Google Drive integration backs snapshots up to the extension's private Drive `appDataFolder` and restores them on request.

## Main user workflows

1. **Capture & edit** — `+ New Snippet` opens `SnippetEditorModal` (title, rich content, category, favorite). Edits bump `version` and `updatedAt` (`db.ts`).
2. **Find** — debounced search over Title > Content > Category with canonical priority ranking (`filterAndRankSnippets` in `src/db.ts`), plus category filter tabs (All / Favorites / All Categories / per-category dropdown) and Favorites toggle.
3. **Copy** — one click on a `SnippetCard` copies rendered content, shows a toast, updates `lastUsedAt`, and re-sorts by recency.
4. **Organize** — create/rename/delete categories with locked swatch colors (ADR-009 palette); delete = soft-delete to trash; restore or permanent-delete from Trash view.
5. **Tune** — `SettingsView`: preferences (search fields, sort), keyboard-shortcut rebinding (capture UI writes real `preferences.uiShortcuts` / `globalCommandShortcut`), Drive snapshot management (list / download / delete / restore with conflict preview), explicit Connect / Disconnect.
6. **Float** — the `toggle-organizer` command (`Ctrl+Shift+X`) or toolbar action opens the docked popup or the frame-locked floating window (service worker, `UI-WINDOW-LOCK-*`).
7. **Backup (manual, Drive)** — Create snapshot → browse/download/delete snapshots → restore with conflict resolution. Every Drive action is user-initiated; **nothing runs automatically** (GD-06 deferred).

## Version 1 scope

In scope (verified): all local snippet management, floating window, settings & shortcuts, silent Drive connection probe with truthful status, manual snapshot create/list/download/delete/restore, conflict-resolution preview, explicit disconnect with persisted intent.

Out of scope by decision: automatic sync & sync-conflict automation (GD-06, deferred — schema/scaffold untouched), sync-status claims (GD-07 bans fabricated "Synced/Last synced" UI), server-side anything, multi-user features.

See [VERSION_1_BASELINE.md](VERSION_1_BASELINE.md) for the evidence-tagged list, [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for current gaps (e.g. unpinned manifest `key` blocks store release), and [ROADMAP.md](ROADMAP.md) for proposals.
