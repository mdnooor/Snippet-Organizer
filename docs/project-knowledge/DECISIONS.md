# Architectural Decisions — Snippet Organizer

**Snapshot Date: 2026-10-18** `[SOURCE-VERIFIED]`

This document records the approved architectural decisions (ADRs), user-confirmed constraints, and design rationale for Snippet Organizer.

---

## ADR Index

| ADR ID | Decision Title | Status | Date | Scope |
|---|---|---|---|---|
| **ADR-001** | Offline-First IndexedDB Persistence | CONFIRMED | 2026-02-27 | Storage architecture |
| **ADR-002** | Uniform Viewport for Docked & Floating Modes | CONFIRMED (amended 2026-10-16, UI-SPACING-01/02 + UI-WINDOW-LOCK-01/02/03/04) | 2026-10-13 | Viewport & window sizing — one fixed 480 × 600 px content viewport for both modes; raised popup inset on an exact 25 px flat-background ring; floating window outer size frame-compensated and size-locked by the service worker |
| **ADR-003** | Static Golden Star Favorite Indicator on Overview Cards | CONFIRMED | 2026-10-13 | UI / SnippetCard |
| **ADR-004** | Canonical Search Ranking Hierarchy (Title > Content > Category) | CONFIRMED | 2026-10-13 | Search algorithm |
| **ADR-005** | Removal of Redundant "Move Category" Button in Editor | CONFIRMED | 2026-10-12 | UI / SnippetEditorModal |
| **ADR-006** | Removal of Recent Filter Tab While Preserving Startup Preference | CONFIRMED | 2026-10-13 | Filter row & settings |
| **ADR-007** | 3-Day Retention Trash System Integrated into Settings | CONFIRMED | 2026-10-13 | Data lifecycle & settings |
| **ADR-008** | Dual Presentation for Settings (Modal & Full Options Tab) | CONFIRMED | 2026-02-27 | Extension navigation |
| **ADR-009** | Adopt Locked Red Glass-Claymorphism Design System | CONFIRMED | 2026-10-15 | Visual design system |
| **ADR-010** | Per-User Google Drive appDataFolder Storage for Optional Cloud Backups | CONFIRMED | 2026-10-18 | Cloud storage location & identity model (Google Drive feature) |
| **ADR-011** | Versioned Cloud Snapshot Envelope v2 + Conflict Vocabulary (GD-01 Data Contract) | CONFIRMED | 2026-10-18 | Cloud backup data contract & restore semantics |
| **ADR-012** | Chrome Identity getAuthToken OAuth for drive.appdata (GD-02) | CONFIRMED | 2026-10-18 | Google OAuth mechanism, scope & token handling |

---

## Decision Records

### ADR-001: Offline-First IndexedDB Persistence
- **Status**: CONFIRMED `[SOURCE-VERIFIED]`
- **Context**: The extension requires fast, client-side structured storage capable of handling rich HTML text content, custom categories, usage timestamps, and soft-deletion tracking without external server latency.
- **Decision**: Use browser IndexedDB (`snippet-organizer` v1) as the primary data store with object stores for `snippets`, `categories`, and `preferences`. Synchronously mirror `preferences` to `chrome.storage.local.user_preferences` when the Chrome Extension API is available.
- **Consequences**: Zero cloud dependencies, complete user privacy, offline availability, fast instant query execution.

### ADR-002: Uniform 712 × 512 px Viewport for Docked & Floating Modes
- **Status**: CONFIRMED — amended 2026-10-16 (UI-SPACING-01, user-approved) `[SOURCE-VERIFIED]`
- **Context**: Previously, detaching the popup into a floating window caused the UI container to collapse from 712px to 460px wide, creating an inconsistent and cramped experience.
- **Decision**: Enforce identical target dimensions (**Width: 712 px, Height: 512 px**) across both modes. Apply this strictly in `popup.html`, `src/popup.tsx`, `MainPopup.tsx`, and in `chrome.windows.create` in `service-worker.js`.
- **Consequences**: The interface layout remains perfectly consistent when transitioning between the docked toolbar popup and the detached floating window.
- **Amendment (2026-10-16, UI-SPACING-01, user-approved)**: The *window canvas* for both modes is enlarged so the outer flat background shows a visible gap around the popup. The main popup surface itself remains **712 × 512 px** with unchanged styling; the spacing is applied only on the outer background root (`src/popup.tsx`). Updated locations: `popup.html` (inline `html, body` size), `src/popup.tsx` (JS-set sizes + background root), and `chrome.windows.create` in `service-worker.js`. `MainPopup.tsx` dimensions are unchanged.
- **Amendment 2 (2026-10-16, UI-SPACING-02, user-directed) — SUPERSEDED by Amendment 3**: A 30 px outer gap with a 772 × 572 responsive canvas and a max-only soft clamp. Superseded the same day by UI-WINDOW-LOCK-01; kept for history. See `docs/tasks/UI-SPACING-02/HANDOFF.md`.
- **Amendment 3 (2026-10-16, UI-WINDOW-LOCK-01, adjusted by UI-WINDOW-LOCK-02/03/04 same day)**: One **fixed application viewport for both modes** — the entire outer window. Final state (UI-WINDOW-LOCK-03/04): **480 × 600 px CONTENT viewport**, with the raised popup (`MainPopup`, `w-[430px] h-[550px]`) inset by an **exact 25 px flat-background ring on all four sides** (`p-[25px]` on the `popup.tsx` background root) so the layered 3D claymorphism look is clearly visible; the verified inner content height is 510 px with the footer fully visible. No responsive resizing: `popup.html` fixes `html, body { width: 480px; height: 600px }` in both modes, `src/popup.tsx` sets the same sizes unconditionally. **Fixed-size enforcement AND frame compensation (UI-WINDOW-LOCK-04)**: `chrome.windows.create/update` interpret `width`/`height` as the **outer window size including the browser frame** (caption bar + borders), and `onBoundsChanged` reports outer bounds too — a window created at exactly 480 × 600 outer shows less than 480 × 600 of content and clips the layout (footer). `chrome.windows` has no API to set content size directly and no `resizable` option (those belong to the separate Chrome-Apps `app.window` API), so the floating page reports its measured frame delta (`outerWidth/Height − innerWidth/Height`, message `CALIBRATE_FLOATING_FRAME`) once on load; the service worker sizes the outer window to **layout + delta**, caches the delta (`storage.session`, sanity-bounded 0–200 px per axis), and the `onBoundsChanged` soft lock enforces the **compensated outer size**. Consequences: the first-ever open may snap once to the compensated size; the delta magnitude is platform/theme dependent and is NOT verifiable without a real Chrome host `[UNKNOWN]`; in frameless contexts the delta is 0 and the logic degrades to the previous exact-size behavior. The docked action popup is content-sized by Chrome and is inherently not user-resizable. Overflow containment: the snippet list is the only scrollable region (`flex-1 min-h-0 overflow-y-auto`), keeping the footer pinned inside the viewport.

### ADR-003: Static Golden Star Favorite Indicator on Overview Cards
- **Status**: CONFIRMED `[SOURCE-VERIFIED]`
- **Context**: The interactive favorite button had been removed from the main snippet overview cards to reduce accidental clicks, but users needed a way to identify favorited snippets at a glance.
- **Decision**: Add a static, non-interactive golden star indicator in the top-right corner of snippet cards (`SnippetCard.tsx`) where `snippet.isFavorite === true`. The indicator uses `pointer-events-none` and amber-400 styling. Interactive favorite toggling remains available in the three-dot overflow menu, the Snippet Editor, and the Preview modal.
- **Consequences**: Fast visual recognition with zero accidental click actions on the overview list.

### ADR-004: Canonical Search Ranking Hierarchy (Title > Content > Category)
- **Status**: CONFIRMED `[SOURCE-VERIFIED]`
- **Context**: Search results previously combined candidate matches without priority tier sorting, causing recent Content-matching snippets to rank higher than Title-matching snippets.
- **Decision**: Implement `filterAndRankSnippets` in `src/db.ts` enforcing a strict priority hierarchy:
  1. Title match (Exact = 10, Prefix = 11, Substring = 12)
  2. Content match (Exact = 20, Prefix = 21, Substring = 22)
  3. Category match (Exact = 30, Prefix = 31, Substring = 32)
  Ties preserve the original library order. Snippets matching multiple fields inherit the highest priority tier matched.
- **Consequences**: Predictable, intuitive search results matching user expectations.

### ADR-005: Removal of Redundant "Move Category" Button in Editor
- **Status**: CONFIRMED `[SOURCE-VERIFIED]`
- **Context**: `SnippetEditorModal.tsx` contained a primary Category Selector dropdown above the text area, as well as an auxiliary "Move to Category" button in the lower actions row, creating redundant UI controls.
- **Decision**: Remove the redundant auxiliary button from the lower actions row while keeping the primary category selector dropdown intact.
- **Consequences**: Cleaned up the lower actions toolbar to contain only Favorite, Duplicate, and Delete actions.

### ADR-006: Removal of Recent Filter Tab While Preserving Startup Preference
- **Status**: CONFIRMED `[SOURCE-VERIFIED]`
- **Context**: The filter row below the search bar contained four options ("All", "Favorites", "Recent", "All Categories"), which caused visual crowding.
- **Decision**: Remove the dedicated "Recent" tab button from the Main Popup filter row, leaving "All", "Favorites", and "All Categories". Preserve the underlying `recent` filter sorting and keep "Recent" available as an option in Settings > General > Default View.
- **Consequences**: The filter row is cleaner and easier to navigate while power users who want recent snippets on startup retain that capability.

### ADR-007: 3-Day Retention Trash System Integrated into Settings
- **Status**: CONFIRMED `[SOURCE-VERIFIED]`
- **Context**: Users could delete snippets using "Move to Trash", but there was no visible recovery interface to find, restore, or permanently delete items.
- **Decision**: Implement a dedicated "Trash" section under Settings with a 3-day (72-hour) retention window. Support individual snippet restore, restore all, individual permanent delete, and empty trash. Trashed snippets that are restored when their original category no longer exists fall back to `'default'`. Expired items are automatically purged.
- **Consequences**: Protects against accidental data loss with a clear recovery interface.

### ADR-008: Dual Presentation for Settings (Modal & Full Options Tab)
- **Status**: CONFIRMED `[SOURCE-VERIFIED]`
- **Context**: Users need quick access to settings directly within the popup without losing their place, as well as full-screen options management via Chrome's native extension options.
- **Decision**: Maintain both `SettingsModal.tsx` (rendered as an overlay within `MainPopup.tsx`) and `src/settings.tsx` (rendered via `settings.html` configured in `manifest.json` under `options_ui.open_in_tab: true`), both sharing the identical underlying `SettingsView.tsx` component.
- **Consequences**: Consistent settings UI across both embedded and standalone browser contexts with zero code duplication.

### ADR-009: Adopt Locked Red Glass-Claymorphism Design System
- **Status**: CONFIRMED `[SOURCE-VERIFIED]`
- **Context**: The UI evolved through four visual eras (white/blue glass → soft neumorphism → indigo claymorphism → clay material correction). The user then approved a **locked** Red Glass-Claymorphism specification with exact CSS values (global red gradient, glass-clay surface, clay button base/hover, permanent inset fields, decorative clay element) and required that the locked values be preserved verbatim across the entire UI without functional, structural, or layout changes.
- **Decision**: Implement the locked specification as the single current visual system, centralized in `src/index.css`. Locked values are preserved exactly in `.glass-app-bg`, `.glass-clay-surface`, `.clay-btn`/`.nm-primary-raised`, `.glass-inset`/`.nm-static-inset-field`/`.nm-static-inset-editor`, and `.nm-logo-raised`/`.clay-decor`. The legacy `nm-*` class-name API is retained so handlers and documentation keep stable hooks. Canonical reference: `docs/design/DESIGN_SYSTEM.md` (Sections 2–4).
- **Scope & constraints**: Visual-only. 712 × 512 px viewport, DOM structure, handlers, data models, storage, search/filtering, settings behavior, manifest, and permissions unchanged. The 8 category swatch colors and success/warning/info/danger semantics are explicitly preserved. Documented exceptions (scaled shadows on compact controls and dense lists, additive button text-shadow, additive focus outline, `.nm-inset` component-supplied radius) are recorded in `DESIGN_SYSTEM.md` Section 9 and require the same approval level as the locked values to change.
- **Alternatives considered**: None recorded in project history for this era; the locked specification was provided directly by the user as an approved design (no formal alternatives evaluation took place).
- **Consequences**: Future UI work must reuse the documented classes, keep reference duplicates (`.clay-btn`/`.clay-decor` vs `.nm-primary-raised`/`.nm-logo-raised`) in sync, and re-verify both web-demo and extension-runtime rendering after any styling change. Residual blue semantic/legacy accents are tracked in `DESIGN_SYSTEM.md` Section 9.6 pending a product decision.

### ADR-010: Per-User Google Drive appDataFolder Storage for Optional Cloud Backups
- **Status**: CONFIRMED (final user decisions D1 + D3, 2026-10-18) `[SOURCE-VERIFIED]`
- **Context**: GD-00 audit established the extension is local-only; the product requirement is a universal, multi-user extension where every individual user connects their own Google account, with no developer account, token, or credential ever embedded or shared as the product identity. The OAuth mechanism and Google Cloud configuration were explicitly deferred to GD-02.
- **Decision**: Optional cloud backups are stored in each user's own Google Drive **appDataFolder** via the `drive.appdata` scope. The extension acts solely as an OAuth **client application**: each user independently authorizes their own account at runtime, and per-user data isolation is inherent to appDataFolder (each authorization reaches only that user's folder). Developer-owned OAuth Client ID, extension ID, redirect URI, Cloud project, and consent-screen branding are **application configuration identifying the app, never a user identity**; no `client_secret` may ship in the extension bundle; tokens never enter code, logs, or non-session storage; developer accounts are used only for explicitly authorized testing.
- **Alternatives considered**: `drive.file` (user-visible, per-file scope) — rejected for v1: larger visible surface with no benefit for app-private backups; documented as the fallback if user-visible backup files are ever required (would need new consent). `getAuthToken` vs `launchWebAuthFlow` mechanics and the Cloud/consent setup are GD-02 decisions, verified against official Google/Chrome documentation before implementation.
- **Consequences**: Supersedes ADR-001's "zero cloud dependencies" consequence **for this explicit, optional surface only** — local-first storage (ADR-001), offline behavior, and the no-telemetry posture are unchanged. Backups are invisible in the user's Drive UI: recovery runs through the app, and the existing local JSON export remains the user-visible escape hatch. `identity` permission (shipping manifest `public/manifest.json`) is added at GD-02.

### ADR-011: Versioned Cloud Snapshot Envelope v2 + Conflict Vocabulary (GD-01 Data Contract)
- **Status**: CONFIRMED (final user decisions D4 + D5 + D6, 2026-10-18) `[SOURCE-VERIFIED]`
- **Context**: GD-01 data-contract task. Audit evidence: trash tombstone `deletedAt` with 72 h purge; `version`/`updatedAt` bump on usage (copy) and import (`db.ts:414-434`, `:954`) — not safe as change markers; local merge import silently overwrites same-id records (`db.ts:946-957`); no change log exists in IndexedDB.
- **Decision**: Adopt the cloud snapshot contract specified **canonically in `docs/google-drive-integration/data-contract.md`** (single source; not duplicated here): v2 envelope around a BackupData-v1-shaped payload; full-fidelity snapshots including trash tombstones; UTC-based naming; SHA-256 canonical-JSON payload digest (corruption detection **only** — no authenticity claim); deterministic application-level `backupId` distinct from Drive file IDs; version policy (2 = current; newer rejected, never best-effort parsed; bare v1 files migrate on read with importer-matching leniency; envelope-strict / record-quarantine); record identity = `id` with a deterministic content hash over {title (trimmed), content (verbatim), categoryId, isFavorite} excluding volatile fields (`createdAt`, `updatedAt`, `lastUsedAt`, `version`, `deletedAt`); explicit conflict vocabulary (add / unchanged / content-conflict / deletion-state-conflict / same-name-different-id / duplicate-id-in-snapshot / missing-category) resolved preview-first with per-record choices keep-local (default) / take-incoming / keep-both (re-id) — never silently overwriting, never newest-timestamp-wins; v1 sync scope = explicit user-initiated upload / browse / download / preview / restore only, with automatic background sync deferred unless separately approved.
- **Alternatives considered**: naive `updatedAt`-wins merge — rejected (timestamps are not edit markers per the audit evidence); a parallel non-v1 payload format — rejected (spec requires reusing the current format, so the v2 envelope wraps the existing v1 payload).
- **Consequences**: Local file export/import behavior is unchanged; the contract module (`src/gdrive/{types,snapshot,conflict}.ts`) is pure and dependency-free (tested 27/27 via `node:test` through the existing `tsx` devDependency, lint clean `[COMMAND-VERIFIED]`); restore execution (single transaction + mandatory pre-restore safety snapshot) is GD-05; a future delta-sync would require an app-level change-log store — a new architectural component that must be proposed and approved before any sync work.

### ADR-012: Chrome Identity getAuthToken OAuth for drive.appdata (GD-02)
- **Status**: CONFIRMED (2026-10-18 — user-delegated selection per GD-02 Phase 1: "least-privilege approach that is officially supported", no user decision required) `[SOURCE-VERIFIED]`
- **Context**: GD-02 required verifying official Google/Chrome documentation and selecting the OAuth mechanism for the extension. Live verification (2026-10-18, canonical record `docs/google-drive-integration/oauth-contract.md`): the identity API requires the `identity` permission and reads the manifest `oauth2` key (`client_id` + `scopes`); Chrome's in-memory token cache "automatically handles expiration"; `launchWebAuthFlow` is documented for **non-Google** providers; `drive.appdata` is an official **non-sensitive** scope ("View and manage the app's own configuration data in your Google Drive") — correcting GD-01's unverified sensitive-scope assumption; OAuth clients of application type "Chrome Extension" bind to the extension ID (Item ID) and need no client secret.
- **Decision**: Use `chrome.identity.getAuthToken` with a manifest `oauth2` block declaring **exactly** `https://www.googleapis.com/auth/drive.appdata` (per-call scope override also enforced in code). Tokens are never persisted, logged, or rendered — Chrome's cache serves reuse and expiration; invalid tokens go through `removeCachedAuthToken` (GD-03). In-app sign-out uses `clearAllCachedAuthTokens`; full revocation is a user account action at the Google Account permissions page. Interactive prompts occur only from explicit user-initiated UI (official UX rule). The shipping manifest carries the officially-documented placeholder client ID until the publisher supplies their own "Chrome Extension"-type OAuth client bound to a stable extension ID (manifest `key`, user-owned — never fabricated by agents).
- **Alternatives considered**: `launchWebAuthFlow` — rejected (built for non-Google identity providers; would hand-roll account/consent UI, redirect handling to `https://<app-id>.chromiumapp.org/*`, and token lifecycle for a Google-only v1). `getProfileUserInfo`/`identity.email` — rejected (user email is not needed; least privilege).
- **Consequences**: `public/manifest.json` gains `identity` + `oauth2` (placeholder client ID; exact scope guarded by a regression test). Live authorization still requires user-owned configuration: stable extension ID (`key`), OAuth client ID, consent-screen/Audience setup with `drive.appdata` declared, Drive API enabled (setup steps in `oauth-contract.md` §6); until then authorization reports a typed `not-configured` state. Live `chrome.identity`/Google runtime behavior remains unverified `[UNKNOWN]` (GD-08 gate). Scope additions require amending this ADR.
