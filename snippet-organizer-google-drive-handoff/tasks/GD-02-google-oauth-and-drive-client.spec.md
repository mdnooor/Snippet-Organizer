# GD-02 — Google OAuth and Drive Client

- Status: backlog
- Depends on: GD-00 verified; GD-01 approved
- UI: Settings → Backup & Data
- Security-sensitive: yes

## Goal
Implement real Google connect/disconnect and a small Drive API client using a supported MV3-compatible flow.

## Before coding
Inspect actual manifest, service worker, extension ID/build config, CSP, permissions and deployment docs. Check current official Chrome Identity and Google Drive API docs. Record source URLs and scope rationale. Do not guess client ID, redirect URI, extension ID or client type.

## Behavior
- Disconnected: show `Connect Google Drive`.
- Initiate supported OAuth from a user action.
- Show connected state only after real auth succeeds. Display account identity only if returned under approved scope; do not add profile scopes merely for decoration.
- `Disconnect Google Drive` clears app-held auth state and stops Drive requests. Clarify whether Google consent revocation is or is not implemented.
- Handle cancellation, denied consent, missing config, offline, expired/revoked auth, 401/403/429, quota and network errors.
- Never log or expose tokens.

## Security/architecture
Use current project stack and supported MV3 identity flow. Request least privilege. Keep tokens out of content scripts/page contexts. Chrome extension client-side code must not contain client secrets. Configuration failure must be explicit, never fake connected state. Put Drive requests behind a small service consistent with the repo.

## Manual Google Cloud setup
After confirming architecture, document: project, Drive API enablement, consent screen/test users, correct OAuth client type, actual extension ID/redirect config, public client ID placement, test/production IDs. Use placeholders; never ask for secrets in chat.

## Tests
Auth success/cancel/deny/missing config; reacquisition failure; disconnect clears state; API error mapping; token redaction; manifest/scope checks where possible.

## Acceptance
- [ ] OAuth matches current official docs and actual MV3 architecture.
- [ ] Permissions/scopes justified.
- [ ] Connect/disconnect is real.
- [ ] No secrets/tokens committed or logged.
- [ ] Manual setup documented with project-specific placeholders.
- [ ] No upload/list/restore implementation in this task.
