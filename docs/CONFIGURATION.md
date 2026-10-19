# Configuration Reference

`[SOURCE-VERIFIED]` (2026-10-20). What each config file controls and what must never change casually.

## `public/manifest.json` (MV3)

- `name`/`version` (`0.1.0`)/`description`; `action.default_popup: popup.html`; `options_ui: settings.html` (`open_in_tab`).
- `permissions: ["storage", "identity"]`; `oauth2.client_id` + `scopes: ["https://www.googleapis.com/auth/drive.appdata"]` — client id is public; **changing scopes/client requires updating `src/gdrive/auth.ts` expectations and the Google Cloud Console pairing**.
- `commands`: `_execute_action`, `toggle-organizer` (suggested `Ctrl+Shift+X`; user-rebindable via `preferences.uiShortcuts` in-app).
- `background.service_worker: service-worker.js` (`type: module`).
- **No `key`** — deliberate open item (CWS blocker; see [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)).

## `vite.config.ts`

- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`. Alias `@` → project root.
- Rollup inputs: `index.html` (web demo), `popup.html`, `settings.html` — new pages need an entry here.
- `server.hmr`/`watch` respect `DISABLE_HMR=true` (agent-editing mode).

## `tsconfig.json` + `npm run lint`

`tsc --noEmit` is the type gate (build does NOT type-check). Keep strictness unchanged; new files are covered automatically.

## `package.json`

Scripts: `dev`, `build` (vite build + pack), `pack`, `preview`, `clean`, `lint`. Runtime dependencies actually used by the extension bundle: `react`, `react-dom`, `lucide-react`, Tailwind toolchain (`@tailwindcss/vite`, `tailwindcss`), Vite/`@vitejs/plugin-react`, `tsx`+`typescript` (dev). **Template leftovers present but unused by the extension** (verify before removal — none removed in this audit): `express`, `jszip`, `@google/genai`, `dotenv`, `motion`, `autoprefixer`, `esbuild`, `@types/express`, `@types/jszip`. `name: "react-example"` is template metadata (cosmetic debt). `bun.lock` is stray (npm lockfile is `package-lock.json`).

## Environment

- `.env.example` documents `GEMINI_API_KEY` / `APP_URL` — **AI Studio template heritage, unused**; `.gitignore` excludes `.env*` (except the example). Do not add real secrets.
- Windows dev notes: use `npm.cmd`/`npx.cmd`; packaging needs python3 or the documented PowerShell workaround ([BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md)).

## In-app settings (persisted)

Preferences live in IndexedDB (`preferences` store) mirrored to `chrome.storage.local.user_preferences`: search fields, sort order, `uiShortcuts`, `globalCommandShortcut` (normalized by `src/shortcutUtils.ts` on load). Changing preference shapes requires `db.ts` care (no migration framework exists — DB v1).
