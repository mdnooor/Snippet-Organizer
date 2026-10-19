# GD-07 — Settings UI and Accessibility

- Status: backlog
- Depends on: GD-02 through GD-06 verified or explicitly scoped/deferred
- UI: Settings → Backup & Data only

## Goal
Integrate completed Drive functions with minimal changes, preserving the existing design.

## Non-negotiable design
Preserve approved Red Glass-Claymorphism; reuse existing controls, dialogs, spacing, typography, toasts, loading states. Do not redesign popup/other settings, alter established fixed window dimensions, introduce a new design system, or add a UI library without approval.

## Information architecture
1. Google Drive connection: Connect, status, Disconnect.
2. Create cloud backup: name, contents explanation, Create.
3. Cloud backups: name, timestamp, size/status where available, Download, Restore, Delete.
4. Restore: read-only preview, Merge/Replace, conflict review, destructive confirmation.
5. Sync: only if GD-06 passes; manual Sync now, last sync and real result/conflict state.

Keep local backup/import controls separate and clearly labelled.

## States
Idle, loading, success, retryable error, disconnected/not configured, offline, permission/auth error, empty list, unsupported/corrupt backup, conflict review, destructive confirmation. Disable duplicate submissions; do not use fake progress or stale results.

## Accessibility
Keyboard access, visible focus, dialog focus/Escape behavior consistent with existing patterns, labels for icon-only controls, status not conveyed by color alone, reduced-motion conventions if present.

## Tests
Connected/disconnected/empty/list states; disabled actions; connect cancel/error; restore preview/Replace confirmation; conflict cancel; double-submit prevention; keyboard/focus; regression of local Backup & Data.

## Acceptance
- [ ] Drive controls only in Settings → Backup & Data.
- [ ] Existing style preserved.
- [ ] Local backup/import still works.
- [ ] Sync UI only if safe sync implemented.
- [ ] Honest states and destructive guards.
- [ ] Accessibility/regression tests pass or gaps documented.
