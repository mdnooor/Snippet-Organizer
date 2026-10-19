# Task Specification: UI-NEUMORPH-02 — Phase 1.1: Neumorphic Styling Corrections

**Task ID**: UI-NEUMORPH-02 `[SOURCE-VERIFIED]`  
**Status**: VERIFIED `[COMMAND-VERIFIED]`  
**Snapshot Date**: 2026-10-15 `[SOURCE-VERIFIED]`

---

## 1. Objective

Correct the incomplete aspects of the soft-neumorphic styling implementation:
1. Restore main popup brand logo visibility and elevated raised soft-neumorphic styling.
2. Establish stronger 3D raised shadows with subtle outer glow on default interactive elements.
3. Apply smooth inset appearance on mouse hover with automatic state restoration on mouse leave.
4. Establish more visible pressed/inset depth with restrained ambient inset glow.
5. Maintain persistent inset styling for selected search/filter tabs across hover interactions.
6. Ensure category color swatches in the snippet editor remain 100% visible with neumorphic elevation and inset states.

---

## 2. Implementation Scope & Changes

- `src/index.css`:
  - Updated `.nm-raised` with deeper dual opposing shadows and ambient outer glow (`0 0 10px rgba(255, 255, 255, 0.5)`).
  - Configured `:hover` states across `.nm-raised`, `.nm-icon-btn`, `.nm-primary-raised`, and `.nm-danger-raised` to transition into soft inset depressions, automatically restoring to raised upon mouse leave.
  - Deepened active pressed shadows and persistent inset tokens (`.nm-inset`, `.nm-primary-inset`, `.nm-icon-btn-inset`).
  - Added `.nm-logo-raised` with dual specular/dark elevation and ambient blue glow for the static brand logo container.
  - Added `.nm-color-swatch` and `.nm-color-swatch-selected` to preserve inline `backgroundColor` without CSS shorthand gradient overrides.
- `src/components/Header.tsx`:
  - Restored original rich gradient (`bg-gradient-to-br from-blue-500 to-indigo-600`), glossy sheen overlay, and white `Layers` icon with drop shadow inside a raised `.nm-logo-raised` container.
- `src/components/SnippetEditorModal.tsx`:
  - Applied `.nm-color-swatch` and `.nm-color-swatch-selected` to category color picker and inline new category creation swatches.

---

## 3. Verification Criteria

- `npm run lint` (`tsc --noEmit`): 0 errors `[COMMAND-VERIFIED]`
- `compile_applet`: Succeeded `[COMMAND-VERIFIED]`
- `scripts/verify-floating-mode.js`: 7/7 tests passed `[COMMAND-VERIFIED]`
- `scripts/verify-web-preview.js`: 6/6 tests passed `[COMMAND-VERIFIED]`
- `npm run build`: Succeeded, output packaged in `public/snippet-organizer-extension.zip` `[COMMAND-VERIFIED]`
