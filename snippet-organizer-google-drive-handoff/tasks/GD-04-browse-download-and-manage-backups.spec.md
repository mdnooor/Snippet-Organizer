# GD-04 — Browse, Download, and Manage Backups

- Status: backlog
- Depends on: GD-03 verified
- UI: Settings → Backup & Data

## Goal
Browse cloud snapshots, download a selected one, and deliberately delete one without affecting local snippets.

## Behavior
- List snapshots with name, local-time timestamp, size if available, schema/compatibility status, and stable distinction for duplicate names.
- Sort newest-first unless product convention says otherwise; document.
- Support refresh/retry, empty/loading/error states, and Drive pagination.
- Fetch metadata first; download contents only when needed.
- Provide Download/Export through supported extension download or existing export mechanism; never leak tokens.
- Delete requires confirmation naming the snapshot. Cloud deletion never deletes local data.
- Incompatible schema should block restore but permit safe raw download when possible.
- Handle missing/trashed files, permission errors, pagination, rate limits, offline and expired auth.

## Tests
Empty/multiple-page list; duplicate names; unsupported schema; retry; correct download bytes/name; delete cancel/confirm/failure; local storage unchanged after cloud delete.

## Acceptance
- [ ] User can distinguish snapshots.
- [ ] Download/export selected backup works.
- [ ] Delete requires confirmation and only deletes cloud item.
- [ ] Pagination/errors handled.
- [ ] Tests/docs updated.
