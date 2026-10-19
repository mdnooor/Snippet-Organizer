# Features — Snippet Organizer

**Snapshot Date: 2026-10-15** `[SOURCE-VERIFIED]`

This document provides a comprehensive inventory of implemented features in Snippet Organizer, including user-visible behavior, source modules, state dependencies, and edge case handling.

> **Behavior vs. presentation**: This document describes *behavioral* functionality only. Visual presentation is defined exclusively by the locked **Red Glass-Claymorphism** system in `docs/design/DESIGN_SYSTEM.md` (ADR-009). The redesign was visual-only; no behavior in this document changed.

---

## Feature Inventory Status Overview

| Feature Name | Status | Primary Component / Module | Verification Evidence |
|---|---|---|---|
| **Docked Popup & Detached Floating Window (shared fixed 480 × 600 px viewport, raised popup on an exact 25 px background ring)** | IMPLEMENTED | `popup.html`, `src/popup.tsx`, `service-worker.js`, `MainPopup.tsx` | `[SOURCE-VERIFIED]` `[COMMAND-VERIFIED]` |
| **Snippet Library & Keyboard Navigation** | IMPLEMENTED | `MainPopup.tsx`, `SnippetCard.tsx` | `[SOURCE-VERIFIED]` |
| **Search Engine with Priority Ranking** | IMPLEMENTED | `src/db.ts` (`filterAndRankSnippets`), `MainPopup.tsx` | `[SOURCE-VERIFIED]` `[COMMAND-VERIFIED]` |
| **Filter Row (All, Favorites, Categories)** | IMPLEMENTED | `SearchAndFilters.tsx`, `MainPopup.tsx` | `[SOURCE-VERIFIED]` |
| **Static Golden Favorite Indicator** | IMPLEMENTED | `SnippetCard.tsx` | `[SOURCE-VERIFIED]` |
| **One-Click Clipboard Copying** | IMPLEMENTED | `src/db.ts` (`copySnippet`), `SnippetCard.tsx` | `[SOURCE-VERIFIED]` |
| **Rich-Text Snippet Editor** | IMPLEMENTED | `SnippetEditorModal.tsx` | `[SOURCE-VERIFIED]` |
| **Snippet Preview Modal** | IMPLEMENTED | `SnippetPreviewModal.tsx` | `[SOURCE-VERIFIED]` |
| **Trash & Recovery System** | IMPLEMENTED | `SettingsView.tsx`, `src/db.ts` | `[SOURCE-VERIFIED]` |
| **Category Management** | IMPLEMENTED | `SettingsView.tsx`, `src/db.ts` | `[SOURCE-VERIFIED]` |
| **User Preferences & Startup View** | IMPLEMENTED | `SettingsView.tsx`, `MainPopup.tsx`, `src/db.ts` | `[SOURCE-VERIFIED]` |
| **Backup, Restore & Reset** | IMPLEMENTED | `SettingsView.tsx`, `src/db.ts` | `[SOURCE-VERIFIED]` |
| **Web Demo Landing Page** | IMPLEMENTED | `src/App.tsx`, `index.html` | `[SOURCE-VERIFIED]` |

---

## Detailed Feature Specifications

### 1. Docked Popup & Detached Floating Window (shared fixed 480 × 600 px viewport, raised popup on an exact 25 px background ring) with Persistent Positioning & Mode Retention
- **User-Visible Behavior**: The user can open the extension from the Chrome toolbar (docked popup) or click the Pin button beside the header logo to detach it into an independent floating window. Both modes use the identical **fixed 480 × 600 px application viewport** with the identical layout — the raised 430 × 550 popup card sits inset on an exact 25 px flat-background ring on all four sides (layered 3D claymorphism look), the snippet list scrolls internally, and the footer stays pinned at the bottom (UI-WINDOW-LOCK-01/02/03, 2026-10-16). The floating window is held at exactly 480 × 600 (service-worker soft lock; any resize attempt snaps back); the docked action popup is content-sized and not user-resizable. When the user moves the floating window, its screen position is recorded and restored on every subsequent close and reopen cycle across repeated sessions.
- **Core Mode Invariant**: Once detached into floating mode, closing the window (via header 'X' or OS window controls) does **not** reset the user back to attached mode. Reopening the extension (via the toolbar action button or shortcut) reopens directly as a detached floating window at the last saved screen position. The floating window remains active until the user explicitly clicks the Pin button to unpin and reattach back to docked popup mode.
- **Source Modules**: `popup.html`, `src/popup.tsx`, `service-worker.js`, `public/service-worker.js`, `src/App.tsx`, `src/components/MainPopup.tsx`.
- **Implementation Highlights**:
  - `popup.html` fixes `html, body { width: 480px; height: 600px; }` for both modes (one fixed application viewport; ADR-002 Amendment 3) and passes `#root { width: 100%; height: 100% }` through.
  - `src/popup.tsx` sets `documentElement` and `body` to the fixed 480 × 600 viewport unconditionally and renders the background root as `glass-app-bg w-[480px] h-[600px] p-[25px] overflow-hidden` — the raised `MainPopup` surface (`w-[430px] h-[550px]`) sits inset on a visible 25 px flat-background ring on all four sides; the snippet list is the only scrollable region (`flex-1 min-h-0 overflow-y-auto`), keeping the footer pinned inside the viewport. In floating mode it also reports the measured browser-frame delta once on load (`CALIBRATE_FLOATING_FRAME`: `outerWidth/Height − innerWidth/Height` — `chrome.windows` sizes are outer dimensions, so the service worker compensates the outer size to yield the 480 × 600 content viewport), registers `beforeunload` / `pagehide` position reporting, and includes defensive redirection if opened while `isFloatingMode` is active.
  - `service-worker.js` synchronizes `isFloatingMode` in `chrome.storage.local`. When floating mode is active, it sets `chrome.action.setPopup({ popup: '' })`, enabling toolbar clicks to fire `chrome.action.onClicked` which directly opens or focuses the floating window at `floatingWindowPosition`.
  - Closing the floating window via OS controls or `window.close()` removes `floatingWindowId` while preserving `isFloatingMode` and `floatingWindowPosition`.
  - Clicking the Pin control while in floating mode triggers `UNPIN_FLOATING_WINDOW`, which sets `isFloatingMode: false`, restores `chrome.action.setPopup({ popup: 'popup.html' })`, and closes the floating window.
  - `service-worker.js` tracks real-time window movement via `chrome.windows.onBoundsChanged` (debounced by 200ms) and saves coordinates to `chrome.storage.local.floatingWindowPosition`.
  - `src/App.tsx` mirrors this behavior in the web preview using `localStorage` keys `snippet_organizer_floating_pos` and `snippet_organizer_floating_mode`. Closing the window preserves floating mode, and reopening restores the window directly in floating mode at the saved coordinates.
  - `MainPopup.tsx` maintains `w-[712px] max-w-[712px] h-[512px]`.

### 2. Search Engine with Canonical Priority Ranking
- **User-Visible Behavior**: Typing in the search input instantly filters snippets across Title, Content, and Category. Search results are strictly ordered by field priority: **Title matches appear first, Content matches second, and Category matches third**.
- **Source Modules**: `src/db.ts` (`filterAndRankSnippets`), `src/components/SearchAndFilters.tsx`, `src/components/MainPopup.tsx`.
- **Ranking Rules**:
  - Exact Title (`10`) > Prefix Title (`11`) > Substring Title (`12`).
  - Exact Content (`20`) > Prefix Content (`21`) > Substring Content (`22`).
  - Exact Category (`30`) > Prefix Category (`31`) > Substring Category (`32`).
  - Ties preserve original library order.
  - Matches across multiple fields receive the highest priority tier matched.
  - Search queries are debounced by 150ms to prevent interface stutter.

### 3. Filter Row (All, Favorites, All Categories)
- **User-Visible Behavior**: The filter row below the search input contains:
  1. **All** tab
  2. **Favorites** tab (featuring a gold/yellow star icon)
  3. **All Categories** dropdown selector
- **Startup View Integration**: The separate "Recent" filter tab was removed from the popup filter row per user decision. However, when a user selects "Recent" as the default view in Settings > General, the extension automatically loads and sorts snippets by recent usage on startup.

### 4. Static Golden Favorite Indicator
- **User-Visible Behavior**: Snippet cards that have `isFavorite === true` display a static golden star indicator in the top-right corner above the action buttons.
- **Source Modules**: `src/components/SnippetCard.tsx`.
- **Non-Interactive Design**: The star indicator is purely visual (`pointer-events-none`) so users can recognize favorites at a glance without re-introducing an accidental click target. Interactive favorite toggling is performed via the three-dot overflow menu, the Snippet Editor, or the Preview modal.

### 5. One-Click Clipboard Copying
- **User-Visible Behavior**: Clicking the copy button on a snippet card copies its formatted HTML and plain-text fallback directly to the clipboard. The button transitions to an emerald "Copied!" checkmark for 1.5 seconds.
- **Source Modules**: `src/db.ts` (`copySnippet`), `src/components/SnippetCard.tsx`.
- **Usage Tracking**: Each copy event updates `lastUsedAt = Date.now()` on the snippet in IndexedDB.

### 6. Rich-Text Snippet Editor
- **User-Visible Behavior**: Opened via the Header `+` button (Create mode) or the card "Edit" menu action (Edit mode). Allows editing snippet title, category, and formatted content.
- **Source Modules**: `src/components/SnippetEditorModal.tsx`.
- **Capabilities**:
  - Title input with character count.
  - Primary Category dropdown with 8-swatch color palette and inline "New Category" creation.
  - Formatting toolbar: Bold, Italic, Strikethrough, Code, Code Block, Bullet List, Numbered List, Blockquote, Link, Horizontal Rule, and Clear Formatting (`cleanHtmlFormatting`).
  - Snippet actions: Favorite toggle, Duplicate snippet, Move to Trash.

### 7. Trash & Recovery System
- **User-Visible Behavior**: A dedicated "Trash" section is available in Settings. When snippets are deleted, they are moved to Trash rather than permanently lost.
- **Source Modules**: `src/components/SettingsView.tsx`, `src/db.ts`.
- **Features**:
  - **3-Day (72-Hour) Retention Window**: Trashed items display an expiration countdown badge (e.g. "2d 14h left", "Expiring soon").
  - **Restore Snippet**: Restores the snippet back to the active library. If its category was deleted in the interim, it automatically falls back to `'default'`.
  - **Restore All**: Restores all trashed snippets in a single click.
  - **Delete Forever**: Permanently deletes an individual snippet from IndexedDB.
  - **Empty Trash**: Permanently purges all items currently in Trash.
  - **Automatic Purging**: Expired items (>72 hours) are purged on database initialization via `purgeExpiredTrash()`.

### 8. Category Management
- **User-Visible Behavior**: Under Settings > Categories, users can create custom categories, edit existing category names and color badges, view the active snippet count per category, and delete unused categories.
- **Safe Deletion**: Deleting a category prompts the user and reassigns all existing snippets in that category to the `'default'` category, preventing orphaned records.

### 9. Backup & Data Management
- **User-Visible Behavior**: Under Settings > Backup & Data:
  - **Export JSON**: Downloads a structured `snippet-organizer-backup-[timestamp].json` containing all snippets, categories, and user preferences.
  - **Import JSON**: Validates and restores library data from an existing backup file.
  - **Reset to Default**: Restores original factory seed snippets, categories, and settings.
  - **Google Drive Snapshots** (GD-01–GD-07, 2026-10-18; status `implemented-unverified` — live Drive/OAuth runtime not yet exercised): explicit, user-initiated cloud backups into the user's own Google Drive `appDataFolder` via `chrome.identity.getAuthToken` (scope exactly `drive.appdata`; requires the user-owned OAuth client setup in `docs/google-drive-integration/oauth-contract.md` §6). All controls live in one card: connection row (Connect / Disconnect / session-truthful status), **Create** (optional name; always uploads a NEW snapshot including trashed snippets/tombstones; never overwrites), per-row **Restore** (read-only preview, Merge/Replace, per-conflict resolution, verified pre-restore safety checkpoint, single atomic transaction), **Save** (download for inspection), and **Delete** (permanent cloud-only, named confirmation; local data untouched). There is deliberately **no synchronization** — GD-06 closed `blocked` (proposal pending in data-contract §17); no sync UI exists (the fabricated footer status was removed in GD-07). Canonical contracts: `docs/google-drive-integration/data-contract.md`, `oauth-contract.md`.
