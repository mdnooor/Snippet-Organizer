# UI-WINDOW-LOCK-01 — Fixed 480 × 560 px Application Viewport (Both Modes) + Overflow Containment

**Status**: VERIFIED — **adjusted same day by UI-WINDOW-LOCK-02, -03 and -04 (see Addenda at the end): final state is a 480 × 600 px content viewport with the raised popup on an exact 25 px flat-background ring, and the floating window's outer size frame-compensated by the service worker** · **Date**: 2026-10-16
**Supersedes** the outer-spacing work of UI-SPACING-01 (10 px gap) and UI-SPACING-02 (30 px gap / 772 × 572 responsive system) — both kept as historical records. Recorded as **ADR-002 Amendment 3**.

---

## 1. Objective

1. One **fixed 480 × 560 px** application viewport for BOTH floating-window and pinned (docked) modes — the entire outer window, not just the raised card.
2. Users must not be able to resize the floating window larger or smaller.
3. No responsive resizing, no extra outer spacing, no screen-size-dependent dimensions.
4. Fix footer/static-card overflow within the fixed viewport; protect the approved Red Glass-Claymorphism design.

## 2. Root Causes Identified (previous implementation)

1. **Resize still possible**: `chrome.windows` (extensions) exposes **no `resizable` option and no declarative size limits** for popup windows (those belong to the separate Chrome-Apps `app.window` API). The UI-SPACING-02 clamp was (a) **max-only** — it permitted shrinking below the target, which is what broke the layout, and (b) scoped through an async storage lookup so the snap-back always lagged the user's drag. CSS could never prevent OS-level window resizing.
2. **Footer/static-card overflow when reduced**: the canvas was allowed to shrink (responsive `100%` + `max-width/max-height` system), and inside the card the snippet list carried `min-h-[220px]` + `max-h-[460px]` fixed constraints. When available height dropped, the list's `min-height` forced the flex column beyond the card's fixed height, pushing the **footer outside the viewport**; non-shrinkable children (default `min-width: auto` flex items, fixed-size rows) caused horizontal spill at narrower widths.

## 3. Changes Implemented `[SOURCE-VERIFIED]`

| File | Change |
|---|---|
| `popup.html` | Inline canvas → fixed `html, body { width: 480px; height: 560px }` for **both** modes; removed the `html.floating` responsive rules (kept `#root { width/height: 100% }`) |
| `src/popup.tsx` | Unconditional 480 × 560 inline sizing (no `isFloating` branch); background root → `glass-app-bg w-[480px] h-[560px] overflow-hidden select-none` (edge-to-edge card, **no outer spacing**; removed `popup-shell-canvas`/`p-[30px]`/flex-centering) |
| `src/index.css` | Removed the UI-SPACING-02 responsive rule `.popup-shell-canvas > .glass-clay-surface { max-width/max-height: 100% }` (no locked value touched) |
| `src/components/MainPopup.tsx` | Card: `w-[712px] max-w-[712px] h-[512px]` → **`w-[480px] h-[560px]`** (fills the shared viewport; all surface styling classes unchanged). Snippet list: `flex-1 overflow-y-auto … max-h-[460px] min-h-[220px]` → **`flex-1 min-h-0 overflow-y-auto`** — the list is the ONLY scroll region; `min-h-0` removes the constraint that pushed the footer out; header/search/footer keep their exact sizes and order |
| `public/service-worker.js` | Constants → `FIXED_WINDOW_WIDTH = 480`, `FIXED_WINDOW_HEIGHT = 560`; `createNewFloatingWindow` uses them; `onBoundsChanged` now performs an **exact two-way clamp applied immediately** (no debounce): any reported size ≠ 480 × 560 snaps back via `chrome.windows.update`. Position save (200 ms debounce) unchanged |

**Not changed**: manifest/permissions, window type/architecture, all visual design values (radius 26 px, shadows, blur, colors, typography, spacing inside the card), snippet/storage/search/settings logic, modals (already fit: preview `max-w-[420px]`, editor `max-w-[460px]`, settings `w-full` caps).

## 4. Fixed-Size Enforcement Mechanism and Platform Limitation

- **Docked (pinned) mode**: Chrome sizes the action popup to its content — `popup.html` is fixed at 480 × 560 (≤ the 800 × 600 action-popup cap) — and Chrome does not allow users to resize action popups. No extra mechanism needed.
- **Floating mode**: created at 480 × 560 (`type: 'popup'`). Because `chrome.windows` cannot create a truly non-resizable window, the fixed size is **soft-locked**: the existing `onBoundsChanged` listener compares the reported `win.width/height` against 480 × 560 and issues `chrome.windows.update` **immediately** on any deviation, in either direction. Practical effect: a resize drag momentarily deviates and then snaps back to exactly 480 × 560 (rubber-band). This is the closest supported behavior within the existing window architecture; a hard non-resizable window would require the Chrome-Apps `app.window` API (different architecture — not introduced).
- Outer-window vs content-viewport distinction is preserved: `create`/`update`/`onBoundsChanged` all use the same `chrome.windows` dimension unit (self-consistent), and the popup page itself is exactly 480 × 560 CSS px; exact title-bar-inclusive outer frames are platform-dependent and are not claimed as exact.

## 5. Verification Evidence

### Static `[COMMAND-VERIFIED]`
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors**.
- `npm.cmd run build` → `vite build` **success**; packaging python3 limitation unchanged → documented `Compress-Archive` fallback; `public/snippet-organizer-extension.zip` + `dist/` copy refreshed (117,618 bytes). `dist/popup.html` (`width:480px;height:560px`), `dist/service-worker.js` (`FIXED_WINDOW_WIDTH = 480`), and the `MainPopup` chunk (`w-[480px] h-[560px]`) spot-checked.
- `grep` across `src/` confirmed no stale `772/572/732/712px` or `popup-shell-canvas` references remain in code.

### Runtime `[RUNTIME-VERIFIED]` (Vite dev server + Playwright computed geometry, 2026-10-16, viewport exactly 480 × 560)
- **Docked** `/popup.html`: body fixed 480 × 560; background and card both exactly 480 × 560 at (0,0), `padding: 0px`; card radius 26 px, `rgba(255,255,255,0.2)`, `blur(5px)`, locked shadow — **all surface values unchanged**; **no horizontal or vertical document overflow** (`scrollW 480`, `scrollH 560`).
- **Footer containment**: fully inside the card with exactly the design `p-5` margins (20 px bottom/right); list bottom 495 px < footer top 509 px → **no overlap**; snippet list scrolls internally (`scrollHeight 529 > clientHeight 311`) with cards inside the list bounds.
- **Floating** `/popup.html?mode=floating`: identical measurements — same fixed 480 × 560 canvas, same card geometry, same containment. Docked and floating are pixel-identical apart from the `floating` class.
- **Web demo** `/`: popup card also 480 × 560 (consistent single layout everywhere); settings page untouched.
- Console: only the pre-existing `favicon.ico` 404 (no behavior errors).

### Real-Chrome window behavior `[UNKNOWN]` — requires manual verification
No Chrome extension host exists in this environment, so the following are source-level only:
1. The floating window opening at exactly 480 × 560 (outer-frame unit) on real Chrome/Windows.
2. The snap-back feel of the soft lock (drag any edge/corner → momentary deviation → restore to 480 × 560).
3. The docked popup opening at exactly 480 × 560 in the real toolbar surface.

## 6. Documentation Updated

`DECISIONS.md` (ADR-002 Amendment 3 + index row; Amendment 2 marked superseded), `AGENTS.md` (viewport bullet), `docs/project-knowledge/README.md` §5.2, `ARCHITECTURE.md` (entry table, `OPEN_FLOATING_WINDOW` protocol, §7.6), `PROJECT_BRIEF.md`, `FEATURES.md`, `INTEGRATIONS.md`, `docs/design/DESIGN_SYSTEM.md` (§1 layout bullet, §10.6), `docs/design/SCREEN_REGISTRY.md`, `docs/design/INTERACTION_FLOWS.md`, `docs/project-knowledge/UI_REGISTRY.md` §7, `docs/tasks/BACKLOG.md` (UI-WINDOW-LOCK-01 row; UI-SPACING-01/02 marked superseded; active status refreshed), `reports/DOCUMENTATION_CHANGELOG.md`.

---

## Addendum — UI-WINDOW-LOCK-02 (2026-10-16): Height 560 → 580 px + Restored Visible Flat-Background Ring

Follow-up user-directed adjustment; the body of this HANDOFF remains accurate as the history of UI-WINDOW-LOCK-01.

### Changes `[SOURCE-VERIFIED]`
- Fixed viewport: **480 × 580 px** (was 480 × 560) — `popup.html` inline style, `src/popup.tsx` inline sizing, `FIXED_WINDOW_HEIGHT = 580` in `public/service-worker.js` (create + exact two-way `onBoundsChanged` clamp). Width and the soft-lock mechanism unchanged.
- Flat background restored: the `src/popup.tsx` background root now carries **`p-[10px]`**, so the flat main background shows as a balanced **10 px ring on all four sides** around the raised popup. The raised card (`.glass-clay-surface` in `MainPopup.tsx`) is **`w-[460px] h-[560px]`** (width only; height and all styling classes unchanged). The +20 px height funds the vertical ring, so the inner content height stays at the verified 520 px and the footer keeps its full room.
- Recorded as an adjustment to ADR-002 Amendment 3 in `docs/project-knowledge/DECISIONS.md`; changelog entry in `reports/DOCUMENTATION_CHANGELOG.md`; BACKLOG row `UI-WINDOW-LOCK-02`.

### Verification `[COMMAND-VERIFIED]` `[RUNTIME-VERIFIED]`
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; zip refreshed via the documented `Compress-Archive` fallback (117,669 bytes); dist spot-checks: `width:480px;height:580px`, `FIXED_WINDOW_HEIGHT = 580`, card chunk `w-[460px] h-[560px]`.
- Dev-server runtime at exactly 480 × 580 (Playwright computed geometry): background `padding: 10px`; card 460 × 560 at (10,10); **ring 10/10/10/10 in both docked and floating modes**; card radius/background/blur/shadow unchanged; footer fully inside (20 px margin); list scrolls internally (529 > 311); no horizontal/vertical document overflow; console clean except the pre-existing favicon 404.
- Real-Chrome behavior (580 px window, snap-back, and the visual 3D appearance in the loaded extension) remains `[UNKNOWN]` — see the manual-test list above, with 580 replacing 560.

---

## Addendum — UI-WINDOW-LOCK-03 (2026-10-16): Fixed 480 × 600 Window with Exactly 25px Outer Padding

Follow-up user-directed adjustment; the body of this HANDOFF and the UI-WINDOW-LOCK-02 addendum remain accurate as history.

### Changes `[SOURCE-VERIFIED]`
- Fixed viewport: **480 × 600 px** (was 480 × 580) — `popup.html` inline style, `src/popup.tsx` inline sizing, `FIXED_WINDOW_HEIGHT = 600` in `public/service-worker.js` (create + exact two-way `onBoundsChanged` clamp). Width and the soft-lock mechanism unchanged.
- Outer padding: the `src/popup.tsx` background root now carries **exactly `p-[25px]`**, so the flat main background shows as an exact **25 px ring on all four sides** around the raised popup. The raised card (`.glass-clay-surface` in `MainPopup.tsx`) is **`w-[430px] h-[550px]`** — precisely the specified inner area (480 − 2×25 × 600 − 2×25). Dimensions only; all styling classes unchanged.
- Recorded as an adjustment to ADR-002 Amendment 3 in `docs/project-knowledge/DECISIONS.md`; changelog entry in `reports/DOCUMENTATION_CHANGELOG.md`; BACKLOG row `UI-WINDOW-LOCK-03`.

### Verification `[COMMAND-VERIFIED]` `[RUNTIME-VERIFIED]`
- `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; zip refreshed via the documented `Compress-Archive` fallback (117,711 bytes); dist spot-checks: `width:480px;height:600px`, `FIXED_WINDOW_HEIGHT = 600`, card chunk `w-[430px] h-[550px]`, `p-[25px]` utility present.
- Dev-server runtime at exactly 480 × 600 (Playwright computed geometry): background `padding: 25px`; card 430 × 550 at (25,25); **ring exactly 25/25/25/25 in both docked and floating modes**; card radius/background/blur/shadow unchanged; header, list, and footer all contained; footer fully inside (20 px margin) with no overlap against the list (footer top ≥ list bottom); list scrolls internally (529 > 301); no horizontal/vertical document overflow; console clean except the pre-existing favicon 404.
- Real-Chrome behavior (600 px window, snap-back, and the visual 3D appearance in the loaded extension) remains `[UNKNOWN]` — see the manual-test list above, with 600 replacing 580.

---

## Addendum — UI-WINDOW-LOCK-04 (2026-10-16): Synchronize Floating Browser Window with the 480 × 600 Background Layout (Frame Compensation)

Bug-fix adjustment; the body of this HANDOFF and the earlier addenda remain accurate as history.

### Root Cause `[SOURCE-VERIFIED]`
`chrome.windows.create/update` interpret `width`/`height` as the **outer window size including the browser frame** (caption bar + borders), and `onBoundsChanged` reports outer bounds as well. The layout (`popup.html` / `popup.tsx` / background root) requires a **480 × 600 content viewport**. Creating and clamping at exactly 480 × 600 outer therefore yields a smaller content area on real Chrome and clips the fixed canvas at the bottom (footer) — the reported "background extends beyond the visible window" symptom. The dev-server verification could not catch this because Playwright sets the content viewport directly; the defect only manifests in the real extension window.

### Fix (closest supported behavior — `chrome.windows` has no content-size API) `[SOURCE-VERIFIED]`
- `src/popup.tsx`: floating mode reports the measured frame delta once on load — `CALIBRATE_FLOATING_FRAME` `{ width: outerWidth − innerWidth, height: outerHeight − innerHeight }` (web-demo safe: skipped when `chrome.runtime` is absent).
- `public/service-worker.js`: `FIXED_WINDOW_WIDTH/HEIGHT` documented as the required content viewport (480 × 600); `floatingFrameDelta` cached in `storage.session` (sanity 0–200 px/axis) with module-state hydration; `createNewFloatingWindow` creates at `compensatedOuterSize()` = layout + delta; the new calibration handler caches the delta and resizes the window once; the `onBoundsChanged` soft lock enforces the **compensated outer size** (locking the raw 480 × 600 outer would snap the compensation back and re-clip the content).
- Behavior: content viewport is the fixed 480 × 600 (25 px ring, 430 × 550 raised popup); first-ever open may snap once to the compensated size; the docked action popup is unaffected (content-sized by Chrome); no new permissions, no architecture change, layout/design values untouched.

### Verification `[COMMAND-VERIFIED]` `[RUNTIME-VERIFIED]`
- `node --check public/service-worker.js` → exit 0; `npm.cmd run lint` → 0 errors; `npm.cmd run build` → vite success; zip refreshed via the documented `Compress-Archive` fallback (118,818 bytes); dist spot-checks: `CALIBRATE_FLOATING_FRAME` handler + `compensatedOuterSize` in `dist/service-worker.js`, calibration sender in the built popup chunk.
- Dev-server regression at exactly 480 × 600 (Playwright computed geometry, docked and floating): layout pixel-identical to the LOCK-03 state — background `padding: 25px`, card 430 × 550 at (25,25), ring exactly 25/25/25/25, footer fully inside, list scrolls internally, no document overflow; console clean except the pre-existing favicon 404 (calibration send safely skipped outside the extension).
- Real-Chrome frame behavior remains `[UNKNOWN]` — manual checks: (1) open the floating window in the loaded extension → full background and footer visible, no bottom clipping; (2) attempt a resize → snap-back to the compensated size; (3) close/reopen → position restored at the compensated size; (4) delta values are platform/theme dependent and cannot be asserted here.
