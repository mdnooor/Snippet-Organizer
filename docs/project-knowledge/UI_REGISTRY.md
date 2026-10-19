# UI Element Registry — Snippet Organizer

**Snapshot Date: 2026-10-15** `[SOURCE-VERIFIED]`

This registry maps every active interactive UI control, component path, event handler, and state behavior across Snippet Organizer. Section 7 maps each surface to its current visual treatment under the locked Red Glass-Claymorphism system; values are documented once in `docs/design/DESIGN_SYSTEM.md` and are not duplicated here.

---

## 1. Header Area (`src/components/Header.tsx`)

| UI ID | Visible Label / Icon | Source File | Event Handler / Action | Expected Behavior | Verification Status |
|---|---|---|---|---|---|
| `UI-HDR-PIN` | Pin icon button | `src/components/Header.tsx` | `onClick={onTogglePin}` | Toggles detached floating window mode via `service-worker.js` | `[SOURCE-VERIFIED]` |
| `UI-HDR-NEW` | `+` (Plus icon) | `src/components/Header.tsx` | `onClick={onNewSnippet}` | Opens `SnippetEditorModal` in create mode (`mode: 'new'`) | `[SOURCE-VERIFIED]` |
| `UI-HDR-SET` | Gear icon button | `src/components/Header.tsx` | `onClick={onOpenSettings}` | Opens `SettingsModal` | `[SOURCE-VERIFIED]` |
| `UI-HDR-CLS` | `✕` (Close icon) | `src/components/Header.tsx` | `onClick={onClose}` | Closes popup window or dismisses preview | `[SOURCE-VERIFIED]` |

---

## 2. Search & Filter Controls (`src/components/SearchAndFilters.tsx`)

| UI ID | Visible Label / Icon | Source File | Event Handler / Action | Expected Behavior | Verification Status |
|---|---|---|---|---|---|
| `UI-SRCH-INP` | Search input placeholder "Search snippets..." | `src/components/SearchAndFilters.tsx` | `onChange={e => onSearchChange(e.target.value)}` | Updates search query debounced by 150ms; focused by `Ctrl+K` | `[SOURCE-VERIFIED]` |
| `UI-FLTR-ALL` | "All" tab | `src/components/SearchAndFilters.tsx` | `onClick={() => { onSelectCategory(null); onFilterChange('all'); }}` | Resets category selection and displays all non-deleted snippets | `[SOURCE-VERIFIED]` |
| `UI-FLTR-FAV` | "Favorites" tab (with gold star) | `src/components/SearchAndFilters.tsx` | `onClick={() => { onSelectCategory(null); onFilterChange('favorites'); }}` | Filters library to favorited snippets (`isFavorite === true`) | `[SOURCE-VERIFIED]` |
| `UI-FLTR-CAT` | "All Categories" dropdown trigger | `src/components/SearchAndFilters.tsx` | `onClick={handleToggleCategoryMenu}` | Toggles portal category dropdown menu positioned directly below trigger | `[SOURCE-VERIFIED]` |
| `UI-CAT-ITEM` | Category option in dropdown | `src/components/SearchAndFilters.tsx` | `onClick={() => onSelectCategory(cat.id)}` | Filters library by specific category ID and closes menu | `[SOURCE-VERIFIED]` |

---

## 3. Snippet Card (`src/components/SnippetCard.tsx`)

| UI ID | Visible Label / Icon | Source File | Event Handler / Action | Expected Behavior | Verification Status |
|---|---|---|---|---|---|
| `UI-CARD-ROOT` | Snippet Card container | `src/components/SnippetCard.tsx` | `onClick={onSelect}` | Sets card as currently selected / highlighted in library list | `[SOURCE-VERIFIED]` |
| `UI-CARD-INFO` | Title, category badge & preview text | `src/components/SnippetCard.tsx` | `onClick={onOpen}` | Opens `SnippetPreviewModal` for full snippet inspection | `[SOURCE-VERIFIED]` |
| `UI-CARD-STAR` | Static Golden Star Indicator | `src/components/SnippetCard.tsx` | Non-interactive (`pointer-events-none`) | Visually indicates snippet is a favorite; rendered at top-right | `[SOURCE-VERIFIED]` |
| `UI-CARD-COPY` | Copy icon button | `src/components/SnippetCard.tsx` | `onClick={onCopy}` | Copies rich text/plain text to clipboard; displays emerald checkmark for 1.5s | `[SOURCE-VERIFIED]` |
| `UI-CARD-MORE` | Three-dot vertical menu (`...`) | `src/components/SnippetCard.tsx` | `onClick={() => setIsMenuOpen(prev => !prev)}` | Toggles overflow menu popover | `[SOURCE-VERIFIED]` |
| `UI-MENU-VIEW` | "View snippet" | `src/components/SnippetCard.tsx` | `onClick={onOpen}` | Opens `SnippetPreviewModal` | `[SOURCE-VERIFIED]` |
| `UI-MENU-EDIT` | "Edit snippet" | `src/components/SnippetCard.tsx` | `onClick={onEdit}` | Opens `SnippetEditorModal` with snippet data preloaded | `[SOURCE-VERIFIED]` |
| `UI-MENU-FAV` | "Add/Remove favorite" | `src/components/SnippetCard.tsx` | `onClick={onToggleFavorite}` | Toggles `snippet.isFavorite` in database and refreshes list | `[SOURCE-VERIFIED]` |
| `UI-MENU-DEL` | "Move to trash" (rose styling) | `src/components/SnippetCard.tsx` | `onClick={onDelete}` | Soft-deletes snippet by setting `deletedAt = Date.now()` | `[SOURCE-VERIFIED]` |

---

## 4. Snippet Preview Modal (`src/components/SnippetPreviewModal.tsx`)

| UI ID | Visible Label / Icon | Source File | Event Handler / Action | Expected Behavior | Verification Status |
|---|---|---|---|---|---|
| `UI-PREV-BACK` | "Back" button | `src/components/SnippetPreviewModal.tsx` | `onClick={onClose}` | Closes modal and returns to main library view | `[SOURCE-VERIFIED]` |
| `UI-PREV-FAV` | Star icon button | `src/components/SnippetPreviewModal.tsx` | `onClick={() => onToggleFavorite(id, isFav)}` | Toggles favorite status directly from preview | `[SOURCE-VERIFIED]` |
| `UI-PREV-EDIT` | "Edit" button | `src/components/SnippetPreviewModal.tsx` | `onClick={() => onEdit(id)}` | Transitions from preview to `SnippetEditorModal` | `[SOURCE-VERIFIED]` |
| `UI-PREV-COPY` | "Copy Snippet" button | `src/components/SnippetPreviewModal.tsx` | `onClick={handleCopy}` | Copies snippet to clipboard with feedback animation | `[SOURCE-VERIFIED]` |

---

## 5. Snippet Editor Modal (`src/components/SnippetEditorModal.tsx`)

| UI ID | Visible Label / Icon | Source File | Event Handler / Action | Expected Behavior | Verification Status |
|---|---|---|---|---|---|
| `UI-EDIT-TITLE` | "Snippet title" input | `src/components/SnippetEditorModal.tsx` | `onChange={e => setTitle(e.target.value)}` | Captures snippet title with character counter | `[SOURCE-VERIFIED]` |
| `UI-EDIT-CAT` | Category dropdown trigger | `src/components/SnippetEditorModal.tsx` | `onClick={() => setIsCatMenuOpen(!open)}` | Opens category selector with 8-color palette and add button | `[SOURCE-VERIFIED]` |
| `UI-EDIT-TBAR` | Rich Text Formatting Buttons | `src/components/SnippetEditorModal.tsx` | `onClick={() => executeCommand(cmd)}` | Applies Bold, Italic, Code, Link, List, or Clear Formatting | `[SOURCE-VERIFIED]` |
| `UI-EDIT-AREA` | Contenteditable Editor Box | `src/components/SnippetEditorModal.tsx` | `onInput={handleInput}` | Rich text input surface supporting HTML formatting | `[SOURCE-VERIFIED]` |
| `UI-EDIT-FAV` | "Favorite" action toggle | `src/components/SnippetEditorModal.tsx` | `onClick={() => setIsFavorite(!isFav)}` | Toggles favorite state before saving | `[SOURCE-VERIFIED]` |
| `UI-EDIT-DUP` | "Duplicate" action button | `src/components/SnippetEditorModal.tsx` | `onClick={handleDuplicate}` | Clones snippet as a duplicate record | `[SOURCE-VERIFIED]` |
| `UI-EDIT-DEL` | "Delete" action button | `src/components/SnippetEditorModal.tsx` | `onClick={handleDelete}` | Moves current snippet to trash (edit mode only) | `[SOURCE-VERIFIED]` |
| `UI-EDIT-SAVE` | "Save Snippet" button | `src/components/SnippetEditorModal.tsx` | `onClick={handleSave}` | Validates and persists snippet to IndexedDB | `[SOURCE-VERIFIED]` |
| `UI-EDIT-CNC` | "Cancel" button | `src/components/SnippetEditorModal.tsx` | `onClick={onClose}` | Discards unsaved edits and closes modal | `[SOURCE-VERIFIED]` |

---

## 6. Settings View (`src/components/SettingsView.tsx`)

| UI ID | Visible Label / Icon | Source File | Event Handler / Action | Expected Behavior | Verification Status |
|---|---|---|---|---|---|
| `UI-SET-TABS` | Nav tabs (General, Categories, Shortcuts, Data, Trash, About) | `src/components/SettingsView.tsx` | `onClick={() => setActiveTab(key)}` | Switches active settings section | `[SOURCE-VERIFIED]` |
| `UI-SET-GEN-DEF` | Default startup view dropdown | `src/components/SettingsView.tsx` | `onChange={handleDefaultFilterChange}` | Sets startup filter preference ('all', 'favorites', 'recent') | `[SOURCE-VERIFIED]` |
| `UI-SET-TRASH-RALL` | "Restore All" button | `src/components/SettingsView.tsx` | `onClick={handleRestoreAll}` | Restores all trashed snippets back to library | `[SOURCE-VERIFIED]` |
| `UI-SET-TRASH-EMP` | "Empty Trash" button | `src/components/SettingsView.tsx` | `onClick={handleEmptyTrash}` | Permanently deletes all items in trash after confirmation | `[SOURCE-VERIFIED]` |
| `UI-SET-TRASH-RONE` | "Restore" (per snippet) | `src/components/SettingsView.tsx` | `onClick={() => handleRestore(snippet)}` | Restores individual snippet to library (with category fallback) | `[SOURCE-VERIFIED]` |
| `UI-SET-TRASH-DEL` | "Delete Forever" (per snippet) | `src/components/SettingsView.tsx` | `onClick={() => handleDeleteForever(id)}` | Permanently deletes individual snippet from IndexedDB | `[SOURCE-VERIFIED]` |
| `UI-SET-EXP-JSON` | "Export JSON" button | `src/components/SettingsView.tsx` | `onClick={handleExport}` | Generates and downloads full backup JSON file | `[SOURCE-VERIFIED]` |
| `UI-SET-IMP-JSON` | "Import JSON" file input | `src/components/SettingsView.tsx` | `onChange={handleImport}` | Parses, validates, and imports library data from backup JSON | `[SOURCE-VERIFIED]` |
| `UI-SET-RST-DEF` | "Reset to Default" button | `src/components/SettingsView.tsx` | `onClick={handleResetToDefault}` | Resets library to default demo snippets and preferences | `[SOURCE-VERIFIED]` |

---

## 7. Visual Design Treatment Map — Red Glass-Claymorphism `[SOURCE-VERIFIED]`

Canonical values and class definitions: `docs/design/DESIGN_SYSTEM.md` Sections 2–4. "Verification" reflects the 2026-10-15 audit (dev-server screenshots; extension-host runtime NOT verified — see `reports/DOCUMENTATION_CHANGELOG.md` UI-CLAY-03 / DOC-AUDIT-02) plus the 2026-10-16 UI-READ-01 computed-style re-checks (solid logo, secondary-text tiers, disabled labels, placeholders).

| UI surface | Component | Source location | Styling source | Design treatment | States implemented in source | Verification |
|---|---|---|---|---|---|---|
| Global background (all shells) | page roots | `src/popup.tsx:61`, `src/settings.tsx:8`, `src/App.tsx:197` | `.glass-app-bg` (`src/index.css:22`) | Locked red gradient; in popup shells the root is the fixed 480 × 600 application viewport with `p-[25px]` exposing the flat background around the raised popup (UI-WINDOW-LOCK-01/02/03) | — | `[RUNTIME-VERIFIED]` (web + settings; exact 25 px ring re-measured at 480 × 600 2026-10-16) |
| Main popup container | `MainPopup` | `src/components/MainPopup.tsx:298` | `.glass-clay-surface` | Locked glass-clay surface, fixed `w-[430px] h-[550px]` inset on the exact 25 px flat-background ring; snippet list is the only scroll region (`flex-1 min-h-0`), footer pinned inside the viewport | — | `[RUNTIME-VERIFIED]` (containment re-measured at 480 × 600 in both modes 2026-10-16, UI-WINDOW-LOCK-01/02/03) |
| Header logo plinth | `Header` | `src/components/Header.tsx` | Inline solid utilities (UI-READ-01): `rounded-[26%] bg-[rgb(240,85,88)] shadow-sm shadow-red-500/30` | Solid theme-matched mark, 26% radius; glassy `.nm-logo-raised` no longer consumed (locked class kept as reference, `DESIGN_SYSTEM.md` §9.9) | non-interactive | `[RUNTIME-VERIFIED]` (computed styles, 2026-10-16) |
| Header icons / pin | `Header` | `src/components/Header.tsx` | `.nm-icon-btn` / `.nm-icon-btn-inset` | Scaled glass-clay | hover lift, active inset, toggled inset | `[SOURCE-VERIFIED]` |
| Search field (`UI-SRCH-INP`) | `SearchAndFilters` | `src/components/SearchAndFilters.tsx` | `.nm-static-inset-field` wrapper + transparent input | Locked permanent inset | inset persists through focus (+ red outline) | `[RUNTIME-VERIFIED]` (normal + focused) |
| Filter tabs (`UI-FLTR-*`) | `SearchAndFilters` | `src/components/SearchAndFilters.tsx` | `.nm-primary-inset` (selected) / `.nm-raised` (idle) / `.nm-inset` (menu open) | Filled-red selected tab; glass idle | hover lighten, persistent selection | `[SOURCE-VERIFIED]` |
| Snippet cards (`UI-CARD-*`) | `SnippetCard` | `src/components/SnippetCard.tsx` | `.nm-static-inset-card` / `-selected` | Glass-clay card, red accent border when selected | hover lighten; selected border+glow | `[RUNTIME-VERIFIED]` |
| Copy button (`UI-CARD-COPY`) | `SnippetCard` | `src/components/SnippetCard.tsx` | `.nm-icon-btn` → `.nm-success-inset` | Glass icon button; emerald copied state | copied feedback 1.5s | `[SOURCE-VERIFIED]` |
| Preview modal | `SnippetPreviewModal` | `src/components/SnippetPreviewModal.tsx:39,100` | `.glass-clay-surface` + `.glass-inset` body | Locked surface + locked inset content well | — | `[RUNTIME-VERIFIED]` |
| Editor modal | `SnippetEditorModal` | `src/components/SnippetEditorModal.tsx:711` | `.glass-clay-surface`; title `.nm-static-inset-field`; content `.nm-static-inset-editor`; Save `.nm-primary-raised`; Cancel `.nm-raised`; Delete `.nm-danger-raised` | Locked surface + locked insets + locked clay CTA | title inset persists in focus; disabled hover suppressed (`:not(:disabled)`) | `[RUNTIME-VERIFIED]` (title normal+focused) |
| Swatches (`UI-EDIT-CAT` palette) | `SnippetEditorModal` | `src/components/SnippetEditorModal.tsx:49,206,221` | `.nm-color-swatch` / `-selected` | Inline color body, red-tinted shadow material | hover inset; selected white ring | `[RUNTIME-VERIFIED]` (8 colors intact) |
| Settings modal / page containers | `SettingsModal` / `settings.tsx` | `SettingsModal.tsx:22` / `settings.tsx:16` | `.glass-clay-surface` | Locked surface | — | `[RUNTIME-VERIFIED]` (page) |
| Settings nav (`UI-SET-TABS`) | `SettingsView` | `src/components/SettingsView.tsx` | `.nm-inset` + `text-[#9f0409]` (active); `.nm-raised` (inactive) | Locked red inset selection | persistent inset on active/hover | `[RUNTIME-VERIFIED]` (all 6 sections visited) |
| Settings sections (all 6 menus) | `SettingsView` | `src/components/SettingsView.tsx` | `.nm-static-inset-section` + `-subsection` + `-danger/-warn/-info-section` variants | Glass sections, semantic tints preserved | — | `[RUNTIME-VERIFIED]` (General, Categories, Shortcuts, Backup & Data, Trash, About) |
| Settings controls (checkboxes, inputs, buttons) | `SettingsView` | `src/components/SettingsView.tsx` | Red-accent utilities; `.nm-primary-raised` / red translucent CTAs; `.nm-danger-raised` | Red glass accents | hover/active per class | `[SOURCE-VERIFIED]` |
| Web demo chrome | `App` | `src/App.tsx:197,345` | `.glass-app-bg`; `.glass-clay-surface` install modal; red utilities | Glass demo chrome | floating-mode drag (localStorage) | `[RUNTIME-VERIFIED]` |

Known residual accents (semantic or pending decision — do not "fix" silently): `Footer.tsx:19` sync icon blue; `SettingsView.tsx:354` import spinner blue; Default-category badges `SnippetCard.tsx:65`, `SnippetPreviewModal.tsx:90`; info banners `App.tsx:257–270`, `SnippetEditorModal.tsx:746–747`; `App.tsx:282` success icon; pending-decision theme chrome `App.tsx:315` (floating ring) and `App.tsx:374` (link). Details: `DESIGN_SYSTEM.md` Section 9.6.
