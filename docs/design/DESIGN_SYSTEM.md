# Design System & Visual Conventions — Snippet Organizer

**Snapshot Date: 2026-10-15** `[SOURCE-VERIFIED]` · Updated 2026-10-16 by **UI-READ-01** (text-contrast tiers, disabled-label treatment, solid header logo — Section 9.9).

This document is the **canonical design-system reference** for Snippet Organizer. It separates four things that must never be conflated:

1. **Approved reference values** — the locked Red Glass-Claymorphism specification (Section 2).
2. **Values actually present in source** — verified in `src/index.css` (Sections 3–4).
3. **Runtime-verified values** — observed in the running dev-server UI (Section 3 status column).
4. **Exceptions and unresolved discrepancies** — documented deviations (Section 9).

---

## 1. Design Intent & Terminology

- The current visual system is **Red Glass-Claymorphism**: translucent glass surfaces (`background-color: rgba(255,255,255,0.x)` + `backdrop-filter: blur()`) combined with claymorphism-style outer and inset shadows tinted with the brand red `rgb(208, 2, 5)`, applied on a full-page red gradient canvas.
- It is **not** the historical blue/indigo neumorphic theme. Older documents or code comments describing "soft neumorphism", "indigo claymorphism", or `#3b66f5` brand accents describe **superseded eras** (Section 11).
- Class names (`nm-*`) are legacy-preserved API names: they have survived three visual eras unchanged so that handlers, tests, and docs keep stable hooks. **The class name does not imply the material** — always check `src/index.css` for current values.
- Layout is locked: both docked and floating popup modes use one **fixed 480 × 600 px application viewport** (the entire outer window — UI-WINDOW-LOCK-01/02/03, ADR-002 Amendment 3, 2026-10-16; supersedes the earlier 712 × 512 / 732 × 532 / 772 × 572 / 480 × 560 / 480 × 580 layouts). The raised popup surface (`.glass-clay-surface`, `w-[430px] h-[550px]` in `MainPopup.tsx`) sits inset on an **exact 25 px flat-background ring on all four sides** (`p-[25px]` on the `popup.tsx` background root), keeping the layered 3D claymorphism look clearly visible; `popup.html` fixes `html, body { width: 480px; height: 600px }` in both modes. No responsive sizing: the floating window is held at exactly 480 × 600 by the `service-worker.js` `onBoundsChanged` soft lock (`chrome.windows` has no `resizable` option), and the docked action popup is content-sized and not user-resizable. The snippet list is the only scrollable region (`flex-1 min-h-0 overflow-y-auto`), keeping the footer pinned inside the viewport. All Red Glass-Claymorphism surface values (radius, shadows, blur, translucency) are unchanged.

---

## 2. Approved Locked Reference Values `[APPROVED-SPEC]`

These are the approved constants. They are the source of truth for *intent*. Do not alter the source implementation of these values without explicit user approval.

### 2.1 Global Background
```css
background-image: linear-gradient(
  to bottom,
  rgba(208, 2, 5, 0.9),
  rgba(208, 2, 5, 0.1)
);
background-repeat: no-repeat;
```

### 2.2 Main Glass-Clay Surface
```css
background-color: rgba(255, 255, 255, 0.2);
backdrop-filter: blur(5px);
border-radius: 26px;
box-shadow:
  35px 35px 68px 0px rgba(208, 2, 5, 0.5),
  inset -8px -8px 16px 0px rgba(208, 2, 5, 0.6),
  inset 0px 11px 28px 0px rgb(255, 255, 255);
```

### 2.3 Button Base Style
```css
background: rgba(208, 2, 5, 0.5);
backdrop-filter: blur(5px);
box-shadow:
  0 35px 68px 0 rgba(208, 2, 5, 0.42),
  inset 0 -8px 16px 0 rgb(255, 255, 255, 0.8);
transition:
  background 0.5s ease-in-out,
  box-shadow 0.5s ease-in-out,
  transform 0.5s ease-in-out;
```

### 2.4 Button Hover Style
```css
background: rgba(208, 2, 5, 0.1);
box-shadow:
  0 35px 68px 0 rgba(208, 2, 5, 0.42),
  inset 0 -8px 16px 0 rgb(208, 2, 5, 0.7);
transform: translateY(-5px);
```

### 2.5 Permanent Inset Fields
```css
background: rgba(255, 255, 255, 0.28);
-webkit-backdrop-filter: blur(5px);
backdrop-filter: blur(5px);
border: none;
border-radius: 15px;
box-shadow:
  inset 6px 6px 10px rgba(208, 2, 5, 0.25),
  inset -6px -6px 10px rgba(255, 255, 255, 0.92);
```
The inset effect is intended to remain visible in the normal, unfocused state (and to persist through focus).

### 2.6 Decorative Clay Elements
```css
background: rgb(240, 85, 88);
border-radius: 26%;
box-shadow:
  0 5px 5px 0 rgba(240, 85, 88, 0.2),
  inset -8px -8px 16px 0 rgba(145, 192, 255, 0.6),
  inset 0px 11px 28px 0 rgba(255, 255, 255, 1);
```

### 2.7 Design Scope
Global background · main glass-clay surfaces · snippet cards · primary and secondary buttons · tabs and filter controls · search and filter inputs · snippet editor title field · snippet editor content editor · settings navigation · **every Settings menu's content section** · other existing design-system controls.

---

## 3. Approved → Implementation Mapping `[SOURCE-VERIFIED]`

Status legend: `STATICALLY_VERIFIED` = confirmed in current source; `RUNTIME_VERIFIED` = additionally observed in the running UI via dev-server screenshots (2026-10-15 audit; see `reports/DOCUMENTATION_CHANGELOG.md`, UI-CLAY-03 and DOC-AUDIT-02). The repo-wide evidence tags map as: `[SOURCE-VERIFIED]` ≈ STATICALLY_VERIFIED, `[COMMAND-VERIFIED]` ≈ TEST_VERIFIED, `[RUNTIME-VERIFIED]` ≈ RUNTIME_VERIFIED.

| # | Locked requirement | Implementing selector(s) in `src/index.css` | Used by (component : line) | Status |
|---|---|---|---|---|
| 1 | Global red gradient | `.glass-app-bg` (:22) | `src/popup.tsx:61`, `src/settings.tsx:8`, `src/App.tsx:197` | STATICALLY_VERIFIED + RUNTIME_VERIFIED (web demo & settings page) |
| 2 | Main glass-clay surface | `.glass-clay-surface` (:32) | `MainPopup.tsx:298`, `SnippetEditorModal.tsx:711`, `SnippetPreviewModal.tsx:39`, `SettingsModal.tsx:22`, `settings.tsx:16`, `App.tsx:345` (install-guide modal) | STATICALLY_VERIFIED + RUNTIME_VERIFIED (popup, editor, preview, settings page) |
| 3 | Button base + hover | `.nm-primary-raised` (:200–232) — exact locked values; `.clay-btn` (:44–69) — identical values, **reference implementation only, unused by components** | `.nm-primary-raised`: Save Snippet, preview Copy, editor New Category, Settings Done, Export JSON, Add category, App Download CTA | Base STATICALLY_VERIFIED; hover RUNTIME_VERIFIED on App Download CTA only |
| 4 | Permanent inset fields | `.glass-inset` / `.nm-static-inset-field` / `.nm-static-inset-editor` (:82–117) — exact locked values incl. 15px radius | `.nm-static-inset-field`: search field wrapper (`SearchAndFilters.tsx`) + editor title wrapper (`SnippetEditorModal.tsx`); `.nm-static-inset-editor`: content editor (`SnippetEditorModal.tsx`); `.glass-inset`: preview content body (`SnippetPreviewModal.tsx:100`) | STATICALLY_VERIFIED; RUNTIME_VERIFIED (search, editor title in normal **and** focused state, content editor) |
| 5 | Decorative clay element | `.nm-logo-raised` (:233–243) — exact locked values; `.clay-decor` (:72–79) — identical values, **reference implementations only, both now unused by components** | Since **UI-READ-01** (2026-10-16, user-approved) the Header logo plinth uses a **solid inline treatment** (`rounded-[26%] bg-[rgb(240,85,88)] shadow-sm shadow-red-500/30`, same convention as the Settings header icon chip & App bar icon chip) instead of consuming the glassy locked class — see Section 9.9. The class definitions remain in `src/index.css` untouched as locked references. | STATICALLY_VERIFIED; solid header logo RUNTIME_VERIFIED (computed styles) |
| 6 | Settings navigation (selected) | `.nm-inset` (:156–175) | Settings nav active tab (`SettingsView.tsx`) | STATICALLY_VERIFIED + RUNTIME_VERIFIED (all 6 sections visited) |

Audit caveats (do not overstate):
- Runtime verification was performed in the **Vite dev server in a regular Chrome tab** (web demo + `settings.html` route), not inside the loaded Chrome extension runtime (docked popup / floating window). See Section 9.7.
- `.clay-btn` / `.clay-decor` exist so the locked spec is grep-able verbatim in source; shipping components consume the duplicated values via `.nm-primary-raised` / `.nm-logo-raised`. The duplicates are intentional and must be kept in sync (Section 10).

---

## 4. Full Class Inventory (actual current values) `[SOURCE-VERIFIED]`

All definitions live in `src/index.css` (601 lines). Tailwind v4 is imported first (`@import "tailwindcss"`); the custom classes below are **unlayered**, so they win the cascade over Tailwind utilities at equal specificity — component-level `rounded-*`/`bg-*` utilities can be overridden silently by these classes. Line numbers refer to the 2026-10-15 audit snapshot.

### Locked-exact classes
| Class | Lines | Summary of actual values |
|---|---|---|
| `.glass-app-bg` | 22–29 | Exact locked 2.1 gradient, `no-repeat` |
| `.glass-clay-surface` | 32–41 | Exact locked 2.2 (incl. `-webkit-backdrop-filter`) |
| `.clay-btn` (+`:not(:disabled):hover`) | 44–69 | Exact locked 2.3/2.4 + additive `text-shadow: 0 1px 2px rgba(120,0,3,0.55)` (Section 9.3) |
| `.clay-decor` | 72–79 | Exact locked 2.6 (unused; reference) |
| `.glass-inset`, `.nm-static-inset-field`, `.nm-static-inset-editor` | 82–117 | Exact locked 2.5; `:focus`/`:focus-within` re-declares the inset shadows and adds `outline: 2px solid rgba(208,2,5,0.55)` offset 2px (Section 9.4); inner `input`/`textarea` forced transparent/borderless |
| `.nm-primary-raised` (+hover/active) | 200–232 | Exact locked 2.3/2.4 + `color:#fff`, `border:none`, same additive `text-shadow`; `:active` = pressed red inset, `transform: none` |

### Scaled glass-clay variants (same red palette, proportionally smaller shadows)
| Class | Lines | Role | Actual treatment (abbreviated) |
|---|---|---|---|
| `.nm-raised` | 123–153 | Default interactive (inactive tabs, secondary buttons, option cards) | White 0.35 glass + blur 5px; `0 10px 22px rgba(208,2,5,0.25)` + red inset −4/−4 + white inset top; hover = red-tinted 0.15 bg, `translateY(-3px)`; active = red inset well |
| `.nm-inset` | 156–175 | Persistently selected (Settings nav active) | Locked inset **colors/shadows** exactly; **no `border-radius` in the class** — components supply `rounded-xl` (12px), not the locked 15px (Section 9.5); hover lightens bg to 0.36, shadows unchanged |
| `.nm-primary-inset` | 176–199 | Active filter tab / selected category | Filled red `rgba(208,2,5,0.62)` glass, white text, `0 10px 22px rgba(208,2,5,0.35)` + white insets; persists on hover (0.55) |
| `.nm-icon-btn` | 244–273 | Compact icon buttons | White 0.45 glass; `0 6px 14px rgba(208,2,5,0.22)` + scaled insets; hover red-tinted, `translateY(-2px)`; active pressed |
| `.nm-icon-btn-inset` | 274–292 | Toggled icon state (pinned, menu open) | Scaled permanent red inset |
| `.nm-success-inset` | 293–304 | Copied feedback | Emerald glass, semantic green preserved |
| `.nm-danger-raised` | 305–336 | Destructive actions (Trash/Delete/Reset) | Rose glass `rgba(190,18,60,…)` shadows, `#be123c` text; hover lighten+lift −2px |
| `.nm-color-swatch` / `-selected` | 337–362 | Category swatches | Inline `backgroundColor` is the body; red-tinted contact shadow + white inner highlight; selected = inset well + 2px white border |
| `.nm-dropdown-panel` | 363–373 | Menus/popovers | White 0.75 glass, blur 10px, `0 18px 40px rgba(140,0,3,0.35)` |
| `.nm-menu-item-unselected` / `-selected` | 374–394 | Menu items | Hover red 0.12 wash; selected = scaled red inset |
| `.nm-static-inset-card` / `-selected` | 395–428 | Snippet cards | Glass 0.3; outer `12px 12px 26px rgba(208,2,5,0.3)` (scaled, Section 9.2); selected adds `border: 2px solid rgba(208,2,5,0.65)` + `0 0 14px` glow |
| `.nm-static-inset-section` / `-subsection` | 429–449 | Settings sections / nested subsections | Glass 0.28/0.4; outer `10px 10px 24px` (scaled); restrained nested insets |
| `.nm-static-inset-danger/-warn/-info-section` | 450–472 | Semantic tinted sections | Translucent rose/amber/blue glass; hue meanings preserved |
| Rich-editor scoped styles | 475–601 | `contenteditable` content | Links `#b91c1c` (hover `#991b1b`), blockquote border `#c11a1d`; list/heading semantics restored after Tailwind preflight |

### Custom properties (`:root`)
`--red-brand: rgb(208, 2, 5)` · `--red-decor: rgb(240, 85, 88)` · `--red-text: #7f1d1d`. Note: components currently hard-code the equivalent literals (Tailwind arbitrary values) rather than consuming these variables; the variables are documentation anchors. **Exception (THIN-SCROLL-01, 2026-10-19)**: `--red-scrollbar-thumb: rgba(208, 2, 5, 0.38)` and `--red-scrollbar-thumb-hover: rgba(208, 2, 5, 0.62)` were added (derived from `--red-brand`) and ARE consumed by the `.nm-scrollbar` utility — a restrained brand-red thin-minimal scrollbar (6px, transparent track, 9999px radius, standards `scrollbar-width`/`scrollbar-color` + scoped `-webkit-*` fallback). The single shared definition lives in `src/index.css` (imported by both `popup.tsx` and `settings.tsx`); pages opt in per scroll container with the `.nm-scrollbar` class (Main Popup list, editor/preview modal scrolls, Settings sidebar/content/snapshot/restore lists). Intentionally scrollbar-less `.no-scrollbar` rows are untouched. Reduced motion is unaffected (scrollbars never animate).

---

## 5. Component-to-Style Map `[SOURCE-VERIFIED]`

| Surface / Component | Source | Dominant treatments |
|---|---|---|
| Global shells | `popup.tsx`, `settings.tsx`, `App.tsx` | `.glass-app-bg` on the page root |
| Main popup container | `MainPopup.tsx:298` | `.glass-clay-surface` (`w-[712px] h-[512px]` preserved) |
| Header logo plinth | `Header.tsx` | **Solid mark (UI-READ-01)**: `rounded-[26%] bg-[rgb(240,85,88)] shadow-sm shadow-red-500/30` + white Layers icon (stroke 2.4); glass/translucent `.nm-logo-raised` treatment no longer consumed (class kept as locked reference, Section 9.9) |
| Header icon buttons / pin | `Header.tsx` | `.nm-icon-btn` / `.nm-icon-btn-inset` |
| Search field | `SearchAndFilters.tsx` | `.nm-static-inset-field` wrapper + transparent inner input; `Ctrl+K` kbd chip = white glass |
| Filter tabs / category dropdown | `SearchAndFilters.tsx` | `.nm-primary-inset` (selected), `.nm-raised` (idle), `.nm-inset` (menu open); portal panel = `.nm-dropdown-panel` + `.nm-menu-item-*` |
| Snippet cards | `SnippetCard.tsx` | `.nm-static-inset-card` / `-selected`; copy = `.nm-icon-btn` → `.nm-success-inset` while copied; menu = `.nm-icon-btn(-inset)` |
| Editor modal | `SnippetEditorModal.tsx:711` | `.glass-clay-surface`; title wrapper `.nm-static-inset-field`; content editor `.nm-static-inset-editor` (`data-testid="editor-surface"`); toolbar/footer translucent white glass via utilities; swatches = `.nm-color-swatch*`; Save = `.nm-primary-raised`; Cancel = `.nm-raised`; Delete = `.nm-danger-raised` |
| Preview modal | `SnippetPreviewModal.tsx` | `.glass-clay-surface` (:39); content body `.glass-inset` (:100); Copy = `.nm-primary-raised`; Back/Edit = `.nm-raised` |
| Settings (modal & page share `SettingsView.tsx`) | `SettingsModal.tsx:22` / `settings.tsx:16` | `.glass-clay-surface` containers; sidebar `bg-white/25 backdrop-blur-sm`; active nav `.nm-inset` + `text-[#9f0409]`; sections `.nm-static-inset-section` (+ semantic `-danger/-warn/-info` variants); checkboxes `accent rgb(240,85,88)`; primary section buttons = red translucent utilities or `.nm-primary-raised`; danger buttons `.nm-danger-raised` |
| Web demo chrome | `App.tsx` | `.glass-clay-surface` install-guide modal (:345); App bar icon chip & Download CTA in red glass utilities; info banner stays blue (semantic) |
| Footer | `Footer.tsx` | GOOGLE-DRIVE-LOGO-01 (turn 19): connected = official Google Drive triangular logo (inline SVG `GoogleDriveLogo.tsx`, official six-path tricolor geometry, ~15×14px) + "Google Drive connected"; checking = Drive logo with subtle pulse (real probe in flight; reduced-motion freezes); not-connected = neutral dot. No sync claims (GD-06/07). Attribution: lucide User icon + "Developed by AKASH" |
| Settings → Shortcuts rows | `SettingsView.tsx` (SHORTCUTS-VERTICAL-01, turn 17) | Vertical stacks: title → description → wrap-friendly kbd badges → Change/Cancel button inside its section (was horizontal `justify-between` rows that clipped long text) |
| Scrollbars (all popup pages) | `index.css` `.nm-scrollbar` (THIN-SCROLL-01) | Thin brand-red thumb on transparent track; applied per scroll container — Main Popup list, category/filter tab row (turn 17), `SnippetEditorModal` (2), `SnippetPreviewModal` (1), `SettingsView` (4: sidebar, content, snapshot list, restore-conflicts list) |
| Refresh button | `SearchAndFilters.tsx` (POPUP-REFRESH-01) | `.nm-press` + `.nm-icon-btn` square right of the search field; `RefreshCw` 18px; spins + tinted `#9f0409` while running (`motion-reduce` freezes to a static red icon); list region fades to `opacity-60` + `aria-busy` |

---

## 6. State Behavior Matrix `[SOURCE-VERIFIED]`

| State | Raised controls (`.nm-raised`, `.nm-icon-btn`, `.nm-danger-raised`) | Primary CTAs (`.nm-primary-raised`) | Permanent insets (`.nm-static-inset-*`, `.glass-inset`) | Selected (`.nm-inset`, `.nm-primary-inset`, `.nm-icon-btn-inset`, card `-selected`) |
|---|---|---|---|---|
| Normal | Light glass, red-tinted outer shadow | Locked red clay base | Locked red inset visible **without focus** | Persistent inset / filled red / red border |
| Hover | Lighten to red wash + lift (−2/−3px) | Locked hover: bg → `rgba(208,2,5,0.1)`, inset bottom → `rgb(208,2,5,0.7)`, `translateY(-5px)` | Unchanged (inset persists); cards lighten slightly | Persists; slight bg lighten only |
| Focus | Browser default + component outline where present | Same as hover when hovered; locked base otherwise | Inset shadows **re-declared** + `outline: 2px solid rgba(208,2,5,0.55)` offset 2px | Unchanged (inset persists) |
| Active/press | Red inset well, `transform: none` | Pressed red inset, `transform: none` | Unchanged | Unchanged |
| Disabled | No hover transform (selectors are `:not(:disabled)`); since UI-READ-01 disabled editor action labels use readable muted `text-slate-500` with **no** element-level opacity dimming | No hover transform; normal cursor styling from utilities | n/a | n/a |

---

## 7. Color Semantics (preserved across the redesign) `[SOURCE-VERIFIED]`

- **Category swatch palette (8, unchanged)**: `#3b66f5` Royal Blue (Default) · `#60a5fa` · `#34d399` · `#fbbf24` · `#fb923c` · `#f87171` · `#a78bfa` · `#94a3b8` (`SnippetEditorModal.tsx:49`). `#3b66f5` here is a **semantic category color, not a brand accent**.
- **Semantic hues preserved** as translucent glass: success emerald (`.nm-success-inset`, copied checkmark), danger rose (`.nm-danger-raised`, `.nm-static-inset-danger-section`), warning amber (`.nm-static-inset-warn-section`), info blue (`.nm-static-inset-info-section`, blue info banners in `App.tsx:257`, `SnippetEditorModal.tsx:746`).
- **Text palette**: headings/body remain slate (`text-slate-800/500`); red-tinted accents use `#9f0409` (strong) / `#7f1d1d` (`--red-text`) / `#b91c1c` (editor links).
- **Secondary text tiers (UI-READ-01, 2026-10-16)** — low-contrast `text-slate-400` body text was darkened; no new CSS tokens were introduced (component-level Tailwind utilities only):
  - `text-slate-600` — "primary-secondary" tier: Settings header description, Settings footer status ("Settings auto-save on change"), editor character count, preview-modal metadata ("Created … · Updated …") and "Esc to close".
  - `text-slate-500` — in-content helper/description tier inside Settings (search-field helper lines, behavior checkbox descriptions, category snippet counts, shortcut descriptions, trash descriptions, deleted dates, version row).
  - Placeholders: editor title `placeholder-slate-500`; main search `placeholder-slate-500/90` (both remain visibly lighter than entered `text-slate-800` text).
  - Disabled action labels (editor Duplicate/Delete): `text-slate-500` **without whole-element opacity** (was `text-slate-400` + `opacity-60/50`); disabled state stays obvious via `:disabled` (no hover lift, `cursor-not-allowed`, uniformly muted label/icon).
- **Favorite star**: amber (`amber-400/500`), unchanged.

## 8. Typography (unchanged by the redesign) `[SOURCE-VERIFIED]`

- Font stack: `font-sans` (Inter, system-ui fallbacks).
- Header title `text-[16px] font-bold tracking-tight`; card title `text-[14.5px] font-bold`; category badge `text-[11px] font-semibold rounded-full`; preview text `text-[12.5px] text-slate-500 line-clamp-2`; kbd `text-[11px] font-semibold` on white glass chip.

---

## 9. Documented Divergences & Exceptions

1. **Compact controls use scaled shadows** (documented usability exception): the locked 35px/68px button shadow would overwhelm 8–9px controls and stack muddily inside 712×512. `.nm-raised`, `.nm-icon-btn`, `.nm-primary-inset`, tabs/chips use proportionally scaled variants of the same locked palette. The locked language (lighten + lift on hover) is kept at −2/−3px instead of −5px.
2. **Cards & sections use scaled outer shadows** (12px/26px cards, 10px/24px sections) to avoid stacking multiple large locked outer shadows in a dense list; locked colors, blur, and inset shadow values are exact.
3. **Additive `text-shadow` on clay buttons** (`0 1px 2px rgba(120,0,3,0.55)`): keeps white labels legible during the locked light hover (`rgba(208,2,5,0.1)`). Additive only; no locked value replaced.
4. **Focus indicator added**: permanent insets re-declare their inset shadows on focus and add a 2px red outline — the locked inset is never removed in any state.
5. **`.nm-inset` geometry**: carries the locked inset colors/shadows but no `border-radius`; Settings nav tabs render at the component's `rounded-xl` (12px) rather than the locked 15px. The 15px radius is exact on `.glass-inset` / `.nm-static-inset-field` / `.nm-static-inset-editor`.
6. **Residual blue accents (audit findings, not yet reconciled)** — semantic by intent: `Footer.tsx:19` sync icon `text-blue-500`; `SettingsView.tsx:354` import spinner `border-blue-600`; Default-category badges `SnippetCard.tsx:65` and `SnippetPreviewModal.tsx:90` (`blue-50/100/700`); info banners `App.tsx:257–270`, `SnippetEditorModal.tsx:746–747`; success icon `App.tsx:282`; swatch default `#3b66f5` (`SnippetEditorModal.tsx:49/206/221`). Leftover theme chrome flagged for a follow-up decision: `App.tsx:315` floating-mode ring `ring-blue-500/30`, `App.tsx:374` install-guide link `text-blue-600 underline`. Whether these stay blue (semantic) or move to red (theme) requires a product decision — **not fixed during the documentation audit**.
7. **Verification environment**: runtime evidence comes from the Vite dev server (web demo + `settings.html`) in a desktop Chrome tab. The packaged extension's docked popup, floating window, and service-worker flows were **NOT re-verified** against the new skin (no extension host in the audit environment).
8. **Historical markup removals** (made during UI-CLAY-03, recorded here because they are visual-structural): three decorative white "sheen" gradient strips were removed (`SearchAndFilters.tsx` ×1, `SnippetEditorModal.tsx` ×2) because they competed with the locked inset shadows; the header logo container's utility gradient was replaced by `.nm-logo-raised`.
9. **UI-READ-01 readability adjustments (2026-10-16, user-approved)**: (a) the Header logo plinth no longer consumes the glassy locked `.nm-logo-raised` treatment — it renders as a solid `rgb(240,85,88)` chip (26% radius kept, small red outer shadow, no inset glows / backdrop effects) so the mark stays solid and legible at small sizes; the locked class definitions (`.nm-logo-raised`, `.clay-decor`) remain untouched in `src/index.css` as references. (b) Disabled editor Duplicate/Delete labels: `text-slate-400` + element `opacity-60/50` replaced by solid `text-slate-500` (label only; disabled behavior/conditions unchanged). (c) Secondary-text and placeholder color tiers per Section 7. Estimated contrast against composited light-glass backgrounds (approximate, not certified): slate-400 ≈ 2.0–2.2:1 → slate-500 ≈ 4.0:1, slate-600 ≈ 6.1:1; disabled labels ≈ 1.2:1 → ≈ 2.7:1 (WCAG exempts disabled controls). The extension favicon is a **separate asset** and was intentionally not modified in UI-READ-01. **FAVICON-PACK-01 update (2026-10-17)**: `public/icons/` now contains the supplied canonical icon pack (`icon16/32/48/128.png` + `icon-master-1024.png` + `README.txt`) — the same filenames `public/manifest.json` references — and the Vite entry pages declare `<link rel="icon">` at the 16/32/48 px variants. The pack is the canonical favicon source; see `docs/project-knowledge/ARCHITECTURE.md` §6.2.
10. **LOGO-GLOW-01 (2026-10-17)**: the popup header's primary logo plinth now renders the approved canonical master artwork (`public/icons/icon-master-1024.png`, `object-cover` inside the unchanged 40×40 `rounded-[26%]` `rgb(240,85,88)` chip with `overflow-hidden`) instead of the previous white lucide `Layers` glyph. A new class `.nm-logo-glow` (defined next to `.nm-logo-raised` in `src/index.css`) adds the theme-matched glow: two soft `drop-shadow`s in the light-red card-accent family — `0 0 5px rgba(254,202,202,.95)` (rose-200 pale coral) and `0 0 13px rgba(252,165,165,.55)` (rose-300 warm coral) — which follow the rounded silhouette (no rectangular halo) and add no layout impact. Applied ONLY to the popup header logo; `.nm-logo-raised` and all locked values remain unchanged. Favicon/extension-icon locations (manifest + HTML `<link rel="icon">`) keep the canonical 16/32/48/128 px pack variants per FAVICON-PACK-01.
11. **MOTION-01 motion & feedback conventions (2026-10-17)**: a small shared convention set in `src/index.css` (new §5c/§5d blocks — all locked §2–4 values untouched): (a) `.nm-press` (buttons, `scale(.96)` on `:active`) and `.nm-press-sm` (snippet cards, `scale(.985)`) — transform-only 150 ms `cubic-bezier(0.4,0,0.2,1)` press responses; (b) `.nm-toast-out` — 160 ms `ease-in` fade + 6 px downward exit keyframe for toasts; (c) the previously NO-OP Tailwind-plugin class names the codebase already used (`animate-in`, `fade-in`, `zoom-in-95`, `zoom-in-98`, `slide-in-from-top-1/-2`, `slide-in-from-bottom-1`) are now defined as real entrance utilities driven by one `nm-enter` keyframe (opacity/translate/scale vars, duration from Tailwind v4's `--tw-duration`, default 180 ms, `cubic-bezier(0.4,0,0.2,1)`, `fill-mode: both`) — no component class changes were required for those; (d) `@media (prefers-reduced-motion: reduce)` collapses all animation/transition durations to ~0 while text/icons still carry the message. Feedback rules: the popup copy toast (fixed bottom-center pill, `role="status"` + `aria-live`, emerald Check / rose XCircle, ~1.8 s visible) reports the REAL clipboard result only; Settings keeps its in-flow banner toast with the same entrance/exit pair; async settings operations (trash empty/restore-all, category delete, import) use genuine in-progress states with disabled controls and never fake progress. No new dependencies; no design-language changes.
12. **CLAY-DEPTH-01 popup top-edge depth (2026-10-17)**: `.glass-clay-surface` gained two ADDITIVE top-edge outer shadow layers prepended to its stack — broad ambient `0 -9px 22px -7px rgba(70,24,26,.42)` and tight contact `0 -2px 6px -2px rgba(70,24,26,.3)` (neutral dark-warm grey, sampled against the composited background) — so the raised silhouette reads from the top corners to the bottom corners. Root cause addressed: the original single `35px 35px 68px rgba(208,2,5,.5)` outer shadow pointed down-right only, and the top of the red gradient composites to a dark `rgb(212,30,32)` against which the deep-red spill was invisible, leaving the top-left/top-right corners flat while the pale bottom ring (`rgb(244,200,200)`) showed the existing shadow well. The locked trio (down-right shadow, both insets, radius 26px, background, blur) is preserved verbatim; offsets/blur/spread are sized to the 25px popup ring (reach ≤ 24 px) so the 480×600 window's `overflow-hidden` never clips the new shadow. Applies uniformly to every `.glass-clay-surface` (main popup, floating window, Settings panel, Snippet-Preview modal surface) — no component-specific overrides.

---

## 10. Rules for Extending the Design

1. **Never edit locked values** (Section 2) without explicit user approval; keep `.clay-btn`/`.clay-decor` byte-equivalent to `.nm-primary-raised`/`.nm-logo-raised` where they overlap.
2. New controls must reuse an existing class from Section 4 before defining new CSS; if a new variant is unavoidable, derive it from the locked palette and document it in this file.
3. Do not re-introduce large outer shadows on nested/compact elements; follow the scaling pattern (Section 9.1–9.2).
4. Preserve the class-name API (`nm-*`); restyling happens in `src/index.css`, not by renaming classes in components.
5. Keep semantic hues (Section 7) distinct from the red brand palette; do not recolor success/warning/info/danger or the 8 category swatches.
6. Any UI change must preserve the fixed 480 × 600 px application viewport shared by docked and floating modes, with the raised popup inset on the exact 25 px flat-background ring (UI-WINDOW-LOCK-01/02/03, ADR-002 Amendment 3; no responsive sizing), and test the web demo (`npm run dev` → `http://localhost:3000/`), `http://localhost:3000/popup.html` (docked and `?mode=floating` at a 480 × 600 viewport), and `http://localhost:3000/settings.html`.

## 11. Superseded Visual Eras (historical context only) `[SOURCE-VERIFIED]`

| Era | Description | Where recorded |
|---|---|---|
| v1 (original) | White/blue glass design, `#3b66f5` brand accents | `reports/DOCUMENTATION_CHANGELOG.md` (pre-UI-NEUMORPH entries) |
| v2 | Universal soft neumorphism (grey-blue dual shadows), + static-inset phase | `docs/tasks/UI-NEUMORPH-01..03/`, changelog UI-NEUM-01–03 |
| v3 | Indigo Glowing Blue Claymorphism + clay material correction | changelog UI-CLAY-01, UI-CLAY-02 |
| **v4 (current)** | **Locked Red Glass-Claymorphism** | changelog **UI-CLAY-03**, this document |

Detailed v1–v3 CSS value tables were removed from this document in the DOC-AUDIT-02 restructure because they contradicted the live implementation; consult the changelog and git/task history for historical values. The `.nm-*` class names and element targets from those eras remain authoritative and are what Section 4 documents in their current (v4) form.

## 12. Keyboard Navigation & Accessibility `[SOURCE-VERIFIED]` (corrected 2026-10-17)

`Ctrl+Shift+S` focuses search · `ArrowUp`/`ArrowDown` navigate cards · `Enter` copies the active snippet (SNIPPET-KBD-02). Escape handling is **scoped to specific surfaces**: it closes the category dropdown (`SearchAndFilters.tsx`) and closes the editor's "More" formatting menu (`SnippetEditorModal.tsx`); from the list context it returns interaction to the search field. The former JS Escape-clears-search listener was removed in SNIPPET-KBD-02 — Chrome's native `type="search"` Escape-clear still applies while the field is focused. **Known pre-existing gap (runtime-verified during UI-READ-01, unchanged since): the preview modal's "Esc to close" footer label is descriptive-only — no global Escape handler closes the preview, editor, or Settings modal** (`MainPopup.tsx` keyboard handler returns early while a modal is open). Permanent insets keep a visible focus outline (Section 9.4); interactive states do not rely on color alone (lift/inset changes on hover/press).

**Snippet list keyboard interaction (SNIPPET-KBD-01, revised by SNIPPET-KBD-02, 2026-10-17)** `[SOURCE-VERIFIED]` `[RUNTIME-VERIFIED]`: the popup has two contexts. **SEARCH** — the input autofocuses when the surface opens and normal typing is never intercepted; `ArrowDown`/`Enter` hand interaction to the list by blurring the input. **LIST** — the five-action model: **Focus Search Bar = Ctrl+Shift+S** (customizable `uiShortcuts.focusSearch`, works anywhere in the popup; the search-field badge shows the active binding; the former hardcoded Ctrl+K handler was removed), **Navigate Snippets = ArrowUp/ArrowDown (fixed, not rebindable**; visible selection, respects filtering, safe wrap at both ends), **Copy Content = Enter** (copies the active snippet via the existing `copySnippet` + copied feedback — no preview/edit opens; Quick View remains in the card three-dot menu), **Clear Search / Dismiss = Backspace** (context-aware: clears the query from the LIST context; inside the input Backspace edits normally), **Open / Toggle Extension = Ctrl+Shift+X** (the browser-global `toggle-organizer` MV3 command, changeable at chrome://extensions/shortcuts: toggles the extension-owned floating window closed/open; a docked action popup can only be OPENED programmatically (`chrome.action.openPopup()`, Chrome 127+) because Chrome exposes no API to close one — the limitation is stated in Settings rather than worked around). The removed SNIPPET-KBD-01 bindings — standalone Shift, modifier-only Ctrl+Shift, and Space-to-copy — are rejected by validation and inert at runtime; Shift and Space behave as normal typing keys, and the editor's unrelated Ctrl+Shift+Z (Redo) is untouched. Settings → Shortcuts presents two titled cards: **Default Shortcuts** (informational) and **Customize Shortcuts** (capture controls for focus/copy/clear, the fixed-arrow row, the browser-global row via Chrome's manager, Reset to Defaults).
