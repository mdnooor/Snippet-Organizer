# Test & Build Report (Version 1 baseline)

Executed: 2026-10-20, Windows (`npm.cmd`/`npx.cmd`; `npm.ps1` blocked by execution policy). Every result below was observed from the actual command output during the documentation audit's validation phase. Application code was **not** modified for this audit (documentation + one doc-generator script added); these runs therefore double as the no-regression evidence for the audit.

## Automated suites — `npx.cmd tsx tests/<name>.test.ts`

| Suite | Pass | Fail | Exit |
|---|---:|---:|---:|
| gdrive-connection | 19 | 0 | 0 |
| gdrive-auth | 22 | 0 | 0 |
| gdrive-contract | 27 | 0 | 0 |
| gdrive-backup | 28 | 0 | 0 |
| gdrive-browse | 23 | 0 | 0 |
| gdrive-restore | 28 | 0 | 0 |
| popup-refresh | 8 | 0 | 0 |
| **Total** | **155** | **0** | — |

There is no `npm test` aggregate script (documented in `docs/TESTING.md`); the total above is the sum of the seven individually executed suites.

## Lint / type check

- `npm.cmd run lint` (`tsc --noEmit`) → **exit 0**. This is the project's only type check; the build does not type-check.

## Build

- `npx.cmd vite build` → **exit 0** (`✓ built in 624ms`; entries: `index.html`, `popup.html`, `settings.html` → `dist/`).

## Packaging

- `npm.cmd run build` / `npm.cmd run pack` → **pack step fails on this machine**: `scripts/pack-extension.js` shells out to `python3`, which is not installed here. This is an **environment limitation, not an application failure**.
- Verified PowerShell workaround (`System.IO.Compression.ZipArchive`, forward-slash entries — procedure in `docs/BUILD_AND_RELEASE.md`) → produced `public/snippet-organizer-extension.zip` + copy in `dist\` with **17 entries, all forward-slash, root `manifest.json` byte-identical to `public/manifest.json`** (all checks observed true at the last repack, 2026-10-20).
- Earlier in the session, `Windows` `Compress-Archive` was proven to produce backslash entries that Chrome rejects — do not use it.

## Documentation-only validations (this audit)

- `node scripts/generate-doc-inventory.mjs` → exit 0 (`157 files; 41 source files; 15,817 lines; 21 dependencies`).
- Markdown link check over all `.md` outside vendored dirs: **153 relative links checked, 0 broken** after the final reports were written (the only 6 transiently broken links pointed at this file and `DOCUMENTATION_AUDIT.md` before they existed).
- Mermaid sources: each `docs/diagrams/*.mmd` contains exactly one `flowchart` block (additional `graph`-substring hits were `subgraph` lines) — syntax valid for the constructs used (`flowchart TB/LR/TD`, `subgraph`, labeled edges, `classDef`).

## Manual browser validation

**Not performed by the audit** — no Chrome runtime in this environment. The user owns: loading `dist/` unpacked, popup/floating-window checks, Drive Connect/snapshot/restore/Disconnect flow, visual pass of the Red Glass-Claymorphism UI. Checklist: `docs/BUILD_AND_RELEASE.md` §Manual verification and `docs/AUTH_AND_DISCONNECT.md`. Anything not performed is `[UNKNOWN]` by the evidence-tagging contract.
