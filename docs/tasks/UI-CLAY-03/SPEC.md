# Task Specification: UI-CLAY-03 — Apply the Locked Red Glass-Claymorphism Design System

**Task ID**: UI-CLAY-03 `[SOURCE-VERIFIED]`
**Status**: VERIFIED (extension-host runtime NOT re-verified — see §5) `[COMMAND-VERIFIED]` `[RUNTIME-VERIFIED]`
**Date**: 2026-10-15 `[SOURCE-VERIFIED]`
**Decision record**: ADR-009 in `docs/project-knowledge/DECISIONS.md`

---

## 1. Objective

Apply the user-approved, **locked Red Glass-Claymorphism** design system across the entire extension UI, preserving the locked CSS constants verbatim. Visual-only transformation: no functional, structural, data, manifest, or layout changes.

## 2. Locked Values (approved reference)

Reproduced verbatim in `docs/design/DESIGN_SYSTEM.md` Section 2 and implemented in `src/index.css`:
1. Global background: `linear-gradient(to bottom, rgba(208,2,5,0.9), rgba(208,2,5,0.1))`, no-repeat.
2. Main glass-clay surface: `rgba(255,255,255,0.2)` + `blur(5px)` + radius 26px + locked 3-layer box-shadow.
3. Clay button base + hover (incl. `translateY(-5px)` and 0.5s ease-in-out transitions; no hover transform on disabled).
4. Permanent inset fields: `rgba(255,255,255,0.28)` + `blur(5px)` + border none + radius 15px + locked 2-layer inset shadow; inset visible in normal AND focused state.
5. Decorative clay element: `rgb(240,85,88)` + radius 26% + locked 3-layer shadow.

## 3. Scope

- **In scope**: `src/index.css` (full re-skin), all entry shells (`App.tsx`, `popup.tsx`, `settings.tsx`), all components (`MainPopup`, `Header`, `SearchAndFilters`, `SnippetCard`, `SnippetEditorModal`, `SnippetPreviewModal`, `SettingsModal`, `SettingsView`, `Footer`), preview-page chrome, theme-blue accents.
- **Strictly preserved**: 712 × 512 px layout, DOM structure/handlers, IndexedDB storage, search/filtering, settings behavior, manifest/permissions, the 8 category swatch colors (`#3b66f5`…`#94a3b8`), success/warning/info/danger semantics, `nm-*` class-name API.
- **Documented exceptions** (in `DESIGN_SYSTEM.md` Section 9): scaled shadows on compact controls/dense lists; additive button `text-shadow`; additive focus outline; `.nm-inset` component radius; removal of 3 decorative white sheen strips.

## 4. Implementation Record

- `src/index.css` rewritten: locked selectors (`.glass-app-bg`, `.glass-clay-surface`, `.clay-btn`, `.clay-decor`, `.glass-inset`, `.nm-static-inset-field/-editor`, `.nm-primary-raised`, `.nm-logo-raised`) + scaled glass-clay variants for every remaining `nm-*` class.
- `.glass-app-bg` applied to the three page shells; `.glass-clay-surface` applied to popup/editor/preview/settings/install-modal containers.
- Theme-blue chrome recolored to the red palette; semantic blues (info banners, Default-category badges, success icons, swatch default `#3b66f5`) intentionally preserved. Residual/pending accents recorded in `DESIGN_SYSTEM.md` Section 9.6.

## 5. Verification

- `npm run lint` (`tsc --noEmit`): **0 errors** `[COMMAND-VERIFIED]`
- `npx vite build`: **success (~670 ms)**; zip repackaged to `public/snippet-organizer-extension.zip` via `Compress-Archive` (`scripts/pack-extension.js` requires `python3`, absent in environment) `[COMMAND-VERIFIED]`
- Dev-server visual verification (Chrome DevTools screenshots): main popup; locked button hover (lighten + lift); editor title inset in normal AND focused state; content editor inset; 8 swatches intact; Settings container/sidebar and **all six sections** (General, Categories, Shortcuts, Backup & Data, Trash, About) `[RUNTIME-VERIFIED]`
- **NOT VERIFIED** `[UNKNOWN]`: packaged-extension runtime (docked popup, floating window, service-worker flows); native `<select>` popup styling; disabled-button hover exercised on-screen (CSS-verified only).
