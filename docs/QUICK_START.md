# Quick Start — clone, run, verify

Windows-flavored commands (the development machine is Windows; `npm.ps1` is execution-policy blocked, so use `npm.cmd` / `npx.cmd`). `[COMMAND-VERIFIED]` where marked.

## 1. Prerequisites

- Node.js + npm (lockfile: `package-lock.json`; a stray `bun.lock` exists from template history and is unused — see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).
- Google Chrome (for loading the extension).
- `python3` on PATH **only** for `npm run build`'s zip step — or use the PowerShell workaround in [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md).

## 2. Install & type-check

```powershell
npm.cmd install          # installs dependencies from package-lock.json
npm.cmd run lint         # tsc --noEmit  [COMMAND-VERIFIED: exit 0 at V1 baseline]
```

## 3. Run the test suites

```powershell
npx.cmd tsx tests/gdrive-connection.test.ts   # 19 tests
npx.cmd tsx tests/gdrive-auth.test.ts         # 22
npx.cmd tsx tests/gdrive-contract.test.ts     # 27
npx.cmd tsx tests/gdrive-backup.test.ts       # 28
npx.cmd tsx tests/gdrive-browse.test.ts       # 23
npx.cmd tsx tests/gdrive-restore.test.ts      # 28
npx.cmd tsx tests/popup-refresh.test.ts       # 8
# Total: 155 passing at the V1 baseline [COMMAND-VERIFIED 2026-10-20]
```

There is no single `npm test` script; suites are plain Node-test files run through `tsx` (details & conventions: [TESTING.md](TESTING.md)).

## 4. Build & package

```powershell
npx.cmd vite build       # production bundle into dist/  [COMMAND-VERIFIED: exit 0]
npm.cmd run pack         # zip via python3 — FAILS here without python3; workaround below
```

Verified Windows workaround (PowerShell, `System.IO.Compression.ZipArchive`): iterate `Get-ChildItem dist -Recurse -File`, add each entry with a **forward-slash** relative path (`$rel = $f.FullName.Substring($distPath.Length + 1) -replace '\\','/'`), write to `public/snippet-organizer-extension.zip` and copy to `dist\`. Validate: 17 entries, all forward-slash, root `manifest.json` byte-identical to `public/manifest.json`. Full procedure: [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md).

## 5. Load in Chrome

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select the `dist/` directory.
3. Pin "Snippet Organizer" from the toolbar menu; open the popup. Floating mode: press `Ctrl+Shift+X` or click the toolbar icon per service-worker logic.

## 6. Web preview (optional)

```powershell
npm.cmd run dev          # http://localhost:3000 — browser demo WITHOUT chrome.* APIs
```

`chrome.*` is mocked in the web entry (`src/main.tsx` path → `App.tsx`); Drive features cannot run here. This is a layout/interaction preview only.

## 7. Drive connection (optional)

Requires the OAuth client ID in `public/manifest.json` to be paired with your extension ID in Google Cloud Console (OAuth testing-mode users; tokens may expire per Google's testing configuration). Steps and manual verification: [AUTH_AND_DISCONNECT.md](AUTH_AND_DISCONNECT.md). Disconnect is always honored — the extension never silently reconnects.
