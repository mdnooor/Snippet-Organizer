# UI Components & Interaction Map

`[SOURCE-VERIFIED]` from `src/components/*`, `src/index.css`, `public/manifest.json` (2026-10-20). Visual system: locked **Red Glass-Claymorphism** (ADR-009) — canonical spec [`design/DESIGN_SYSTEM.md`](design/DESIGN_SYSTEM.md); screen registry [`design/SCREEN_REGISTRY.md`](design/SCREEN_REGISTRY.md).

## Windows & entries

- **Docked popup**: fixed outer 480×600 (ADR-002 Am. 3); content `w-[430px] h-[550px]` on a 25px ring. **Floating window**: same outer size, frame-compensated by the service worker (`CALIBRATE_FLOATING_FRAME`, `onBoundsChanged` soft lock). Opened by toolbar action or `toggle-organizer` (`Ctrl+Shift+X`).
- Entries: `popup.html`→`popup.tsx`→`App.tsx`; `settings.html`→`settings.tsx` (options page, `open_in_tab`); `index.html`→`main.tsx` (web demo, chrome stubbed).

## Components (`src/components/`)

| Component | Interaction | State/service calls | A11y notes |
|---|---|---|---|
| `MainPopup.tsx` | list, keyboard navigation (↑/↓/Enter/Esc via shortcuts prefs), bulk select, Refresh | epoch-guarded `loadData`; `createPopupRefresh` (`popupRefresh.ts`); silent probe `runPopupProbe` | list region `aria-busy` while refreshing |
| `SearchAndFilters.tsx` | search input (debounced), Favorites toggle, category tab row (All/Favorites/All Categories/per-category), dropdown portal | filter state lifted to MainPopup | tab row `role="tablist"`; dropdown `role="menu"`; shared `.nm-scrollbar` on both scroll containers |
| `SnippetCard.tsx` | copy button, favorite star, bulk checkbox, click → preview | `handleCopy` (toast + `lastUsedAt`), `db.ts` writes via callbacks | button labels; focus states |
| `SnippetEditorModal.tsx` | create/edit, rich content, category select, favorite | `db.ts` save; unsaved-change guard | modal focus handling; labeled inputs |
| `SnippetPreviewModal.tsx` | read-only preview | — | scrollable content uses `.nm-scrollbar` |
| `SettingsModal.tsx` / `SettingsView.tsx` | tabs: General (preferences), Shortcuts (rebind capture: "Press keys… (Esc cancels)"), Google Drive (Connect/Disconnect, snapshot create/list/download/delete/restore + conflict preview), Trash | `db.ts` + `gdrive/*`; real `preferences.uiShortcuts` persisted | vertical shortcut rows (wrap-friendly badges); shortcut row labels |
| `Footer.tsx` | connection status + attribution | receives `driveStatus`; "Developed by AKASH" | `role="status"`; Drive logo `aria-hidden`; states: connected (static logo + label), checking (pulse — real probe only), disconnected (neutral dot) |
| `Header.tsx` | title bar, floating/docked aware | — | — |
| `GoogleDriveLogo.tsx` | official Drive triangle (inline SVG) | — | decorative; label carries meaning |

## Shared styling

All styling flows from `src/index.css` (both `popup.tsx` and `settings.tsx` import it). `nm-*` class API is locked (ADR-009). Scrollbars: `.nm-scrollbar` (thin brand-red, token-based `--red-scrollbar-thumb/-hover`) applied per container — 10 containers incl. the category dropdown (turn 18). Reduced motion is globally honored (`prefers-reduced-motion` freezes animations).

## Refresh semantics (turn 17/18)

Button always rendered (never gated on Drive state); click → immediate spin + content fade; local IndexedDB reload and silent probe run concurrently; feedback floor 450 ms; ends on settle or failure; no OAuth prompt from this path; disconnect intent untouched. Pinned by `tests/popup-refresh.test.ts` (8).

## Known UI limitations

Fixed-size windows (no responsiveness by design); TSX rendering has no automated tests (manual verification only); footer shows no account identity (Settings does).
