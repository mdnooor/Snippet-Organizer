/**
 * Google OAuth authorization foundation (GD-02).
 *
 * Mechanism: `chrome.identity.getAuthToken` — the officially documented path for
 * extensions using Google OAuth (manifest `oauth2` key + `identity` permission).
 * Chrome manages the account picker, consent UI, in-memory token cache, and token
 * expiration; this module never persists, logs, or transmits tokens anywhere
 * except returning them in-memory to a caller (GD-03 Drive client).
 *
 * Scope policy (least privilege): exactly one scope,
 * `https://www.googleapis.com/auth/drive.appdata` — a NON-SENSITIVE Drive scope
 * ("View and manage the app's own configuration data in your Google Drive").
 * Verified 2026-10-18 against:
 *   - https://developer.chrome.com/docs/extensions/reference/api/identity
 *   - https://developer.chrome.com/docs/extensions/reference/manifest/oauth2
 *   - https://developer.chrome.com/docs/extensions/how-to/integrate/oauth
 *   - https://developers.google.com/workspace/drive/api/guides/appdata
 *   - https://developers.google.com/workspace/drive/api/guides/api-specific-auth
 * See docs/google-drive-integration/oauth-contract.md for the full record.
 *
 * Purity: no IndexedDB, no network, no DOM. `chrome.*` is only touched through
 * the injectable `AuthDeps` seam so every decision path is unit-testable with
 * stubs (node:test, no browser).
 */

/** The single OAuth scope this extension may ever request. */
export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

/** Canonical scope list; the shipping manifest must match exactly. */
export const OAUTH_SCOPES: readonly string[] = [DRIVE_APPDATA_SCOPE];

/**
 * Sentinel value shipping in `public/manifest.json` until the extension
 * publisher supplies their own Google Cloud OAuth client ID (application type
 * "Chrome Extension", Item ID = extension ID). Mirrors the placeholder style
 * used in the official manifest `oauth2` documentation. Never a secret.
 */
export const PLACEHOLDER_CLIENT_ID = 'YOUR_EXTENSION_OAUTH_CLIENT_ID.apps.googleusercontent.com';

/**
 * Google Account page where a user can revoke the extension's grant. Sign-out
 * in-app clears Chrome's cached tokens; full server-side revocation is a user
 * account action on this page.
 */
export const GOOGLE_ACCOUNT_PERMISSIONS_URL = 'https://myaccount.google.com/permissions';

const CLIENT_ID_PATTERN = /^[0-9A-Za-z_-]+\.apps\.googleusercontent\.com$/;

export interface ManifestOAuth2 {
  client_id?: unknown;
  scopes?: unknown;
}

/** Minimal manifest shape this module depends on. */
export interface ManifestLike {
  oauth2?: ManifestOAuth2;
  permissions?: unknown;
}

export type OAuthConfigProblemCode =
  | 'missing-oauth2-key'
  | 'missing-client-id'
  | 'placeholder-client-id'
  | 'invalid-client-id'
  | 'scope-mismatch'
  | 'missing-identity-permission';

export interface OAuthConfigProblem {
  code: OAuthConfigProblemCode;
  message: string;
}

export type OAuthConfig =
  | { ok: true; clientId: string; scopes: string[] }
  | { ok: false; problem: OAuthConfigProblem };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Validate the OAuth-related manifest configuration. Enforces the exact
 * least-privilege scope set and recognizes the documented placeholder client ID
 * as "not configured yet" rather than a runtime failure.
 */
export function resolveOAuthConfig(manifest: ManifestLike | null | undefined): OAuthConfig {
  if (!manifest || typeof manifest !== 'object' || !manifest.oauth2 || typeof manifest.oauth2 !== 'object') {
    return {
      ok: false,
      problem: {
        code: 'missing-oauth2-key',
        message: 'Manifest is missing the "oauth2" key required by chrome.identity.getAuthToken.',
      },
    };
  }

  const oauth2: ManifestOAuth2 = manifest.oauth2;

  if (typeof oauth2.client_id !== 'string' || oauth2.client_id.trim() === '') {
    return {
      ok: false,
      problem: {
        code: 'missing-client-id',
        message: 'Manifest oauth2.client_id is missing or empty.',
      },
    };
  }

  const clientId = oauth2.client_id.trim();
  if (clientId === PLACEHOLDER_CLIENT_ID) {
    return {
      ok: false,
      problem: {
        code: 'placeholder-client-id',
        message:
          'oauth2.client_id is still the placeholder. The publisher must create an OAuth client ' +
          'of application type "Chrome Extension" (Item ID = extension ID) in their own Google ' +
          'Cloud project and put its client ID in public/manifest.json. See ' +
          'docs/google-drive-integration/oauth-contract.md for the exact setup steps.',
      },
    };
  }
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    return {
      ok: false,
      problem: {
        code: 'invalid-client-id',
        message: 'oauth2.client_id does not look like a Google OAuth client ID (<id>.apps.googleusercontent.com).',
      },
    };
  }

  if (!isStringArray(oauth2.scopes)) {
    return {
      ok: false,
      problem: {
        code: 'scope-mismatch',
        message: 'Manifest oauth2.scopes must be an array of scope strings.',
      },
    };
  }

  const expected = [...OAUTH_SCOPES].sort();
  const actual = [...oauth2.scopes].sort();
  const sameSet = expected.length === actual.length && expected.every((scope, i) => scope === actual[i]);
  if (!sameSet) {
    return {
      ok: false,
      problem: {
        code: 'scope-mismatch',
        message: `oauth2.scopes must be exactly ${JSON.stringify(expected)} (least privilege), got ${JSON.stringify(actual)}.`,
      },
    };
  }

  const permissions = isStringArray(manifest.permissions) ? manifest.permissions : [];
  if (!permissions.includes('identity')) {
    return {
      ok: false,
      problem: {
        code: 'missing-identity-permission',
        message: 'Manifest permissions must include "identity" for chrome.identity.getAuthToken.',
      },
    };
  }

  return { ok: true, clientId, scopes: [...oauth2.scopes] };
}

export interface GetAuthTokenDetails {
  interactive?: boolean;
  scopes?: string[];
}

export interface IdentityToken {
  token?: string;
  grantedScopes?: string[];
}

/** Injectable chrome.identity/chrome.runtime surface (test seam). */
export interface AuthDeps {
  getAuthToken(details?: GetAuthTokenDetails): Promise<IdentityToken>;
  clearAllCachedAuthTokens(): Promise<void>;
  getManifest(): ManifestLike;
}

function defaultDeps(): AuthDeps | null {
  const chromeApi = (globalThis as { chrome?: unknown }).chrome as
    | {
        identity?: {
          getAuthToken?: (details?: GetAuthTokenDetails) => Promise<IdentityToken>;
          clearAllCachedAuthTokens?: () => Promise<void>;
        };
        runtime?: { getManifest?: () => unknown };
      }
    | undefined;

  const identity = chromeApi?.identity;
  const getAuthTokenFn = identity?.getAuthToken;
  const clearTokensFn = identity?.clearAllCachedAuthTokens;
  const getManifestFn = chromeApi?.runtime?.getManifest;

  if (!getAuthTokenFn || !clearTokensFn || !getManifestFn) {
    return null;
  }

  return {
    getAuthToken: (details) => getAuthTokenFn(details),
    clearAllCachedAuthTokens: () => clearTokensFn(),
    getManifest: () => getManifestFn() as ManifestLike,
  };
}

export type AuthStatus = 'authorized' | 'not-configured' | 'interaction-required' | 'denied' | 'error';

export type AuthResult =
  | { status: 'authorized'; token: string; grantedScopes?: string[] }
  | { status: 'not-configured'; problem: OAuthConfigProblem }
  | { status: 'interaction-required'; message: string }
  | { status: 'denied'; message: string }
  | { status: 'error'; message: string };

export interface AuthorizeOptions {
  /** True (default) lets Chrome show sign-in/consent UI. Must only be called from explicit user UI. */
  interactive?: boolean;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim() !== '') return error;
  return 'Unknown authorization failure.';
}

/** Map a raw identity error to a typed, user-presentable status. Never logs tokens. */
export function classifyAuthError(raw: string): Extract<AuthResult, { status: 'denied' | 'interaction-required' | 'error' }> {
  const message = raw.trim();
  const lower = message.toLowerCase();
  if (lower.includes('cancel') || lower.includes('dismiss') || lower.includes('closed')) {
    return { status: 'denied', message };
  }
  if (lower.includes('interaction')) {
    return { status: 'interaction-required', message };
  }
  return { status: 'error', message };
}

export interface AuthController {
  /** Validate the manifest's OAuth configuration without touching Chrome APIs. */
  resolveConfig(): OAuthConfig;
  /** Whether Google Drive authorization is usable right now (config supplied). */
  isConfigured(): boolean;
  /** Acquire a Drive token. `interactive` prompts require explicit user-initiated UI (see identity docs). */
  authorize(options?: AuthorizeOptions): Promise<AuthResult>;
  /** Silent token check; maps "prompt would be required" to `interaction-required`. */
  getToken(): Promise<AuthResult>;
  /** Clear Chrome's cached tokens for this extension (in-app sign-out). */
  signOut(): Promise<void>;
}

export function createAuthController(depsOverride?: Partial<AuthDeps>): AuthController {
  const deps: AuthDeps | null = { ...defaultDeps(), ...depsOverride } as AuthDeps;

  function requireDeps(): AuthDeps {
    if (!deps || typeof deps.getAuthToken !== 'function' || typeof deps.clearAllCachedAuthTokens !== 'function' || typeof deps.getManifest !== 'function') {
      throw new Error('chrome.identity is unavailable in this context; inject AuthDeps for testing.');
    }
    return deps;
  }

  function resolveConfig(): OAuthConfig {
    return resolveOAuthConfig(requireDeps().getManifest());
  }

  async function authorize(options?: AuthorizeOptions): Promise<AuthResult> {
    const interactive = options?.interactive !== false;
    const d = requireDeps();
    const config = resolveOAuthConfig(d.getManifest());
    if (!config.ok) {
      return { status: 'not-configured', problem: config.problem };
    }
    try {
      const result = await d.getAuthToken({ interactive, scopes: [...OAUTH_SCOPES] });
      const token = typeof result?.token === 'string' ? result.token : '';
      if (token === '') {
        return { status: 'error', message: 'chrome.identity.getAuthToken resolved without a token.' };
      }
      const grantedScopes = Array.isArray(result?.grantedScopes) ? result.grantedScopes.filter((s) => typeof s === 'string') : undefined;
      return grantedScopes ? { status: 'authorized', token, grantedScopes } : { status: 'authorized', token };
    } catch (error) {
      return classifyAuthError(messageOf(error));
    }
  }

  return {
    resolveConfig,
    isConfigured(): boolean {
      try {
        return resolveConfig().ok;
      } catch {
        return false;
      }
    },
    authorize,
    getToken(): Promise<AuthResult> {
      return authorize({ interactive: false });
    },
    async signOut(): Promise<void> {
      await requireDeps().clearAllCachedAuthTokens();
    },
  };
}
