# Task Handoff: UI-CLAY-03 & Project State — Start Here for a Fresh Session

**Date**: 2026-10-15
**Audience**: A coding agent with no prior conversation context.

---

## 1. Current Project State

- **Snippet Organizer** is a Chrome MV3 extension (React 19 + TypeScript + Vite 8 + Tailwind v4) with an offline IndexedDB store, priority-ranked search, rich-text editor, trash/restore, settings, and a web demo page. All features are implemented and previously verified (see `docs/tasks/BACKLOG.md`).
- The UI runs the **locked Red Glass-Claymorphism** design system (task UI-CLAY-03, decision **ADR-009**). Locked CSS values are preserved verbatim in `src/index.css`; do not alter them without explicit user approval.
- Build state at handoff: `npm run lint` 0 errors; `npx vite build` success; `public/snippet-organizer-extension.zip` repackaged from the current `dist/`.

## 2. What to Read First (in order)

1. `AGENTS.md` (root) — non-negotiable rules.
2. `docs/project-knowledge/README.md` — reading order + maintenance contract + documentation caveats.
3. `docs/project-knowledge/PROJECT_BRIEF.md` → `DECISIONS.md` (esp. ADR-009) → `ARCHITECTURE.md` (incl. §7 Styling Architecture).
4. `docs/design/DESIGN_SYSTEM.md` — canonical locked spec, actual selectors, component map, state matrix, **Section 9 exceptions**.
5. `docs/project-knowledge/UI_REGISTRY.md` — §7 maps every surface to its treatment and verification status.
6. `docs/tasks/BACKLOG.md` + this folder's `SPEC.md`.

## 3. Where Things Live

| Need | Location |
|---|---|
| All styling (locked values + variants) | `src/index.css` (Tailwind v4 import first; custom classes unlayered) |
| Global background application | `src/popup.tsx:61`, `src/settings.tsx:8`, `src/App.tsx:197` (`.glass-app-bg`) |
| Main surfaces | `MainPopup.tsx:298`, `SnippetEditorModal.tsx:711`, `SnippetPreviewModal.tsx:39`, `SettingsModal.tsx:22`, `settings.tsx:16`, `App.tsx:345` (`.glass-clay-surface`) |
| Settings sections (6 menus) | `src/components/SettingsView.tsx` (`.nm-static-inset-section` + variants) |
| Class↔component mapping | `docs/design/DESIGN_SYSTEM.md` §5 and `docs/project-knowledge/UI_REGISTRY.md` §7 |

## 4. Scope Restrictions

- Never change locked values (DESIGN_SYSTEM §2), the `nm-*` class-name API, 712 × 512 px viewport, category swatch colors, or semantic hues without explicit approval.
- Reference duplicates must stay in sync: `.clay-btn` ≡ `.nm-primary-raised`, `.clay-decor` ≡ `.nm-logo-raised`.
- Documentation-only tasks must not touch `src/`.

## 5. Known Deviations & Open Items

1. **Residual blue accents** needing a product decision (do not fix silently): `Footer.tsx:19` (sync icon), `App.tsx:315` (floating ring), `App.tsx:374` (link), `SettingsView.tsx:354` (import spinner) — full list with semantic-vs-theme classification in `DESIGN_SYSTEM.md` §9.6.
2. **Extension-host runtime not re-verified** for the new skin (dev-server screenshots only). Load unpacked from `dist/` to verify docked popup, floating window, options tab.
3. `.nm-inset` (Settings nav) uses component radius `rounded-xl` (12px), not the locked 15px — documented exception, or fix with approval.
4. Repo hygiene (needs separate approved task): root legacy files `*-1.*`, `200`, `350`; stale archive `snippet-organizer-document/`.
5. `scripts/pack-extension.js` requires `python3` (absent here); package via `npx vite build` + `Compress-Archive dist/* public/snippet-organizer-extension.zip`.

## 6. Required Verification Steps for Any UI Change

1. `npm run lint` (`tsc --noEmit`) → 0 errors.
2. `npx.cmd vite build` → success.
3. `npm.cmd run dev` (port 3000) → verify `http://localhost:3000/` (web demo) **and** `http://localhost:3000/settings.html`: check normal, hover, focus, selected, disabled states and background coverage.
4. Record exactly what you verified and what you did not; tag evidence per the status model in `docs/project-knowledge/README.md` §3.
5. Note: `npm.ps1` is blocked by execution policy on this machine — use `npm.cmd`.

## 7. How to Report Completion

1. Update the affected canonical docs (`docs/project-knowledge/*`, `docs/design/DESIGN_SYSTEM.md` if styling changed).
2. Add the task row to `docs/tasks/BACKLOG.md` and create `docs/tasks/<TASK-ID>/SPEC.md` + `HANDOFF.md`.
3. Append an evidence-tagged entry to `reports/DOCUMENTATION_CHANGELOG.md`.
4. Mark tasks `VERIFIED` only with real command/runtime output; `ACCEPTED` only after explicit user sign-off.
