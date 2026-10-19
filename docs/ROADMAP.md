# Roadmap — deferred work & proposals

**Proposals only.** Nothing below is committed unless an ADR in [`project-knowledge/DECISIONS.md`](project-knowledge/DECISIONS.md) says otherwise. The one formally decided deferral is called out.

## Formally decided (binding)

- **GD-06 — Explicit sync & sync-conflict automation: DEFERRED.** No automatic synchronization may be implemented, redefined, or schema-planned without revisiting the decision record. Today every Drive operation is user-initiated; conflict handling exists only inside manual restore. (Source: `docs/project-knowledge/DECISIONS.md`, `docs/tasks/BACKLOG.md`, GD-06 report.)

## Release blockers (agreed, pre-push)

1. Pin `manifest.key` + re-pair the OAuth client (see [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md), [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md)).
2. Repo hygiene: legacy artifacts + template dependencies ([TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)) before making the repository public.

## Proposed — V1.1 candidates (small, low risk)

- Replace python3 packaging with a Node-native zip script; add `npm test` running all suites.
- Fix the two editor-toolbar `no-scrollbar` rows (one-class change, pattern proven in turn 18).
- Split `db.ts` search/backup helpers into focused modules (behavior-neutral, test-pinned).

## Proposed — Version 2 ideas (unscheduled)

- Automatic sync behind the GD-06 decision revisit (design doc + ADR first; schema impact on `BackupData` and conflicts).
- Real UI test layer (`@testing-library/react` + jsdom) as an explicit dependency decision.
- Snapshot diffing/preview improvements beyond current conflict classes; scheduled backups (user-triggered cadence reminders, still no background sync).
- i18n of UI strings (currently English-only).
- Pinned-key store release + post-install onboarding flow.

## Unverified assumptions needing investigation

- Actual Chrome-version floor (MV3 features used are broadly supported; no `minimum_chrome_version` is set — decide and document).
- Store-review implications of the `identity` permission listing copy.
- `user_preferences` mirror vs IndexedDB divergence over long sessions (bounded, but unmeasured).
