# UI Element Registry — Snippet Organizer

> **SUPERSEDED (2026-10-15)**: This early-era registry is a historical subset of the canonical [`docs/project-knowledge/UI_REGISTRY.md`](../project-knowledge/UI_REGISTRY.md). Do not update this file; extend the canonical registry instead.

This registry documents the active UI controls and components for Snippet Organizer.
Claims are tagged per the evidence standard: `[SOURCE-VERIFIED]`, `[COMMAND-VERIFIED]`, `[RUNTIME-VERIFIED]`, `[INFERRED]`.

---

## Add / Edit Snippet Editor Modal (`SnippetEditorModal.tsx`) `[SOURCE-VERIFIED]`

### Header Area
- **Modal Title**: "New Snippet" (create mode) or "Edit Snippet" (edit mode) `[SOURCE-VERIFIED]`
- **Close Button**: Top-right `X` button dismissing the modal `[SOURCE-VERIFIED]`

### Primary Form Controls
- **Title Input**: Text input for snippet title with autofocus and character count `[SOURCE-VERIFIED]`
- **Category Selector Dropdown**: Primary category selection control displaying active category badge, color dot, and dropdown menu to switch categories or create new ones `[SOURCE-VERIFIED]`
- **Formatting Toolbar**: Rich text formatting controls (Bold, Italic, Code, Link, List, etc.) `[SOURCE-VERIFIED]`
- **Content Area**: Rich text editor content input area `[SOURCE-VERIFIED]`

### Snippet Actions Row (Beneath Editor Content Area)
- **Favorite Button**: Toggles favorite status (`Star` icon, yellow fill when active) `[SOURCE-VERIFIED]`
- **Duplicate Button**: Creates a copy of the current snippet (`Copy` icon) `[SOURCE-VERIFIED]`
- **Delete Button**: Deletes existing snippet (`Trash2` icon, rose styling; rendered only in edit mode) `[SOURCE-VERIFIED]`
- *(Removed)* **Move Category Button**: Previously located between Duplicate and Delete. Removed as redundant because category selection is natively handled by the primary Category Selector Dropdown above `[SOURCE-VERIFIED]`.

### Footer Area
- **Cancel Button**: Closes modal without saving changes `[SOURCE-VERIFIED]`
- **Save Snippet Button**: Commits changes to IndexedDB / local storage `[SOURCE-VERIFIED]`
