# PROJECT_BRIEF.md — Snippet Organizer

**Current State Snapshot: 2026-10-15** `[SOURCE-VERIFIED]`

> **Canonical Knowledge Base**: For complete architecture, decisions, feature specs, and operating rules, see **[`docs/project-knowledge/README.md`](docs/project-knowledge/README.md)**. Current visual system: **locked Red Glass-Claymorphism** (ADR-009) — reference `docs/design/DESIGN_SYSTEM.md`.

---

## 1. What It Is

A personal snippet and productivity organizer distributed as a **Chrome Extension (Manifest V3, v0.1.0)**. Users store text snippets, organize them with custom categories, search them with priority ranking (Title > Content > Category), and copy formatted or plain text with one click. Both the docked popup and the detached floating window strictly maintain **712 × 512 px**.

---

## 2. Actual Capability Set `[SOURCE-VERIFIED]`

- **Docked Popup & Floating Window**: Identical **712 × 512 px** viewport across both modes; detached via header pin control and coordinated by background `service-worker.js`.
- **Snippet Library**: Fast debounced search (150ms), keyboard navigation (`Ctrl+K`, arrows, enter), static golden favorite star indicators on overview cards.
- **Search Ranking**: Canonical hierarchy: Title matches > Content matches > Category matches. Ties preserve original order.
- **Filter Row**: "All", "Favorites" (with gold star), and "All Categories" dropdown picker.
- **Add/Edit Snippet Editor**: Rich-text HTML formatting toolbar, category selector with 8-color palette, Duplicate, and Delete actions.
- **Snippet Preview**: Full HTML modal inspection with quick copy and favorite toggle.
- **Trash & Recovery**: 3-day (72-hour) retention window under Settings with expiration badges, single restore, restore all, delete forever, and empty trash.
- **Settings View**: Both an in-popup modal and a standalone options tab (`settings.html`).
- **Persistence**: Client-side **IndexedDB** (`snippet-organizer` v1) with write-through settings mirroring to `chrome.storage.local`.
- **Backup & Migration**: Full JSON export, import, and factory reset under Settings > Backup & Data.
- **Web Demo Landing Page**: Standalone preview (`index.html`) with interactive floating simulation and extension zip download.

---

## 3. Technical Shape & Source Code Location

- **TypeScript Source**: Located in `src/` (`src/components/`, `src/db.ts`, `src/types.ts`, `src/popup.tsx`, `src/settings.tsx`, `src/App.tsx`).
- **Framework & Tooling**: React 19.0.1, Tailwind CSS v4.3.3, Lucide icons, Vite 8.3.0.
- **Build & Packaging**: `npm run build` bundles code into `dist/` and runs `scripts/pack-extension.js` to produce `snippet-organizer-extension.zip`.
- **Permissions**: `storage`, `identity` in Manifest V3. No external network/host permissions; fully offline.

---

## 4. Documentation Map

- **Master Agent Entry Point**: `docs/project-knowledge/README.md`
- **Architecture**: `docs/project-knowledge/ARCHITECTURE.md`
- **Features Inventory**: `docs/project-knowledge/FEATURES.md`
- **Architectural Decisions**: `docs/project-knowledge/DECISIONS.md`
- **Integrations & Permissions**: `docs/project-knowledge/INTEGRATIONS.md`
- **UI Elements Registry**: `docs/project-knowledge/UI_REGISTRY.md`
- **Task Backlog**: `docs/tasks/BACKLOG.md`
- **Changelog**: `reports/DOCUMENTATION_CHANGELOG.md`
