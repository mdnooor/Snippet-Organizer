# Project Brief — Snippet Organizer

**Current State Snapshot: 2026-10-15** `[SOURCE-VERIFIED]`

---

## 1. Project Identity & Purpose

**Snippet Organizer** is a local-first, privacy-focused productivity Chrome Extension (Manifest V3, v0.1.0) `[SOURCE-VERIFIED]`. It provides users with instant access to frequently used text snippets, canned responses, code fragments, and templates with quick multi-field search, customizable category tags, rich-text formatting, and one-click clipboard copying.

### Target Users
- Customer support representatives handling repetitive responses.
- Developers and technical writers storing code snippets and shell commands.
- Knowledge workers needing quick access to email templates, links, and markdown notes.

---

## 2. Core Requirements & Scope Boundaries

### Confirmed In-Scope Capabilities `[SOURCE-VERIFIED]`
1. **Docked Popup & Detached Floating Window**: Seamless access via the Chrome toolbar popup icon or detached into an independent floating window via the header pin control; both modes share one **fixed 480 × 600 px application viewport** (the entire outer window) with an identical layout — the raised 430 × 550 popup card sits inset on an exact 25 px flat-background ring on all four sides (layered 3D claymorphism look), the snippet list scrolls internally, and the footer stays pinned at the bottom (ADR-002 Amendment 3, UI-WINDOW-LOCK-01/02/03, 2026-10-16). The floating window is held at exactly 480 × 600 by the service worker (soft lock; `chrome.windows` has no `resizable` option); the docked action popup is content-sized and not user-resizable.
2. **Library Management & Fast Search**: Multi-field search (debounced 150ms) matching Title, Content, and Category with strict priority tier ranking (**Title > Content > Category**).
3. **Filter Row**: Quick tabs for "All", "Favorites" (with golden star indicator), and an "All Categories" dropdown picker. (Recent filter tab removed per confirmed user decision, while startup view preference remains preserved).
4. **Rich-Text Snippet Editor**: Full HTML formatting toolbar (Bold, Italic, Strikethrough, Code, Link, Lists, Blockquote, Clear Formatting) with character count, category picker with color palette, Duplicate, and Delete actions.
5. **Trash & Recovery System**: Deleted snippets are soft-deleted into a visible Trash management section under Settings with a 3-day (72-hour) retention countdown, individual restore, restore all, permanent deletion, and empty trash.
6. **Local Persistence**: Offline-first storage using client-side IndexedDB (`snippet-organizer` v1) with write-through settings backup to `chrome.storage.local`.
7. **Import / Export**: Full JSON backup export and import for data migration and backup restoration.
8. **Web Demo Landing Page**: Standalone responsive web preview (`index.html` / `App.tsx`) providing an interactive simulation of the extension with draggable floating window support and extension zip archive download.
9. **Optional Google Drive Backup** (GD-01–GD-07, 2026-10-18; `implemented-unverified`): explicit user-initiated snapshot backup/restore into the user's **own** Google Drive `appDataFolder` (`chrome.identity.getAuthToken`, scope exactly `drive.appdata`, user-owned OAuth client per D1/D2; canonical contracts in `docs/google-drive-integration/`). Create (additive, never overwrites), browse/download, cloud-only delete, and safety-checkpointed restore with explicit Merge/Replace confirmation (D7). **No synchronization**: GD-06 is `blocked` (cross-device deletion detection and change ordering are unsupported by the data model; the change-log proposal sits unapproved in data-contract §17) — the UI contains no sync controls and advertises none.

### Explicit Scope Exclusions & Prohibitions
- **No Remote Telemetry or Tracking**: No third-party analytics, user tracking, or data harvesting `[SOURCE-VERIFIED]`.
- **No Cloud/Backend Requirement**: The application requires zero backend servers; all core features execute within the browser sandbox `[SOURCE-VERIFIED]`.
- **Zero AI Slop / Unrequested Chatbots**: No LLM chat widgets, assistant sidebars, or unrequested AI dependencies `[SOURCE-VERIFIED]`.

---

## 3. Technology Stack & Verification Commands

| Layer | Technology | Version / Configuration | Evidence |
|---|---|---|---|
| **Runtime / Platform** | Chrome Extension MV3 | Manifest Version 3 | `manifest.json` `[SOURCE-VERIFIED]` |
| **Language** | TypeScript | v7.0.2 (`tsc --noEmit`) | `package.json` `[SOURCE-VERIFIED]` |
| **UI Framework** | React | v19.0.1 (SPA on Vite) | `package.json` `[SOURCE-VERIFIED]` |
| **Styling** | Tailwind CSS | v4.3.3 (`@import "tailwindcss";`) | `src/index.css` `[SOURCE-VERIFIED]` |
| **Bundler / Build** | Vite | v8.3.0 | `vite.config.ts` `[SOURCE-VERIFIED]` |
| **Icons** | Lucide React | v0.546.0 | `package.json` `[SOURCE-VERIFIED]` |
| **Persistence** | Browser IndexedDB | Database `snippet-organizer` v1 | `src/db.ts` `[SOURCE-VERIFIED]` |
| **Extension Storage** | Chrome Storage API | `chrome.storage.local` | `service-worker.js` `[SOURCE-VERIFIED]` |

### Authoritative Verification Commands `[COMMAND-VERIFIED]`
- **Type Checking / Linting**: `npm run lint` (executes `tsc --noEmit` — 0 errors)
- **Applet Compilation**: `compile_applet` (AI Studio compilation tool — PASSED)
- **Production Build & Packaging**: `npm run build` (executes `vite build && node scripts/pack-extension.js` — produces `dist/` and syncs `dist/snippet-organizer-extension.zip` and `public/snippet-organizer-extension.zip`)
- **Development Server**: `npm run dev` (runs Vite dev server on port 3000)

---

## 4. Current State & Known Limitations

- **Current Status**: Production-ready, fully functional extension and web demo `[SOURCE-VERIFIED]`.
- **Current Visual Design**: Locked **Red Glass-Claymorphism** system (ADR-009), centralized in `src/index.css`; canonical reference `docs/design/DESIGN_SYSTEM.md`. Runtime-verified via dev-server screenshots; the packaged extension runtime (docked/floating) was NOT re-verified in the audit environment `[RUNTIME-VERIFIED]` / `[UNKNOWN]`.
- **Packaging**: Extension zip archives are generated at `public/snippet-organizer-extension.zip` and `dist/snippet-organizer-extension.zip`. Environment note: `scripts/pack-extension.js` requires `python3` (absent in the current environment); equivalent manual fallback is `npx vite build` + `Compress-Archive` of `dist/*` `[COMMAND-VERIFIED]`.
- **Known Environmental Limitations**:
  - In non-Chrome preview environments (such as the standard web container), `chrome.windows` and `chrome.storage` APIs are absent; the application falls back seamlessly to browser IndexedDB and in-memory window simulation in `App.tsx` `[SOURCE-VERIFIED]`.
  - Rich text formatting uses standard browser DOM selection and `document.execCommand` formatting APIs; custom complex nested tables or embedded media are intentionally unsupported `[SOURCE-VERIFIED]`.
  - **Google Drive backup remains pre-production** `[SOURCE-VERIFIED]`: `public/manifest.json` still carries the documented placeholder OAuth client ID and has **no pinned `key`** (stable extension ID unpinned), and no user-owned Google Cloud project/OAuth client has been verified — real `chrome.identity`/Drive behavior is therefore unverified (GD-08; setup steps in `oauth-contract.md` §6). All Drive logic is exercised only by stubbed unit tests (118 module assertions), never against live services.
