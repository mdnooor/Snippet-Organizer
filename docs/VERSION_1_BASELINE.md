# Version 1 Baseline (2026-10-20)

Evidence-tagged statement of what Version 1 **is**. Companion: [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md), [ROADMAP.md](ROADMAP.md), and the validation evidence in [`reports/TEST_AND_BUILD_REPORT.md`](../reports/TEST_AND_BUILD_REPORT.md).

## 1. Verified V1 functionality `[COMMAND-VERIFIED]` / `[SOURCE-VERIFIED]`

- **Local snippet management**: create/edit (rich content), favorites, categories (locked palette), soft-delete trash + restore + permanent delete, one-click copy with toast, last-used re-sorting. (Source: `db.ts`, editor/card components; contract suite 27.)
- **Search & filtering**: debounced multi-field search with canonical Title > Content > Category ranking; All/Favorites/per-category tabs + dropdown portal. (`filterAndRankSnippets`, `MainPopup`.)
- **Keyboard shortcuts**: real, user-rebindable bindings (`preferences.uiShortcuts`, `globalCommandShortcut`), capture UI with Esc-cancel; `Ctrl+Shift+X` global toggle command. (`SettingsView`, `shortcutUtils`, manifest `commands`.)
- **Fixed-window modes**: docked popup and frame-locked floating window, both exactly 480×600 outer (ADR-002 Am. 3); service-worker window lifecycle.
- **Refresh**: always-visible button; single-flight; concurrent local IndexedDB reload + silent Drive probe (`allSettled`); connection-independent 450 ms feedback floor; never prompts, never clears disconnect intent. (`popupRefresh.ts`; suite 8.)
- **Drive connection**: silent probe with truth-only footer status (connected/static Drive logo, checking/real-pulse, disconnected/neutral dot); identity display in Settings; explicit Connect; explicit Disconnect with persisted intent + token-cache eviction. (Suite 19+22.)
- **Manual Drive backup**: create snapshot (gather → serialize `BackupData` → multipart upload to `appDataFolder`), list, download, delete. (Suites 28+23.)
- **Manual restore with conflict preview**: content/deletion-state conflicts, keep-local/take-incoming/keep-both, quarantine counting, atomic-enough apply (validate before write). (Suite 28.)
- **Quality gates at baseline**: 155/155 tests, `tsc --noEmit` clean, `vite build` clean, zip packaging verified via documented workaround (17 forward-slash entries).

## 2. Known limitations

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) — headline: unpinned manifest `key` (store blocker), manual-only Chrome verification, python3 packaging dependency, no auto-sync.

## 3. Deferred features

- **GD-06 automatic sync & sync-conflict automation** — formally deferred; the only binding deferral. Schema/`BackupData` and changelog intentionally carry no sync fields.
- Editor toolbar scrollbar normalization (flagged-only in turn 18's scope lock).

## 4. Proposed Version 2 ideas

See [ROADMAP.md](ROADMAP.md) — proposals, not commitments: GD-06 revisit (ADR first), UI test layer, Node-native packaging, snapshot diffing, i18n.

## 5. Unverified assumptions requiring future investigation

- Chrome-version floor (no `minimum_chrome_version` set).
- Long-session `user_preferences` mirror divergence (bounded but unmeasured).
- Store-review treatment of `identity` permission copy.
- Real-Chrome visuals of the final UI (verified only via build markers + source; user-owned manual checks pending).

## Change history for the baseline

Chronological, evidence-tagged change log: [`reports/DOCUMENTATION_CHANGELOG.md`](../reports/DOCUMENTATION_CHANGELOG.md). Historical per-task evidence: GD-03…GD-08 + PR-1 reports in [`reports/`](../reports/README.md).
