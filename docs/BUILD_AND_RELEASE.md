# Build, Packaging & Release

`[COMMAND-VERIFIED]` where marked (Windows machine; 2026-10-20).

## Toolchain

Vite 8 (`vite.config.ts`: React + Tailwind 4 plugins; three HTML inputs — `index.html` web demo, `popup.html`, `settings.html`; `@` alias to root; HMR switch for agent edits) → outputs to `dist/`. TypeScript is checked separately by `npm run lint` (`tsc --noEmit`) — **the build does not type-check**; always run lint.

## Commands

| Command | What it does | Status at baseline |
|---|---|---|
| `npm.cmd run lint` | `tsc --noEmit` — type check (doubles as the only type-check) | exit 0 |
| `npx.cmd vite build` | production bundle → `dist/` | exit 0 (~0.3–0.9 s) |
| `npm.cmd run build` | `vite build` **then** `node scripts/pack-extension.js` | pack step **fails on this machine** (see below) |
| `npm.cmd run pack` | zip only | same python3 dependency |
| `npm.cmd run dev` | Vite dev server :3000 (web demo only) | — |
| `npm.cmd run clean` | removes `dist/`, `server.js` | — |

## Packaging — the python3 dependency and the verified workaround

`scripts/pack-extension.js` shells out to `python3` (`zipfile`) to zip `dist/` into `public/snippet-organizer-extension.zip` and copy it to `dist\`. **On this Windows machine `python3` is unavailable, so the script's pack step fails** — this is an environment limitation, not an application failure.

Verified PowerShell workaround (used for every baseline validation):

```powershell
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$distPath = (Resolve-Path 'dist').Path
$fs = [System.IO.File]::Create("$distPath\..\public\snippet-organizer-extension.zip")
$zip = New-Object System.IO.Compression.ZipArchive($fs, 'Create')
Get-ChildItem $distPath -Recurse -File | Where-Object { $_.Name -notlike '*.zip' } | ForEach-Object {
  $rel = $_.FullName.Substring($distPath.Length + 1) -replace '\\','/'   # forward slashes are REQUIRED
  $e = $zip.CreateEntry($rel); $es = $e.Open()
  $b = [System.IO.File]::ReadAllBytes($_.FullName); $es.Write($b,0,$b.Length); $es.Close()
}
$zip.Dispose(); $fs.Dispose()
Copy-Item 'public\snippet-organizer-extension.zip' 'dist\snippet-organizer-extension.zip' -Force
```

Validation gates (all green at baseline): **17 entries**, all forward-slash (Windows `Compress-Archive` produces backslash entries that Chrome rejects — never use it), root `manifest.json` byte-identical to `public/manifest.json`. Note `python`-equivalents (`py`) were not accepted by the script as written — fixing the script is a documented finding, deliberately not changed in this audit ([TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).

## Manual verification in Chrome

1. `chrome://extensions` → Developer mode → **Load unpacked** → select `dist/`.
2. Popup: create/edit/copy/trash snippets; categories; search; shortcuts; Refresh.
3. Floating window: `Ctrl+Shift+X`; verify outer 480×600 and focus behavior.
4. Drive (optional): Connect → identity shown → create/list/download/delete snapshot → restore preview → Disconnect → verify nothing touches Drive afterward.
5. Record results with `[RUNTIME-VERIFIED]` only for steps actually performed.

## Release readiness (not done)

- **Unpinned manifest `key`**: CWS re-assigns the extension ID on upload; the OAuth client is (or would be) paired to the current unpacked ID — store release requires generating a key, pinning it in `public/manifest.json`, and re-pairing the client. Tracked in [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).
- No store listing assets/screenshots pipeline exists. No signing/publish step is automated (and must not be — store submission is manual).

Also see: [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) for pre-release considerations.
