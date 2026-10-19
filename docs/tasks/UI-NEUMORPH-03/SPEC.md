# Task Specification: UI-NEUMORPH-03 — Phase 2: Static Inset Soft Neumorphism for Specific UI Elements

**Task ID**: UI-NEUMORPH-03 `[SOURCE-VERIFIED]`  
**Status**: VERIFIED `[COMMAND-VERIFIED]`  
**Date**: 2026-10-15 `[SOURCE-VERIFIED]`

---

## 1. Objective

Implement **always-visible, static inset soft neumorphism** for a strictly limited set of 5 existing UI target groups in Snippet Organizer:
1. Main popup search field.
2. Every main popup snippet card.
3. Settings section and subsection containers across all menus.
4. Snippet editor title input.
5. Snippet editor textareas (rich content editor surface).

**Static inset invariant**: The element looks recessed into the surrounding surface immediately on render and remains recessed regardless of hover, focus, typing, clicking, or pointer position.

---

## 2. Scope Lock & Changes by Target

### Target A: Main Popup Search Field (`src/components/SearchAndFilters.tsx`)
- Applied `.nm-static-inset-field` replacing legacy inline style.
- Input sits comfortably below the popup surface with balanced dual inner shadows (`inset 3.5px 3.5px 7px rgba(135,150,175,0.45)` and `inset -3px -3px 7px rgba(255,255,255,0.95)`).
- Preserved keyboard shortcuts (`Ctrl+K`), search icon, placeholder, and search/filtering logic.

### Target B: Main Popup Snippet Cards (`src/components/SnippetCard.tsx`)
- Every snippet card rendered as a recessed well via `.nm-static-inset-card`.
- When selected, `.nm-static-inset-card-selected` maintains the recessed depression with an indigo focus border.
- Interactive elements inside (Copy button, 3-dot menu, Star, Category badge) preserve their established neumorphic raised/inset styling.

### Target C: Settings Section & Subsection Containers (`src/components/SettingsView.tsx`)
- Applied `.nm-static-inset-section` to grouped containers across all 6 tabs (Appearance & Theme, Search Scope, Behavior & Confirmations, Default View, Category forms, Shortcuts table, Backup & Restore, About).
- Applied `.nm-static-inset-subsection` for nested subsection cards (Edit Category).
- Applied specialized variants `.nm-static-inset-danger-section`, `.nm-static-inset-warn-section`, and `.nm-static-inset-info-section` for danger zone, retention banner, and customization notes.

### Target D: Snippet Editor Title Input (`src/components/SnippetEditorModal.tsx`)
- Applied `.nm-static-inset-field` to the title input container.
- Visibly recessed on initial render and stays recessed while typing or focused.

### Target E: Snippet Editor Textareas (`src/components/SnippetEditorModal.tsx`)
- Applied `.nm-static-inset-editor` to the multiline rich content editor surface (`data-testid="editor-surface"`).
- Visibly recessed across the entire editor surface during typing, selection, scrolling, and formatting.

---

## 3. Verification Criteria

- `npm run lint` (`tsc --noEmit`): 0 errors `[COMMAND-VERIFIED]`
- `compile_applet`: Succeeded `[COMMAND-VERIFIED]`
- `scripts/verify-floating-mode.js`: 7/7 tests passed `[COMMAND-VERIFIED]`
- `scripts/verify-web-preview.js`: 6/6 tests passed `[COMMAND-VERIFIED]`
- `npm run build`: Succeeded, output packaged in `public/snippet-organizer-extension.zip` `[COMMAND-VERIFIED]`
