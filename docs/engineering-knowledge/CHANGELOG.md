# Documentation Changelog — Engineering Knowledge

## [2026-10-12] REPAIR-01: Remove Redundant "Move Category" Button

### Summary
Removed the redundant "Move Category" button from the Snippet Actions section beneath the editor text area in the Add/Edit Snippet Editor (`SnippetEditorModal.tsx`).

### Rationale `[INFERRED]`
The editor interface already provides a dedicated category selection dropdown above the text area for selecting or changing categories. The auxiliary "Move Category" button placed in the actions row beneath the editor text area was redundant.

### File Modifications
- `src/components/SnippetEditorModal.tsx`:
  - Removed the "Move to Category" button from the Snippet Actions row `[SOURCE-VERIFIED]`.
  - Removed unused import `FolderInput` from `lucide-react` `[SOURCE-VERIFIED]`.
  - Kept primary category selector, Favorite, Duplicate, Delete, formatting toolbar, and text area intact `[SOURCE-VERIFIED]`.

### Verification Status
- Linting (`npm run lint` / `tsc --noEmit`): **PASSED** `[COMMAND-VERIFIED]`
- Compilation (`compile_applet`): **PASSED** `[COMMAND-VERIFIED]`
- Packaging (`npm run build && node scripts/pack-extension.js`): **PASSED** `[COMMAND-VERIFIED]`
## [2026-10-13] TASK-08: Fix Search Filter Priority Ranking

### Summary
Fixed search result priority ranking in Snippet Organizer to enforce the canonical priority order: **Title** > **Content** > **Category**.

### Rationale `[INFERRED]`
Previously, search matches were filtered without priority sorting, leading Content-matching snippets with recent timestamps to appear above Title-matching snippets. The search ranking algorithm now strictly partitions and ranks matches by Title (highest), Content (second), and Category (third), while respecting enabled search fields from Settings.

### File Modifications
- `src/db.ts`:
  - Exported `stripHtml` for text extraction `[SOURCE-VERIFIED]`.
  - Implemented `filterAndRankSnippets` enforcing the strict priority hierarchy: Title > Content > Category `[SOURCE-VERIFIED]`.
  - Within each priority group, preserved relevance sub-tiers (Exact > Prefix > Substring) and preserved input list order for tie-breaks `[SOURCE-VERIFIED]`.
  - Updated `searchSnippets` to utilize `filterAndRankSnippets` `[SOURCE-VERIFIED]`.
- `src/components/MainPopup.tsx`:
  - Applied `filterAndRankSnippets` within the search `useEffect` `[SOURCE-VERIFIED]`.
  - Added `preferences` to `useEffect` dependencies so search re-evaluates immediately upon changing search field toggles in Settings `[SOURCE-VERIFIED]`.

### Verification Status
- Unit verification suite (`npx tsx` covering Cases A–E, multi-field matching, sub-tiers, and tie-breakers): **10/10 PASSED** `[COMMAND-VERIFIED]`
- Linting (`npm run lint` / `tsc --noEmit`): **PASSED** `[COMMAND-VERIFIED]`
- Compilation (`compile_applet`): **PASSED** `[COMMAND-VERIFIED]`
- Packaging (`npm run build && node scripts/pack-extension.js`): **PASSED** `[COMMAND-VERIFIED]`
- End-user visual verification in Chrome browser: **PENDING USER VERIFICATION** `[UNKNOWN]`
