# UI-SPACING-01 — 10 px Outer Flat-Background Gap Around the Main Popup

**Status**: VERIFIED (static + dev-server runtime) · **Date**: 2026-10-16
**Scope class**: Layout spacing only — the protected main popup element is untouched.

---

## 1. Objective

Make the outer flat background surrounding the main popup visible as a 10 px gap on all four sides:
**flat background → 10 px gap → unchanged raised rounded popup** — without modifying the popup itself.

## 2. Constraint & User Decision

Pre-change runtime measurement `[RUNTIME-VERIFIED]`: the `.glass-app-bg` background root and the `.glass-clay-surface` popup were **both exactly 712 × 512 px at (0,0)** — gap 0 px on all sides (background visible only through the 26 px rounded corners). A visible 10 px gap around an unchanged 712 × 512 popup arithmetically requires a **732 × 532 px canvas** (712 + 2×10 × 512 + 2×10), which touches the ADR-002 viewport lock. Options were put to the user; **the user approved enlarging the canvas to 732 × 532 px** (popup element untouched). Recorded as an **ADR-002 amendment** in `docs/project-knowledge/DECISIONS.md`.

## 3. Implementation Map (pre-change)

| Element | Source | Pre-change geometry |
|---|---|---|
| Window canvas | `popup.html:8–12` inline style + `src/popup.tsx:51–56` (JS) ; `service-worker.js:255–256` (floating) | 712 × 512 |
| Outer flat background | `src/popup.tsx:61` — `.glass-app-bg w-[712px] h-[512px]` | 712 × 512 @ (0,0), padding 0 |
| Protected popup | `MainPopup.tsx:298` — `.glass-clay-surface w-[712px] h-[512px]` | 712 × 512 @ (0,0) — **unchanged** |

## 4. Changes Implemented `[SOURCE-VERIFIED]`

| File | Change |
|---|---|
| `popup.html` | Inline `html, body { width/height }`: 712×512 → **732×532** |
| `src/popup.tsx` | JS-set `documentElement`/`body` sizes: `'712px'/'512px'` → `'732px'/'532px'` |
| `src/popup.tsx:61` | Background root: `w-[712px] h-[512px]` → **`w-[732px] h-[532px] p-[10px]`** (the only "padding" in the task: exactly 10 px on the outer background root, creating the gap; comment added referencing this task) |
| `public/service-worker.js` | `chrome.windows.create` floating window: `width: 712, height: 512` → **`732, 532`** |

**Not changed**: `src/components/MainPopup.tsx` (popup classes, dimensions, padding, radius, shadows — byte-identical), `src/index.css` (all locked values), manifest, settings page, web demo (`App.tsx`), all components/behaviors.

## 5. Verification Evidence

### Static `[COMMAND-VERIFIED]`
- `npm.cmd run lint` (`tsc --noEmit`) → **0 errors**.
- `npm.cmd run build` → `vite build` **success (515 ms)**; packaging python3 limitation unchanged → documented `Compress-Archive` fallback applied; `public/snippet-organizer-extension.zip` + `dist/` copy refreshed (117,043 bytes).

### Runtime `[RUNTIME-VERIFIED]` (Vite dev server, `http://localhost:3000/popup.html`, Playwright computed geometry, 2026-10-16)
- Canvas/body: **732 × 532**, `overflow: hidden`.
- Flat background `.glass-app-bg`: rect (0,0) **732 × 532**, computed **`padding: 10px`**.
- Protected popup `.glass-clay-surface`: rect (10,10) **712 × 512** — classes, `border-radius: 26px`, `padding: 20px` (p-5), locked `rgba(255,255,255,0.2)` background, exact locked outer+inset shadows, `backdrop-filter: blur(5px)` all **identical to pre-change measurements**.
- **Measured gap: left 10 / top 10 / right 10 / bottom 10** — exactly the required visible spacing, outside the popup.
- No 20 px double-spacing: only the single background root carries the padding; no wrapper elements added.

## 6. Known Limitations
1. Extension-host runtime (docked toolbar popup / floating window) not re-verified in the actual Chrome host (dev-server evidence only); `chrome.windows.create` size change verified in source only.
2. The web demo (`App.tsx`) intentionally does not use the fixed canvas — the popup floats over the page there; unaffected.
3. Historical task records (UI-DIM-01/02, UI-CLAY-03, UI-NEUMORPH-01) intentionally still describe the 712 × 512-era viewport; current-state docs (ADR-002, README, AGENTS, ARCHITECTURE, PROJECT_BRIEF, FEATURES, INTEGRATIONS, UI_REGISTRY, SCREEN_REGISTRY, DESIGN_SYSTEM, INTERACTION_FLOWS) were updated.

## 7. Documentation Updated
`DECISIONS.md` (ADR-002 amendment + index row), `AGENTS.md` (viewport bullet), `docs/project-knowledge/README.md` §5.2, `ARCHITECTURE.md` (entry table, message protocol, HTML-level styling), `PROJECT_BRIEF.md`, `FEATURES.md`, `INTEGRATIONS.md`, `docs/design/DESIGN_SYSTEM.md` (§1 layout, §10.6), `docs/design/SCREEN_REGISTRY.md`, `docs/design/INTERACTION_FLOWS.md`, `docs/project-knowledge/UI_REGISTRY.md` §7, `docs/tasks/BACKLOG.md`, `reports/DOCUMENTATION_CHANGELOG.md`.
