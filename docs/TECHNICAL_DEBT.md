# Technical Debt Inventory

Documented during the V1 documentation audit (2026-10-20). **Nothing here was changed** — per task scope, code-level debt is recorded, not fixed.

## Repository hygiene

1. **Template leftovers at root**: `index-1.html`, `manifest-1.json`, `popup-1.html`, `settings-1.html`, `service-worker-1.js`, stray `200`/`350` files, `Snippet-Organizer-project.zip`, `bun.lock`, `metadata.json` (AI Studio metadata), `PROJECT_BRIEF.md` (duplicate of `docs/project-knowledge/PROJECT_BRIEF.md`), `snippet-organizer-document/`, `docs/engineering-knowledge/`. Root README already marks `*-1.*` as legacy; full cleanup needs an approved task (deleting files is outside this audit's scope). Also `Bilingual-Voice/`, `CLAUDE.md`, `MCP/`, `Skill/`, `default-workspace/` sit in the **parent** workspace, not this app.
2. **`package.json` name `react-example`** and unused template dependencies (`express`, `jszip`, `@google/genai`, `dotenv`, `motion`, `autoprefixer`, `esbuild`, and their type packages). Verify with a bundle/import audit before removal; none imported by `src/` today `[SOURCE-VERIFIED: import search]`.
3. **`scripts/pack-extension.js` python3 dependency** — replace with a Node-native zip (e.g. archiver-free implementation using existing deps) or ship a documented Python requirement. Workaround exists ([BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md)).
4. **No `test` script** — suites run via `npx.cmd tsx tests/*.test.ts`; a `test` script running all seven would reduce friction.

## Code-level

5. **`MainPopup.tsx` (~800 lines) / `SettingsView.tsx`** — state-dense monolith components; extract feature hooks/subcomponents opportunistically, with tests first (`popup-refresh` suite shows the seam pattern).
6. **`db.ts` (~1100 lines)** — repository + seeding + search + backup/restore in one module; candidates for splitting when DB v2 work starts.
7. **No IndexedDB migration framework** — DB version is pinned at 1; adding stores/indices later must introduce `onupgradeneeded` handling.
8. **Editor toolbar `no-scrollbar` rows** (`SnippetEditorModal.tsx:917,950`) — undefined class (classic scrollbars visible); same one-class fix as the dropdown (turn 18), left per scope lock.
9. **No React testing layer** — deliberate V1 decision; if V2 wants UI tests, add `@testing-library/react` + jsdom as an explicit, justified dependency decision.
10. **Root README/docs duplication risk** — `docs/README.md` is the index; keep `PROJECT_BRIEF.md` copies from diverging (root copy is legacy-labeled).

## Documentation-level

11. **Living logs vs. baseline** — `project-knowledge/ARCHITECTURE.md` is a chronological session log; the new `docs/ARCHITECTURE.md` is the stable overview. Future agents should update `docs/` first and append to the log second.

Each item lists where to start; none blocks V1 use. Prioritize 3–4 (developer friction) and 1 (repo hygiene before public push).
