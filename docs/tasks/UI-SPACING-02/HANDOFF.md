# UI-SPACING-02 — 30 px Outer Background Spacing + Floating-Window Maximum & Responsive Behavior

**Status**: VERIFIED — **SUPERSEDED by `docs/tasks/UI-WINDOW-LOCK-01/HANDOFF.md`** (fixed 480 × 560 viewport, 2026-10-16) · **Date**: 2026-10-16
**Scope class**: Layout spacing and window-sizing constraints only. The protected main popup element and the window architecture are unchanged.
**Supersedes** the 10 px gap from `docs/tasks/UI-SPACING-01/HANDOFF.md` (kept as a historical record).

---

## 1. Objective

1. Outer flat background: **30 px visible gap on all four sides** around the unchanged popup.
2. The complete flat background (gap + popup) defines the overall content layout: **772 × 572 px** (= 712 + 2×30 × 512 + 2×30).
3. The floating window must not be resizable beyond that maximum.
4. Smaller windows must adapt (no clipping, no blank areas) with a documented responsive fallback.

## 2. Element Ownership (verified from source)

| Element | Source | Role |
|---|---|---|
| Complete flat-background canvas | `src/popup.tsx:61` — `div.glass-app-bg.popup-shell-canvas w-full h-full p-[30px] flex items-center justify-center overflow-hidden` | Outer background owner; owns the 30 px gap |
| Protected popup | `src/components/MainPopup.tsx:298` — `.glass-clay-surface w-[712px] max-w-[712px] h-[512px]` | **Unchanged**; shrinks only when viewport < 772 × 572 (scoped CSS below) |
| Docked canvas | `popup.html` inline style + `src/popup.tsx` JS | Fixed **772 × 572** (Chrome sizes the action popup to content; ≤ its 800 × 600 cap; not user-resizable) |
| Floating canvas | `popup.html` inline style (`html.floating … , #root` → 100%) + `src/popup.tsx` JS | `html/body/#root` → **100%** — canvas equals the live, resizable viewport |
| Window max | `public/service-worker.js` | `MAX_FLOATING_WIDTH/HEIGHT` constants (derived: 712/512 + 2×30) + clamp |

## 3. Changes Implemented `[SOURCE-VERIFIED]`

| File | Change |
|---|---|
| `popup.html` | Inline canvas 732×532 → **772×572** (docked); NEW rules: `html.floating, html.floating body { width/height: 100% }` and `#root { width/height: 100% }` (height pass-through — required for the responsive chain, see §5) |
| `src/popup.tsx` | JS sizing conditional: docked → fixed `'772px'/'572px'`; floating → `'100%'`. Background root: `w-[732px] h-[532px] p-[10px]` → **`w-full h-full p-[30px] flex items-center justify-center`** + `popup-shell-canvas` class (scoping hook) |
| `src/index.css` | NEW additive scoped rule (no locked value touched): `.popup-shell-canvas > .glass-clay-surface { max-width: 100%; max-height: 100% }` — the popup renders at exactly 712 × 512 at full canvas; below it the surface shrinks to fit (internal flex list scrolls). Scoped to the popup shell: `settings.tsx` nests a `.glass-clay-surface` **directly** under its own `.glass-app-bg` root, and the web demo nests it deeper (drag wrapper) — both verified unaffected at runtime |
| `public/service-worker.js` | NEW derived constants `POPUP_SURFACE_*` / `OUTER_BACKGROUND_GAP` / `MAX_FLOATING_WIDTH (772)` / `MAX_FLOATING_HEIGHT (572)`; `createNewFloatingWindow` uses them; **max clamp** added inside the existing `onBoundsChanged` listener (scoped to `floatingWindowId`, `state === 'normal'`): if `win.width/height > max` → `chrome.windows.update(id, { width: 772, height: 572 })` |

## 4. Maximum-Size Mechanism and Its Limits

`chrome.windows` (extensions) exposes **no declarative maxWidth/maxHeight** for popup windows — those options belong to the separate Chrome-Apps `app.window` API. The maximum is therefore **soft-enforced** through the existing window-management path: the `onBoundsChanged` listener detects an oversized floating window and snaps it back with `chrome.windows.update`. Consequences, documented honestly:

- An oversized drag **briefly** exceeds 772 × 572, then snaps back (rubber-band).
- Explicit OS maximize/fullscreen (`state !== 'normal'`) is deliberately not fought; the content layout still fills the viewport correctly in that state (background covers, popup centered) because the floating canvas is `100%`.
- Outer-window vs content dimensions: `chrome.windows` width/height are consistently used by `create`/`update`/`onBoundsChanged`, so the clamp is self-consistent; the popup page itself also measures `window.innerWidth/innerHeight` equal to the created content size in dev-server simulation. Exact outer-frame (title-bar-inclusive) dimensions are **platform-dependent** and are NOT claimed as exact.

## 5. Responsive Fallback (verified behavior)

- Viewport ≥ 772 × 572 (or the fixed docked canvas): popup = exactly **712 × 512**, gap = exactly **30 px on all four sides**.
- Viewport < 772 × 572: the popup surface shrinks to `min(712, w−60) × min(512, h−60)`, remaining centered so the **30 px ring is preserved**; the background always covers the full viewport (no white areas); no horizontal/vertical document overflow; the snippet list keeps its own scrollbar (content accessible).
- This required the `#root { height: 100% }` pass-through: without it the percentage height chain broke at `#root` and `max-height: 100%` never engaged (found and fixed during runtime verification — the docked mode had masked it because content coincidentally equaled the canvas).

## 6. Verification Evidence

### Static `[COMMAND-VERIFIED]`
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors**.
- `npm.cmd run build` → `vite build` **success** (1675 modules); packaging python3 limitation unchanged → documented `Compress-Archive` fallback; `public/snippet-organizer-extension.zip` + `dist/` copy refreshed (117,679 bytes). `dist/popup.html` and `dist/service-worker.js` spot-checked to contain the new canvas and MAX constants.

### Runtime `[RUNTIME-VERIFIED]` (Vite dev server + Playwright computed geometry, 2026-10-16)
- **Docked** `/popup.html`: body fixed 772×572; background `padding: 30px`; popup rect (30,30) **712 × 512**, radius 26px, `p-5`, locked `rgba(255,255,255,0.2)` surface, exact locked outer+inset shadows, `blur(5px)` — **all identical to pre-task measurements**; **gap 30/30/30/30**; no document overflow.
- **Floating** `/popup.html?mode=floating`: body `100%`; at 700×520 → popup **640×460**, gap 30/30/30/30, background covers viewport, `scrollWidth == clientWidth` and `scrollHeight == clientHeight` (no overflow), snippet list still scrollable (scrollHeight 529 > clientHeight 220); at 620×460 → popup **560×400**, gap 30/30/30/30 — measured **after a live resize without reload**, demonstrating dynamic adaptation.
- **Unaffected surfaces**: web demo popup still 712×512 with `max-height: none` (scoped rule correctly excluded); settings page surface unchanged (its `maxHeight` is its own pre-existing `max-h-[92vh]`).
- Console: only the pre-existing `favicon.ico` 404 (no behavior errors).

### Extension-host runtime `[UNKNOWN]` — requires manual verification
The following were verified at source level only (no Chrome extension host in this environment):
1. Real floating-window behavior: create size, the `onBoundsChanged` clamp snap-back, and `chrome.windows` dimension units on real window frames (incl. title-bar-inclusive outer size).
2. Docked popup opening at exactly 772 × 572 in the real toolbar popup.
3. Real-resize feel of the soft clamp (drag rubber-banding) and OS-maximize behavior.

## 7. Documentation Updated

`DECISIONS.md` (ADR-002 Amendment 2 + index row), `AGENTS.md` (viewport bullet), `docs/project-knowledge/README.md` §5.2, `ARCHITECTURE.md` (entry table, message protocol, HTML-level styling §7.6), `PROJECT_BRIEF.md`, `FEATURES.md`, `INTEGRATIONS.md`, `docs/design/DESIGN_SYSTEM.md` (§1 layout bullet, §10.6), `docs/design/SCREEN_REGISTRY.md`, `docs/design/INTERACTION_FLOWS.md`, `docs/project-knowledge/UI_REGISTRY.md` §7, `docs/tasks/BACKLOG.md` (UI-SPACING-02 row; UI-SPACING-01 marked superseded), `reports/DOCUMENTATION_CHANGELOG.md`.
