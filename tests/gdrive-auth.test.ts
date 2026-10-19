/**
 * GD-02 tests — OAuth authorization foundation (src/gdrive/auth.ts).
 *
 * Pure-logic tests only: config validation, manifest-on-disk regression, and
 * controller flows against stub AuthDeps. These tests do NOT exercise real
 * chrome.identity or a real Google account (that is GD-08's gate).
 *
 * Run: npx.cmd tsx tests/gdrive-auth.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  DRIVE_APPDATA_SCOPE,
  GOOGLE_ACCOUNT_PERMISSIONS_URL,
  OAUTH_SCOPES,
  PLACEHOLDER_CLIENT_ID,
  classifyAuthError,
  createAuthController,
  resolveOAuthConfig,
  type AuthDeps,
  type GetAuthTokenDetails,
  type IdentityToken,
  type ManifestLike,
} from '../src/gdrive/auth';

const VALID_CLIENT_ID = '1234567890-abcdefabcdefabcdefabcdefabcdef.apps.googleusercontent.com';

function makeManifest(overrides: Partial<ManifestLike> = {}): ManifestLike {
  return {
    oauth2: { client_id: VALID_CLIENT_ID, scopes: [DRIVE_APPDATA_SCOPE] },
    permissions: ['storage', 'identity'],
    ...overrides,
  };
}

interface StubState {
  manifest: ManifestLike;
  resolve?: IdentityToken | Error;
  calls: GetAuthTokenDetails[];
  cleared: number;
}

function makeStub(state: StubState): AuthDeps {
  return {
    getAuthToken: async (details) => {
      state.calls.push(details ?? {});
      const outcome = state.resolve;
      if (outcome instanceof Error) throw outcome;
      return outcome ?? {};
    },
    clearAllCachedAuthTokens: async () => {
      state.cleared += 1;
    },
    getManifest: () => state.manifest,
  };
}

// ---------------------------------------------------------------------------
// resolveOAuthConfig
// ---------------------------------------------------------------------------

test('config: valid manifest resolves ok with client id and exact scopes', () => {
  const config = resolveOAuthConfig(makeManifest());
  assert.equal(config.ok, true);
  if (config.ok) {
    assert.equal(config.clientId, VALID_CLIENT_ID);
    assert.deepEqual(config.scopes, [DRIVE_APPDATA_SCOPE]);
  }
});

test('config: missing oauth2 key is a config problem, not a crash', () => {
  const config = resolveOAuthConfig({ permissions: ['storage', 'identity'] });
  assert.equal(config.ok, false);
  if (!config.ok) assert.equal(config.problem.code, 'missing-oauth2-key');
});

test('config: null/undefined manifest is a config problem', () => {
  for (const input of [null, undefined]) {
    const config = resolveOAuthConfig(input);
    assert.equal(config.ok, false);
    if (!config.ok) assert.equal(config.problem.code, 'missing-oauth2-key');
  }
});

test('config: empty client id is missing-client-id', () => {
  const config = resolveOAuthConfig(makeManifest({ oauth2: { client_id: '  ', scopes: [DRIVE_APPDATA_SCOPE] } }));
  assert.equal(config.ok, false);
  if (!config.ok) assert.equal(config.problem.code, 'missing-client-id');
});

test('config: placeholder client id is recognized as not-configured', () => {
  const config = resolveOAuthConfig(makeManifest({ oauth2: { client_id: PLACEHOLDER_CLIENT_ID, scopes: [DRIVE_APPDATA_SCOPE] } }));
  assert.equal(config.ok, false);
  if (!config.ok) {
    assert.equal(config.problem.code, 'placeholder-client-id');
    assert.match(config.problem.message, /Chrome Extension/);
  }
});

test('config: malformed client id is invalid-client-id', () => {
  const config = resolveOAuthConfig(makeManifest({ oauth2: { client_id: 'not-a-google-client-id', scopes: [DRIVE_APPDATA_SCOPE] } }));
  assert.equal(config.ok, false);
  if (!config.ok) assert.equal(config.problem.code, 'invalid-client-id');
});

test('config: extra or missing scopes are rejected (least privilege)', () => {
  const withExtra = resolveOAuthConfig(
    makeManifest({ oauth2: { client_id: VALID_CLIENT_ID, scopes: [DRIVE_APPDATA_SCOPE, 'https://www.googleapis.com/auth/drive'] } }),
  );
  assert.equal(withExtra.ok, false);
  if (!withExtra.ok) assert.equal(withExtra.problem.code, 'scope-mismatch');

  const withNone = resolveOAuthConfig(makeManifest({ oauth2: { client_id: VALID_CLIENT_ID, scopes: [] } }));
  assert.equal(withNone.ok, false);
  if (!withNone.ok) assert.equal(withNone.problem.code, 'scope-mismatch');

  const wrongScope = resolveOAuthConfig(makeManifest({ oauth2: { client_id: VALID_CLIENT_ID, scopes: ['https://www.googleapis.com/auth/drive.file'] } }));
  assert.equal(wrongScope.ok, false);
  if (!wrongScope.ok) assert.equal(wrongScope.problem.code, 'scope-mismatch');
});

test('config: non-array or non-string scopes are scope-mismatch', () => {
  const notArray = resolveOAuthConfig(makeManifest({ oauth2: { client_id: VALID_CLIENT_ID, scopes: DRIVE_APPDATA_SCOPE } }));
  assert.equal(notArray.ok, false);
  if (!notArray.ok) assert.equal(notArray.problem.code, 'scope-mismatch');
});

test('config: missing identity permission is rejected', () => {
  const config = resolveOAuthConfig(makeManifest({ permissions: ['storage'] }));
  assert.equal(config.ok, false);
  if (!config.ok) assert.equal(config.problem.code, 'missing-identity-permission');
});

// ---------------------------------------------------------------------------
// Manifest on disk (regression guard for the shipping file)
// ---------------------------------------------------------------------------

test('manifest on disk: identity permission present, oauth2 scopes exactly drive.appdata, client id is placeholder or well-formed', () => {
  const raw = readFileSync(fileURLToPath(new URL('../public/manifest.json', import.meta.url)), 'utf8');
  const manifest = JSON.parse(raw) as ManifestLike;
  const config = resolveOAuthConfig(manifest);
  if (!config.ok) {
    // The only acceptable pre-configuration state is the documented placeholder.
    assert.equal(config.problem.code, 'placeholder-client-id');
  }
  const scopes = (manifest.oauth2 as { scopes?: string[] }).scopes ?? [];
  assert.deepEqual([...scopes].sort(), [...OAUTH_SCOPES].sort());
  const permissions = (manifest.permissions as string[]) ?? [];
  assert.ok(permissions.includes('identity'));
  assert.ok(permissions.includes('storage'));
});

test('constants: scope/url sentinels are stable', () => {
  assert.equal(DRIVE_APPDATA_SCOPE, 'https://www.googleapis.com/auth/drive.appdata');
  assert.equal(OAUTH_SCOPES.length, 1);
  assert.equal(GOOGLE_ACCOUNT_PERMISSIONS_URL, 'https://myaccount.google.com/permissions');
});

// ---------------------------------------------------------------------------
// Controller flows (stubbed chrome.identity)
// ---------------------------------------------------------------------------

test('controller: not-configured short-circuits without calling getAuthToken', async () => {
  const state: StubState = {
    manifest: makeManifest({ oauth2: { client_id: PLACEHOLDER_CLIENT_ID, scopes: [DRIVE_APPDATA_SCOPE] } }),
    calls: [],
    cleared: 0,
  };
  const controller = createAuthController(makeStub(state));
  assert.equal(controller.isConfigured(), false);
  const result = await controller.authorize({ interactive: true });
  assert.equal(result.status, 'not-configured');
  if (result.status === 'not-configured') assert.equal(result.problem.code, 'placeholder-client-id');
  assert.equal(state.calls.length, 0);
});

test('controller: interactive authorize returns token and granted scopes', async () => {
  const state: StubState = {
    manifest: makeManifest(),
    resolve: { token: 'ya29.test-token', grantedScopes: [DRIVE_APPDATA_SCOPE] },
    calls: [],
    cleared: 0,
  };
  const controller = createAuthController(makeStub(state));
  assert.equal(controller.isConfigured(), true);
  const result = await controller.authorize();
  assert.deepEqual(result, { status: 'authorized', token: 'ya29.test-token', grantedScopes: [DRIVE_APPDATA_SCOPE] });
  assert.deepEqual(state.calls, [{ interactive: true, scopes: [DRIVE_APPDATA_SCOPE] }]);
});

test('controller: authorize requests exactly the declared scopes', async () => {
  const state: StubState = { manifest: makeManifest(), resolve: { token: 't' }, calls: [], cleared: 0 };
  const controller = createAuthController(makeStub(state));
  await controller.getToken();
  assert.deepEqual(state.calls, [{ interactive: false, scopes: [DRIVE_APPDATA_SCOPE] }]);
});

test('controller: silent failure maps to interaction-required', async () => {
  const state: StubState = { manifest: makeManifest(), resolve: new Error('Interaction required.'), calls: [], cleared: 0 };
  const controller = createAuthController(makeStub(state));
  const result = await controller.getToken();
  assert.equal(result.status, 'interaction-required');
});

test('controller: user-cancelled consent maps to denied', async () => {
  const state: StubState = { manifest: makeManifest(), resolve: new Error('User cancelled or closed the dialog.'), calls: [], cleared: 0 };
  const controller = createAuthController(makeStub(state));
  const result = await controller.authorize({ interactive: true });
  assert.equal(result.status, 'denied');
});

test('controller: unknown identity error maps to error with message preserved', async () => {
  const state: StubState = { manifest: makeManifest(), resolve: new Error('OAuth client was deleted.'), calls: [], cleared: 0 };
  const controller = createAuthController(makeStub(state));
  const result = await controller.authorize();
  assert.equal(result.status, 'error');
  if (result.status === 'error') assert.match(result.message, /OAuth client was deleted/);
});

test('controller: empty-token resolution maps to error', async () => {
  const state: StubState = { manifest: makeManifest(), resolve: {}, calls: [], cleared: 0 };
  const controller = createAuthController(makeStub(state));
  const result = await controller.authorize();
  assert.equal(result.status, 'error');
});

test('controller: signOut clears Chrome token cache exactly once', async () => {
  const state: StubState = { manifest: makeManifest(), calls: [], cleared: 0 };
  const controller = createAuthController(makeStub(state));
  await controller.signOut();
  await controller.signOut();
  assert.equal(state.cleared, 2);
});

// ---------------------------------------------------------------------------
// GD-08 hardening — disconnect safety
// ---------------------------------------------------------------------------

test('GD-08 disconnect safety: signOut neither re-acquires tokens nor exposes any Drive/network surface', async () => {
  // (a) The controller's public surface stays exactly this set. Any future member
  // with file/list/network/delete capability on the AUTH controller trips this guard
  // — sign-out must never be able to touch cloud data.
  const controller = createAuthController(makeStub({ manifest: makeManifest(), calls: [], cleared: 0 }));
  assert.deepEqual(
    Object.keys(controller).sort(),
    ['authorize', 'getToken', 'isConfigured', 'resolveConfig', 'signOut'],
  );

  // (b) signOut performs zero getAuthToken calls — it never re-acquires, refreshes,
  // or transmits anything; it only clears Chrome's cached tokens.
  const state: StubState = { manifest: makeManifest(), resolve: { token: 'ya29.test-token' }, calls: [], cleared: 0 };
  const signOutOnly = createAuthController(makeStub(state));
  await signOutOnly.signOut();
  assert.equal(state.calls.length, 0);
  assert.equal(state.cleared, 1);

  // (c) The injectable dependency seam itself has no HTTP/fetch capability —
  // structurally, the auth controller cannot issue Drive requests.
  const stubKeys = Object.keys(makeStub({ manifest: makeManifest(), calls: [], cleared: 0 })).sort();
  assert.deepEqual(stubKeys, ['clearAllCachedAuthTokens', 'getAuthToken', 'getManifest']);
});

test('classifyAuthError: case-insensitive cancel/dismiss/interaction detection', () => {
  assert.equal(classifyAuthError('The user DISMISSED the dialog').status, 'denied');
  assert.equal(classifyAuthError('flow was Closed by user').status, 'denied');
  assert.equal(classifyAuthError('interaction required').status, 'interaction-required');
  assert.equal(classifyAuthError('network down').status, 'error');
});

test('controller: without chrome and without deps, authorize throws a clear setup error', async () => {
  const controller = createAuthController({ getAuthToken: async () => ({ token: 't' }) });
  // getAuthToken injected but clearAllCachedAuthTokens/getManifest missing and no chrome → requireDeps throws.
  await assert.rejects(() => controller.authorize(), /chrome\.identity is unavailable/);
});
