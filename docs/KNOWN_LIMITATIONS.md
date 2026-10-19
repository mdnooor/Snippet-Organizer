# Known Limitations (Version 1)

Each item is real, source- or environment-verified, and deliberately **not fixed** in this documentation pass.

1. ~~**Unpinned manifest `key`**~~ **RESOLVED 2026-10-20 (identity hotfix):** a stable public `key` is now pinned in `public/manifest.json`, making the extension ID permanent (`kkfbhahpkhjadmiijcpfinlengmgiipn`) across every build, ZIP, and machine. Note: this is a **new** ID — the previous IDs were install-path hashes (unpacked extensions; Chrome copies each ZIP install into `UnpackedExtensions\…_<random>`, so every install changed the ID). The OAuth client in Google Cloud Console must list this new ID; until that console update is saved, Drive sign-in fails with `OAuth client not authorized`. Private key kept by the owner outside the repo (`%USERPROFILE%\chrome-identity\snippet-organizer.pem`); only the public key is committed. `[COMMAND-VERIFIED: key→ID recomputation matches]`
2. **No automatic sync** — GD-06 is deferred by decision, not forgotten: no background upload/download/conflict automation exists, and none may be added without revisiting the ADR. `[SOURCE-VERIFIED]`
3. **No Chrome-runtime automated tests** — React rendering and `chrome.*` behavior (service worker windows, real OAuth) are manual-verification only. `[SOURCE-VERIFIED: tests/]`
4. **Packaging requires python3** — `scripts/pack-extension.js` shells to `python3`; unavailable here (verified workaround exists). Fixing the script = code change, deferred. `[COMMAND-VERIFIED: failure observed]`
5. **Testing-mode OAuth tokens expire** — external Google configuration behavior; users re-Connect when the probe reports `not-connected`. Documented expectation, not a bug.
6. **Fixed-window UI** — 480×600 by design (ADR-002 Am. 3); no responsive/small-viewport support.
7. **Large UI components** — `MainPopup.tsx` / `SettingsView.tsx` concentrate state; changes need care (see [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)).
8. **DB v1 has no migration framework** — any schema change requires hand-written `onupgradeneeded` logic that does not exist yet.
9. **Editor toolbar `no-scrollbar` rows** — two horizontal scroll rows in `SnippetEditorModal.tsx` still carry the undefined `no-scrollbar` class (show classic scrollbars); reported surface was fixed (dropdown), these two flagged-only (turn 18 scope lock). `[SOURCE-VERIFIED]`
10. **Restore replaces per conflict-resolution only** — restore is snapshot-oriented, not a merge engine; GD-06-class automation would be a V2 concern.
11. **`user_preferences` mirror can diverge transiently** — IndexedDB is truth; the mirror is best-effort for bootstrapping (bounded by `db.ts` write path).
