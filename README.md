# Snippet Organizer

A local-first snippet manager for Chrome — search, organize, and paste your text snippets in seconds, with optional manual Google Drive backup.

**Snippet Organizer** is a Chrome Extension (Manifest V3) that lives in a fixed **480 × 600 px** popup which can detach into a floating window. It solves a simple, daily problem: the bits of text you retype over and over — code fragments, replies, templates, commands — scattered across notes and browser tabs. Snippet Organizer keeps them in one searchable, categorized, local-first place with one-click copying. **Version 1 is feature-complete and locally verified; it is not yet published on the Chrome Web Store.**

---

## Features

**Local (works offline, no account):**

- **Instant multi-field search** — debounced search across title, content, and category with deterministic ranking (Title → Content → Category), plus *All / Favorites / per-category* filtering via tabs or a dropdown.
- **Snippet management** — create and edit rich-text content, favorite (star) snippets, assign categories from a fixed 8-color palette, one-click **copy to clipboard** with feedback, automatic re-sorting by recent use.
- **Trash & recovery** — soft delete with a trash view, restore, and permanent delete.
- **Keyboard shortcuts** — a real, user-rebindable shortcut system (capture UI with Esc-cancel), persisted per user; global `Ctrl+Shift+X` toggles the floating window.
- **Two window modes** — a docked toolbar popup and a detachable floating window, both exactly 480 × 600 px (frame-compensated and size-locked by the service worker).
- **Always-visible Refresh** — reloads local data and (when applicable) silently checks the Drive connection, with single-flight protection and a connection-independent 450 ms feedback floor; it never triggers an OAuth prompt and never overrides an explicit disconnect.
- **Settings** — general preferences, shortcut rebinding, Google Drive account management, and trash, in a dedicated options page.
- **Red Glass-Claymorphism UI** — a locked custom design system with reduced-motion support and accessible labels/roles.

**Google Drive (opt-in, manual only):**

- **Connect / Disconnect** with a truthful status indicator (the footer shows *connected*, *checking* while a real probe is in flight, or *disconnected* — never a guessed or "synced" state).
- **Manual snapshots** — create a timestamped backup of all snippets/categories in the extension's private Drive `appDataFolder`, list, download, and delete existing snapshots.
- **Restore with conflict preview** — restoring compares the snapshot against local data, surfaces *content* and *deletion-state* conflicts, and lets you resolve each item (*keep local*, *take incoming*, *keep both*) before anything is written.

> **Not implemented:** automatic/scheduled synchronization (decision GD-06, formally deferred). Every Drive operation is an explicit user action; there is no background sync, and no "synced" status is claimed anywhere.

## Screenshots

No screenshots are bundled yet. To add one: load the extension (below), capture the popup at its native 480 × 600 px, and place the image under `docs/assets/` — then reference it here with a repository-relative path.

## Technology stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict; type-checked via `tsc --noEmit`) |
| UI | React 19 + Tailwind CSS 4, icons via `lucide-react` |
| Build | Vite 8 (three entries: web demo, `popup.html`, `settings.html`) |
| Extension platform | Chrome Manifest V3 — module service worker, `chrome.storage.local`, `chrome.identity` (OAuth2), `chrome.commands` |
| Local storage | IndexedDB (database `snippet-organizer` v1: `snippets`, `categories`, `preferences`) |
| Cloud storage | Google Drive REST v3, `appDataFolder` only |
| Tests | Node's built-in test runner executed with `tsx` — 7 suites, 155 tests, dependency-injected fakes (no live network/IndexedDB) |

## Architecture overview

Three Vite entries converge on one React app. UI components never touch storage directly: they call the **repository** (`src/db.ts` — the single IndexedDB accessor) and small **service-layer** factories under `src/gdrive/` (auth, connection probe, Drive client, backup/restore) that take injected dependencies — which is what makes the whole service layer unit-testable. The **service worker** handles only floating-window lifecycle (sizing, bounds lock, `Ctrl+Shift+X`) and never touches snippet data. One invariant runs through everything: `gdriveUserDisconnected` blocks *all* Drive authentication and network access until you explicitly press Connect again.

Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/CODEBASE_MAP.md`](docs/CODEBASE_MAP.md) · diagrams in [`docs/diagrams/`](docs/diagrams/).

## Install the Chrome Extension

The easiest way to try Snippet Organizer is the packaged ZIP from the GitHub Releases:

**Download:** [`snippet-organizer-chrome-extension.zip`](https://github.com/mdnooor/Snippet-Organizer/releases/download/v0.1.0/snippet-organizer-chrome-extension.zip) — from the [Releases page](https://github.com/mdnooor/Snippet-Organizer/releases/latest) (this link always points to the newest release).

1. Download `snippet-organizer-chrome-extension.zip` from the Releases page above.
2. **Extract the ZIP into a folder** on your computer (right-click → *Extract All…*).
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Turn on **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked**.
6. Select the **extracted folder** — the one that directly contains `manifest.json`.

> **Note:** Chrome's **Load unpacked** option requires the **extracted folder**, not the ZIP file itself. Selecting the ZIP will not work.

After loading, **Snippet Organizer** appears in your extensions list. Open it from Chrome's Extensions menu: click the **puzzle-piece icon** in the toolbar (or the pin icon to pin it) and click **Snippet Organizer** — or press `Ctrl+Shift+X` to toggle its floating window.

**Updating to a newer version:** download the latest ZIP from the Releases page, extract it into a folder (you can replace the old extracted folder), then go to `chrome://extensions/` and click the **reload (↻) icon** on the Snippet Organizer card. Your snippets and settings are stored locally in your browser and survive updates.

The ZIP contains only the runtime files Chrome needs (`manifest.json` at the root, popup/settings pages, the service worker, icons, and bundled JS/CSS). Prefer building from source? See the next section.

## Installation (load the unpacked extension)

Build-it-yourself alternative to the packaged ZIP above — the extension is not on the Chrome Web Store. Run it from source:

1. Get the repository: `git clone https://github.com/mdnooor/Snippet-Organizer.git`
2. Install dependencies (build tooling only — runtime data stays in your browser): `npm install`
3. Build: `npx vite build` → output lands in **`dist/`**
4. Open `chrome://extensions` in Chrome
5. Enable **Developer mode** (top right)
6. Click **Load unpacked**
7. Select the generated **`dist/` directory** (not a ZIP — unpacked loading requires the directory)

Optional (for Drive features): allow-list the manifest's OAuth2 client ID for your Chrome extension ID in Google Cloud Console — steps in [`docs/AUTH_AND_DISCONNECT.md`](docs/AUTH_AND_DISCONNECT.md).

## Development

Requirements: Node.js (with npm) and Chrome. On Windows use `npm.cmd` / `npx.cmd` if `npm.ps1` is blocked by execution policy.

```powershell
npm install                 # install dependencies
npm run dev                 # Vite dev server on http://localhost:3000/ (web preview only — no chrome.* APIs)
npm run lint                # tsc --noEmit — the project's type check
npx vite build              # production bundle into dist/
npx tsx tests/popup-refresh.test.ts   # run one test suite…
npx tsx tests/gdrive-restore.test.ts  # …all 7 suites are listed in docs/TESTING.md
npm run build               # vite build + zip packaging (pack step needs python3 — see note)
```

Packaging note: `scripts/pack-extension.js` shells out to `python3` (zipfile). If it is unavailable, the same archive is reproducible with PowerShell `System.IO.Compression` — verified procedure and validation gates in [`docs/BUILD_AND_RELEASE.md`](docs/BUILD_AND_RELEASE.md). `npm test` does not exist by design; suites run individually via `tsx`.

## Google Drive integration

All Drive features are manual and opt-in. The extension requests exactly one OAuth scope — `https://www.googleapis.com/auth/drive.appdata` — which limits access to a hidden, per-user, per-application folder; your normal Drive files are never visible to it. While connected, a silent probe (`drive/v3/about`) keeps the status truthful. After an explicit Disconnect, a persisted intent flag blocks every Drive authentication and network path — nothing reconnects silently, and passive paths (opening the popup, Refresh) can never trigger an interactive OAuth prompt. Known limitation: OAuth tokens issued under testing-mode Google Cloud configurations expire; when the probe then reports *not connected*, reconnect explicitly.

Details: [`docs/GOOGLE_DRIVE_INTEGRATION.md`](docs/GOOGLE_DRIVE_INTEGRATION.md) · [`docs/AUTH_AND_DISCONNECT.md`](docs/AUTH_AND_DISCONNECT.md) · [`docs/BACKUP_AND_RESTORE.md`](docs/BACKUP_AND_RESTORE.md).

## Storage and data

Snippets, categories, and preferences live **locally** in IndexedDB (with a small `chrome.storage.local` mirror for bootstrapping preferences). Nothing leaves your machine unless you explicitly use a Drive feature; then payloads go only to Google's `www.googleapis.com` endpoints, into your own private `appDataFolder`. Deleting the extension removes local data; Drive snapshots remain until you delete them from the snapshot list. No telemetry, no analytics, no third-party endpoints.

Details: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) · [`docs/STORAGE_AND_PERSISTENCE.md`](docs/STORAGE_AND_PERSISTENCE.md).

## Project status and limitations

**Status:** Version 1 feature-complete and locally verified (155/155 tests, clean type check, clean production build) — **not** published to the Chrome Web Store, and real-Chrome visual verification remains with the repository owner.

Known limitations (full list: [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md)):

- The extension ID is now stable: `manifest.json` pins a public `key`, so every build/ZIP gets the permanent ID `kkfbhahpkhjadmiijcpfinlengmgiipn`. **Your Google Cloud OAuth client must authorize this extension ID** (one-time console update; Drive sign-in fails until it is saved).
- **Automatic synchronization is deferred by decision (GD-06)** and intentionally absent; do not expect background sync.
- UI rendering and real `chrome.*` behavior are verified manually in Chrome, not by automated tests; React components have no automated UI tests.
- Packaging requires `python3` (or the documented PowerShell workaround).
- Fixed 480 × 600 px windows by design — no responsive layout.

Planned/deferred work and proposals: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Documentation

| Topic | Document |
|---|---|
| Documentation index & reading order | [`docs/README.md`](docs/README.md) |
| Product overview / quick start | [`docs/PRODUCT_OVERVIEW.md`](docs/PRODUCT_OVERVIEW.md) · [`docs/QUICK_START.md`](docs/QUICK_START.md) |
| Architecture, code map, code graph | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/CODEBASE_MAP.md`](docs/CODEBASE_MAP.md) · [`docs/CODE_GRAPH.md`](docs/CODE_GRAPH.md) |
| Data model & persistence | [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) · [`docs/STORAGE_AND_PERSISTENCE.md`](docs/STORAGE_AND_PERSISTENCE.md) |
| Drive integration, auth, backup/restore | [`docs/GOOGLE_DRIVE_INTEGRATION.md`](docs/GOOGLE_DRIVE_INTEGRATION.md) · [`docs/AUTH_AND_DISCONNECT.md`](docs/AUTH_AND_DISCONNECT.md) · [`docs/BACKUP_AND_RESTORE.md`](docs/BACKUP_AND_RESTORE.md) |
| UI components & design system | [`docs/UI_COMPONENTS.md`](docs/UI_COMPONENTS.md) · [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md) |
| Testing, build & release | [`docs/TESTING.md`](docs/TESTING.md) · [`docs/BUILD_AND_RELEASE.md`](docs/BUILD_AND_RELEASE.md) |
| Security & privacy | [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md) |
| V1 baseline, limitations, roadmap, debt | [`docs/VERSION_1_BASELINE.md`](docs/VERSION_1_BASELINE.md) · [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/TECHNICAL_DEBT.md`](docs/TECHNICAL_DEBT.md) |
| Agent/engineering guide | [`AGENTS.md`](AGENTS.md) |
| Audit reports & change log | [`reports/README.md`](reports/README.md) · [`reports/DOCUMENTATION_CHANGELOG.md`](reports/DOCUMENTATION_CHANGELOG.md) |

## Security and privacy

The manifest's OAuth2 **client ID is a public identifier**, not a secret. Never commit real access tokens, refresh tokens, API keys, or private keys; keep real secrets in local `.env` files (git-ignored) and only share safe templates like the included `.env.example`. The extension stores no credentials of its own beyond Chrome's managed OAuth token cache, which explicit Disconnect evicts. No security certification has been performed — the documented behavior is source-verified, not formally audited. Details: [`docs/SECURITY_AND_PRIVACY.md`](docs/SECURITY_AND_PRIVACY.md), findings in [`reports/SECURITY_AND_PRIVACY_AUDIT.md`](reports/SECURITY_AND_PRIVACY_AUDIT.md).

## Contributing

There is no formal contribution policy or CI yet. A practical workflow:

1. Open an issue describing the change (or pick an existing one).
2. Read [`AGENTS.md`](AGENTS.md) and [`docs/README.md`](docs/README.md) first — they define the project's invariants (e.g., no automatic sync, single repository accessor, fixed window size) and the change→test mapping in [`docs/TESTING.md`](docs/TESTING.md).
3. Branch, implement with a corresponding test-suite update, run `npm run lint` and the affected suites, and build with `npx vite build` before opening a pull request.
4. Claim only what you verified; the project's evidence-tagging convention is described in [`docs/project-knowledge/README.md`](docs/project-knowledge/README.md).

## License

No license has been specified yet. All rights reserved by the repository owner until a license file is added.

## Acknowledgments

Built with [React](https://react.dev), [Vite](https://vite.dev), [Tailwind CSS](https://tailwindcss.com), and [lucide-react](https://lucide.dev); Drive integration via the [Google Drive API (`appDataFolder`)](https://developers.google.com/drive/guides/appdata).
