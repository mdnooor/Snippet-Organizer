# Testing

`[COMMAND-VERIFIED]` results at the V1 baseline (2026-10-20); conventions `[SOURCE-VERIFIED]` from `tests/`.

## How tests run

Plain **Node built-in test runner** files (`node:test` + `node:assert`), executed with `tsx` for TypeScript. **No `npm test` script exists** and none is needed — run suites individually:

```powershell
npx.cmd tsx tests/gdrive-connection.test.ts   # 19 — probe states, disconnect guard, identity
npx.cmd tsx tests/gdrive-auth.test.ts         # 22 — config resolution, token flows, error classification
npx.cmd tsx tests/gdrive-contract.test.ts     # 27 — BackupData/data contract, db repository behavior
npx.cmd tsx tests/gdrive-backup.test.ts       # 28 — gather → serialize → upload (faked Drive)
npx.cmd tsx tests/gdrive-browse.test.ts       # 23 — list / download / delete
npx.cmd tsx tests/gdrive-restore.test.ts      # 28 — preview, conflicts, resolutions, apply
npx.cmd tsx tests/popup-refresh.test.ts       # 8 — refresh orchestrator (single-flight, concurrency, floor)
# Baseline total: 155 passing, 0 failing
```

## Conventions

- **Dependency injection everywhere**: Drive/auth/db collaborators are injected fakes — tests never touch real IndexedDB or the network, and never call `chrome.identity`. This is why the suites run anywhere Node runs.
- Orchestrators (`createAuthController`, `createConnectionProbe`, `createCloudBackup`, `createPopupRefresh`) are factory functions returning controllers — tests drive them deterministically (gates, held promises, failure injection).
- UI components (`*.tsx`) are **deliberately not unit-tested** (no React DOM testing layer by decision): component behavior is verified by type-check + build + source review + manual Chrome checks. Regression coverage therefore concentrates on the service/orchestrator layer.
- Naming: `tests/gdrive-<area>.test.ts`; descriptive test titles double as specification.

## What is NOT covered (honest boundaries)

- React rendering, event handling, focus management (manual only).
- Real Chrome behavior: service worker window logic (`scripts/verify-floating-mode.js` is a manual helper), actual OAuth/Drive HTTP (manual; see [AUTH_AND_DISCONNECT.md](AUTH_AND_DISCONNECT.md)).
- IndexedDB itself (faked at the repository seam).

## When to update which suite

| You change… | Update / extend |
|---|---|
| `src/gdrive/auth.ts` | `gdrive-auth.test.ts` |
| `src/gdrive/connection.ts` (probe/disconnect) | `gdrive-connection.test.ts` (+ `popup-refresh.test.ts` if refresh wiring changes) |
| `src/db.ts` / `types.ts` / snapshot format | `gdrive-contract.test.ts`; backup/restore suites if envelopes change |
| `src/gdrive/backup.ts`/`gather`/`snapshot`/`snapshotStore`/`driveClient` upload path | `gdrive-backup.test.ts` |
| list/download/delete | `gdrive-browse.test.ts` |
| `restore.ts`/`conflict.ts` | `gdrive-restore.test.ts` |
| `src/popupRefresh.ts` or MainPopup refresh wiring | `popup-refresh.test.ts` |

Rule: behavior changes without a corresponding test update are incomplete work. Never weaken an existing test to make a change pass.
