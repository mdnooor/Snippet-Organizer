# GD-06 — Explicit Sync and Sync Conflict Handling

- Status: backlog
- Depends on: GD-01 verified; GD-02 verified; GD-05 verified
- Risk: high
- UI: Settings → Backup & Data

## Mandatory feasibility gate
Prove the model supports stable record IDs and edit/delete detection. Inspect category, favorite, Trash, restore and deletion semantics. If new metadata/migrations are needed, document them and obtain approval. If safe conflict/deletion handling or rollback is not possible, mark blocked/deferred. Do not ship snapshot upload disguised as sync.

## Initial UX
- User explicitly starts `Sync now`; no silent background sync in this task.
- Explain what sync covers and which account is connected.
- Show only real progress milestones.
- After completion, show last sync time and actual added/updated/skipped/conflict counts where measurable.
- Conflicts require review before destructive overwrite.
- Retries must be idempotent or reconcile prior operation state.

## Sync contract must define
Direction (one-way/bidirectional); source of truth; stable IDs; change detection/hashes; tombstones/deletion semantics; same-ID/different-content policy; categories/favorites/Trash; conflict UI choices; operation ordering; partial-failure recovery; last-success metadata; offline/expired-auth behavior; loop prevention.

## Safety
No conflict winner based only on untrusted device clocks. No destructive delete propagation unless tombstones and recovery are tested and approved. Never silently overwrite. Do not conflate backup history and sync state. Local mode must remain usable. No tokens/content in logs.

## Tests
No-change sync idempotence; local/cloud create/update/delete as applicable; same-ID conflict; relationships; interrupted/retried sync; repeated sync no duplicates; offline/disconnected/expired auth; tombstones if in scope.

## Acceptance
- [ ] Semantics documented and approved.
- [ ] Feasibility backed by source evidence.
- [ ] Conflicts visible, no silent destructive winner.
- [ ] Retry safe/idempotent.
- [ ] UI calls it sync only if real sync exists.
- [ ] If blocked, no misleading sync UI; follow-up documented.
