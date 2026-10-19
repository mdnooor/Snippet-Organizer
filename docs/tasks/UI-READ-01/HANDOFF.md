# UI-READ-01 — Visual Polish: Text Readability & Solid Logo (Red Glass-Claymorphism)

**Status**: VERIFIED (static + dev-server runtime) · **Date**: 2026-10-16
**Scope class**: Visual styling only — no behavior, data, storage, manifest, or permission changes.

---

## 1. Objective

Fix specific low-contrast text / placeholder / disabled-label / logo-visibility issues in the locked Red Glass-Claymorphism UI (ADR-009) without altering locked surfaces, component structure, or application behavior.

## 2. Changes Implemented `[SOURCE-VERIFIED]`

| Issue | File | Change |
|---|---|---|
| A — Settings header description | `src/components/SettingsView.tsx` | Header description `text-slate-400` → `text-slate-600` (heading stays `text-slate-800` bold) |
| B — Settings footer + secondary labels | `src/components/SettingsView.tsx` | Footer container (status "Settings auto-save on change") `text-slate-400` → `text-slate-600`; all low-contrast in-content helper/description/meta text (13 spots: search-field helpers, behavior checkbox descriptions, category counts, shortcut descriptions, trash descriptions, deleted dates, version row) `text-slate-400` → `text-slate-500`. Decorative icons and hover-only states left unchanged. |
| C — Editor title placeholder | `src/components/SnippetEditorModal.tsx` | Title input `placeholder-slate-400` → `placeholder-slate-500` (entered text stays `text-slate-800`; `.nm-static-inset-field` untouched) |
| D — Duplicate / Delete labels | `src/components/SnippetEditorModal.tsx` | Disabled branches: `text-slate-400 cursor-not-allowed opacity-60/50` → `text-slate-500 cursor-not-allowed` (whole-element opacity dimming removed; disabled conditions/logic unchanged; icons muted while disabled — Duplicate icon already slate-500, Delete Trash2 icon now `text-slate-400` only while disabled, `text-rose-500` when enabled; enabled Delete keeps `.nm-danger-raised`) |
| E — Character count | `src/components/SnippetEditorModal.tsx` | `Characters: n` `text-slate-400` → `text-slate-600` |
| F — Search placeholder | `src/components/SearchAndFilters.tsx` | `placeholder-slate-400/90` → `placeholder-slate-500/90` (subtle; still lighter than entered `text-slate-800`) |
| G — Solid logo | `src/components/Header.tsx` | Glass plinth `.nm-logo-raised` (locked 2.6 glass insets incl. legacy blue-tinted inner glow) replaced at component level by a solid chip: `rounded-[26%] bg-[rgb(240,85,88)] shadow-sm shadow-red-500/30`, white Layers icon stroke 2.4, no backdrop/opacity effects. Matches the pre-existing solid chip convention (Settings header icon chip, App bar chip). Class definitions in `src/index.css` untouched. |
| H — Preview modal metadata | `src/components/SnippetPreviewModal.tsx` | "Created … · Updated …" and "Esc to close" `text-slate-400` → `text-slate-600` (title stays 18px/700 slate-800; category badge untouched — documented residual §9.6) |

No new CSS custom properties/classes were introduced; no `!important`; all edits are component-level Tailwind utilities (the project's existing styling convention).

## 3. Favicon Note

The browser/extension icon is a **separate asset set**: `public/icons/icon16.png … icon128.png`, referenced only by `public/manifest.json` (`action.default_icon` + `icons`). No HTML file declares `<link rel="icon">` (the dev-server 404s on `/favicon.ico`). The in-app logo change does **not** affect the favicon; icon PNG regeneration was explicitly out of scope.

## 4. Verification Evidence

### Static `[COMMAND-VERIFIED]`
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors**.
- `npm.cmd run build` → `vite build` **success (804 ms, 9 outputs)**; packaging step failed only because `python3` is absent (known environment limitation) — documented fallback applied: `dist/*` repackaged via `Compress-Archive` into `public/snippet-organizer-extension.zip` (+ copy in `dist/`).

### Runtime `[RUNTIME-VERIFIED]` (Vite dev server + Playwright, 2026-10-16; web demo + `settings.html`)
- Logo: computed `backgroundColor: rgb(240, 85, 88)` (opaque), `border-radius: 26%`, `opacity: 1`, `backdrop-filter: none`, glass inset shadows gone (only small red outer shadow), white icon.
- Search placeholder: slate-500 @ 0.9 alpha; entered text slate-800; typing "refund" filters the list (behavior intact); locked inset re-confirmed on the wrapper (`rgba(255,255,255,0.28)`, blur 5px, 15px, exact locked inset shadows).
- New-snippet editor: title placeholder slate-500; Duplicate `disabled: true`, label slate-500 at computed `opacity: 1`, `cursor: not-allowed`, `.nm-raised` glass intact; Delete disabled same treatment with muted icon; character count "Characters: 0" at slate-600.
- Edit mode (existing snippet): Duplicate enabled (slate-700, pointer), Delete enabled via `.nm-danger-raised` (`rgb(190, 18, 60)` + rose-500 icon).
- Preview modal: metadata + "Esc to close" at slate-600; title dominant; content/behavior unchanged.
- Settings (modal **and** `settings.html` page): header description and footer at slate-600; helper texts at slate-500; active nav `#9f0409`; Done button intact.

### Contrast estimates `[INFERRED]`
Calculated (WCAG formula) against composited effective-background estimates (translucent glass over the red gradient; approximations, not certified against measured pixels): Settings header/footer text ≈ 2.1:1 → **≈ 6.2:1** (slate-600); Settings helpers ≈ 2.2:1 → **≈ 4.0:1** (slate-500); disabled labels ≈ 1.2:1 → **≈ 2.7:1** (slate-500; WCAG exempts disabled controls); preview metadata ≈ 1.0–1.8:1 → **≈ 2.9–5.4:1** (slate-600, depends on backdrop); logo mark vs white icon ≈ 3.4:1 (icon, not text).

## 5. Known Limitations / Findings

1. **Pre-existing (unchanged)**: the preview modal's "Esc to close" label is descriptive-only — no global Escape handler closes the preview/editor/Settings modals (`MainPopup.tsx` keyboard handler returns early while a modal is open; verified at runtime). Documented in `DESIGN_SYSTEM.md` §12. Not fixed (out of scope; task forbids touching the Escape interaction).
2. Extension-host runtime (docked popup / floating window) not verified — dev-server evidence only (same limitation as UI-CLAY-03).
3. Contrast figures are compositing-based estimates, not measured-pixel certified values.
4. `.nm-logo-raised` / `.clay-decor` are now both unused-by-components locked reference classes (kept in `src/index.css`; sync obligation unchanged).

## 5. Documentation Updated

- `docs/design/DESIGN_SYSTEM.md` (§3 row 5, §5, §6, §7 text tiers, §9.9, §12 correction)
- `docs/project-knowledge/UI_REGISTRY.md` (§7 header rows)
- `docs/tasks/BACKLOG.md` (task row + active status)
- `reports/DOCUMENTATION_CHANGELOG.md` (entry)
