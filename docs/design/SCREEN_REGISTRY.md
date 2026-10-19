# Screen Registry — Snippet Organizer

**Snapshot Date: 2026-10-14** `[SOURCE-VERIFIED]`

This document inventories every distinct screen, modal overlay, and presentation route within the Snippet Organizer application.

---

## Screen Inventory

| Screen ID | Screen Name | Route / Entry Point | Presentation Mode | Main Components | Verification |
|---|---|---|---|---|---|
| `SCR-POPUP-DOCKED` | Main Popup (Docked) | `popup.html` | Chrome Extension Action Popup (fixed 480 × 600 px application viewport with the raised 430 × 550 popup on an exact 25 px background ring; shared with floating mode; content-sized by Chrome, not user-resizable) | `MainPopup`, `Header`, `SearchAndFilters`, `SnippetCard`, `Footer` | `[SOURCE-VERIFIED]` |
| `SCR-POPUP-FLOAT` | Main Popup (Floating) | `popup.html?mode=floating` | Standalone Chrome Window (same fixed 480 × 600 px viewport and 25 px ring; size held by the service-worker `onBoundsChanged` soft lock) | `MainPopup`, `Header`, `SearchAndFilters`, `SnippetCard`, `Footer` | `[SOURCE-VERIFIED]` |
| `SCR-MODAL-PREV` | Snippet Preview Modal | Overlay within `MainPopup` | Centered Modal Dialog | `SnippetPreviewModal` | `[SOURCE-VERIFIED]` |
| `SCR-MODAL-EDIT` | Snippet Editor Modal | Overlay within `MainPopup` | Centered Modal Dialog | `SnippetEditorModal` | `[SOURCE-VERIFIED]` |
| `SCR-MODAL-SETT` | Settings Modal (In-Popup) | Overlay within `MainPopup` | Centered Modal Dialog | `SettingsModal`, `SettingsView` | `[SOURCE-VERIFIED]` |
| `SCR-PAGE-SETT` | Settings Options Page | `settings.html` | Full Browser Tab (`open_in_tab: true`) | `SettingsView` | `[SOURCE-VERIFIED]` |
| `SCR-WEB-DEMO` | Web Demo Landing Page | `index.html` | Full Responsive Web Page | `App`, `MainPopup` | `[SOURCE-VERIFIED]` |

---

## Detailed Screen Specifications

### 1. `SCR-POPUP-DOCKED` — Main Popup (Docked)
- **Entry Point**: Clicking extension action icon in Chrome toolbar.
- **Dimensions**: Strictly fixed at `712px` width by `512px` height.
- **States**:
  - `Loading`: Displays "Loading snippets..." spinner.
  - `Populated`: Displays search bar, filter tabs, scrollable snippet list, and footer.
  - `Empty`: Displays "No snippets found" or "No favorites yet" with guidance text.
  - `Searching`: Filtered candidates ranked by Title > Content > Category.

### 2. `SCR-POPUP-FLOAT` — Main Popup (Floating Window)
- **Entry Point**: Clicking Pin icon (`UI-HDR-PIN`) in docked popup header.
- **Dimensions**: Identical `712px` width by `512px` height via `chrome.windows.create`.
- **States**: Identical to docked popup, but with the Pin icon in active/blue rotate state and window unpin action triggering close.

### 3. `SCR-MODAL-PREV` — Snippet Preview Modal
- **Entry Point**: Clicking any snippet card info area or selecting "View snippet" from the three-dot menu.
- **Components**: Back button, title, category pill, favorite star toggle, edit shortcut button, formatted HTML body, copy action.

### 4. `SCR-MODAL-EDIT` — Snippet Editor Modal
- **Entry Point**: Clicking `+` New Snippet button in Header, or selecting "Edit snippet" from card menu.
- **Components**: Modal title ("New Snippet" / "Edit Snippet"), Title input, Category dropdown with palette, Rich text formatting toolbar, Contenteditable text area, Duplicate button, Delete button, Save and Cancel buttons.

### 5. `SCR-PAGE-SETT` & `SCR-MODAL-SETT` — Settings View
- **Entry Point**:
  - In-popup: Clicking Gear icon (`UI-HDR-SET`) opens `SCR-MODAL-SETT`.
  - Browser tab: Right-clicking extension icon -> Options, or via `chrome.runtime.openOptionsPage()`.
- **Sections**:
  - `General`: Theme mode, default startup filter, quick copy, copy notifications, favorite confirmation, search field toggles.
  - `Categories`: Custom category manager with color swatches and snippet count badges.
  - `Shortcuts`: Global and popup keyboard shortcuts overview.
  - `Backup & Data`: Full JSON export, JSON import, and reset to factory defaults.
  - `Trash`: 3-day retention list, restore snippet, restore all, delete permanently, and empty trash.
  - `About`: Extension version (0.1.0), Manifest V3, and architecture highlights.
