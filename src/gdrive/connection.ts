/**
 * PR-1 — Google Drive connection probe: real startup state + account identity.
 *
 * Problem it fixes: the GD-07 connection row derived its state ONLY from
 * in-session auth outcomes, so after an extension/app restart the UI showed
 * "Connect" even though Chrome still held a valid cached token (the
 * chrome.identity token cache survives restarts). This module verifies the
 * REAL state non-interactively:
 *
 *   1. The manifest OAuth config must be valid (else 'setup-needed').
 *   2. A SILENT chrome.identity.getAuthToken ({interactive:false}) must yield
 *      a token. It never shows a prompt — worst case it resolves
 *      interaction-required / denied, which maps to 'disconnected'.
 *   3. The token must actually work against Drive: `about.get` with
 *      fields=user(displayName,emailAddress,photoLink). Per the official
 *      Drive v3 reference (verified 2026-10-19),
 *      https://www.googleapis.com/auth/drive.appdata is one of the documented
 *      authorization scopes for about.get — so NO additional OAuth scope or
 *      manifest permission is needed for identity.
 *      A 200 therefore proves BOTH "the account is connected" AND "Drive
 *      appdata access works", and returns the account identity in one call.
 *
 * Failure honesty: 401 → clear the cached token and retry the silent flow
 * once (revoked/expired tokens surface as 'disconnected', so the UI offers
 * Connect); 403 → 'connection-error' with a reason-specific message (rate
 * limit ≠ permissions); offline/5xx → 'connection-error'. Nothing throws,
 * nothing fakes success.
 *
 * Purity: no storage, no DOM, no logging. Tokens exist only in flight; the
 * returned identity is plain in-memory data for the UI and is never persisted.
 * Disconnect (auth sign-out) + a fresh probe clears it.
 */

import {
  type AuthResult,
  type ManifestLike,
  resolveOAuthConfig,
  createAuthController,
} from './auth';
import { DRIVE_RATE_LIMIT_403_REASONS, type FetchLike } from './driveClient';

/** Connected Google Account identity (exactly what Drive's about.get returns). */
export interface DriveAccountIdentity {
  email: string | null;
  displayName: string | null;
  /** Google-hosted avatar URL (https only; null when unavailable). */
  photoUrl: string | null;
}

export type DriveConnectionState =
  | { status: 'setup-needed'; problemCode: string; message: string }
  /** Configured but no usable silent token: not signed in, previously denied,
   *  or Chrome needs interaction — or the USER explicitly disconnected
   *  ('user-requested'), which persists across popups/restarts and can only be
   *  cleared by an explicit Connect click. Never prompts. */
  | { status: 'disconnected'; reason: 'denied' | 'interaction-required' | 'error' | 'user-requested'; message: string | null }
  /** A token exists but Drive refused/unreachable: distinct from plain
   *  disconnected so the UI can show a precise reason (Task: precise errors). */
  | { status: 'connection-error'; message: string }
  | { status: 'connected'; account: DriveAccountIdentity };

/** about.get: identity fields only; `fields` is REQUIRED by the endpoint. */
const ABOUT_URI = 'https://www.googleapis.com/drive/v3/about';

export interface ConnectionProbeDeps {
  /** MUST be the silent variant; the probe never prompts. */
  authorize(options: { interactive: boolean }): Promise<AuthResult>;
  getManifest(): ManifestLike | null | undefined;
  removeCachedAuthToken(details: { token: string }): Promise<void>;
  /** Persisted USER disconnect intent (PR-1b). Checked BEFORE any auth or
   *  network call: while true, even a freshly minted silent token cannot make
   *  the probe report connected. Only an explicit Connect click may clear it. */
  connectionIntent?: ConnectionIntentStore;
  fetchImpl?: FetchLike;
}

/**
 * PR-1b — persisted user disconnect intent.
 *
 * Root cause this fixes: `chrome.identity.removeCachedAuthToken` only evicts
 * the LOCAL token cache entry — the OAuth GRANT (user consent) stays valid at
 * Google, so the next silent `getAuthToken` mints a brand-new token and the
 * probe honestly-but-wrongly reported "connected" again after a popup reopen.
 * A disconnect decision therefore MUST outlive the popup: it is persisted in
 * `chrome.storage.local` and honored before any token lookup. This is an
 * app-level switch, not a server-side revocation (Chrome's identity API has
 * no grant-revocation; that remains a Google Account action — oauth-contract §5).
 */
export const USER_DISCONNECTED_STORAGE_KEY = 'gdriveUserDisconnected';

/**
 * PR-1c: single user-facing message for any user-initiated Drive operation
 * (browse / download / delete / backup create) attempted while the persisted
 * disconnect intent is set. One policy, one message, everywhere.
 */
export const USER_DISCONNECTED_DRIVE_MESSAGE = 'Google Drive is disconnected — click Connect to reconnect.';

export interface ConnectionIntentStore {
  /** Resolves true when the user explicitly disconnected (errors ⇒ false). */
  get(): Promise<boolean>;
  /** Persists/clears the flag (best effort; never rejects). */
  set(value: boolean): Promise<void>;
}

interface ChromeStorageLocal {
  get?: (keys: string[], callback: (items: Record<string, unknown>) => void) => void;
  set?: (items: Record<string, unknown>, callback: () => void) => void;
}

function chromeStorageLocal(): ChromeStorageLocal | undefined {
  try {
    return (globalThis as unknown as {
      chrome?: { storage?: { local?: ChromeStorageLocal } };
    }).chrome?.storage?.local;
  } catch {
    return undefined;
  }
}

export function createChromeConnectionIntentStore(): ConnectionIntentStore {
  return {
    get(): Promise<boolean> {
      const api = chromeStorageLocal();
      if (!api?.get) return Promise.resolve(false);
      return new Promise((resolve) => {
        try {
          api.get!([USER_DISCONNECTED_STORAGE_KEY], (items) => {
            try {
              resolve(items?.[USER_DISCONNECTED_STORAGE_KEY] === true);
            } catch {
              resolve(false);
            }
          });
        } catch {
          resolve(false);
        }
      });
    },
    set(value: boolean): Promise<void> {
      const api = chromeStorageLocal();
      if (!api?.set) return Promise.resolve();
      return new Promise((resolve) => {
        try {
          api.set!({ [USER_DISCONNECTED_STORAGE_KEY]: value }, () => resolve());
        } catch {
          resolve();
        }
      });
    },
  };
}

function defaultGetManifest(): ManifestLike | null {
  try {
    const chromeApi = (globalThis as unknown as {
      chrome?: { runtime?: { getManifest?: () => ManifestLike } };
    }).chrome;
    const manifest = chromeApi?.runtime?.getManifest?.();
    return manifest ?? null;
  } catch {
    return null;
  }
}

function defaultRemoveCachedAuthToken(details: { token: string }): Promise<void> {
  const chromeApi = (globalThis as unknown as {
    chrome?: { identity?: { removeCachedAuthToken?: (d: { token: string }, cb: () => void) => void } };
  }).chrome;
  return new Promise((resolve) => {
    try {
      const removeFn = chromeApi?.identity?.removeCachedAuthToken;
      if (!removeFn) {
        resolve();
        return;
      }
      removeFn({ token: details.token }, () => resolve());
    } catch {
      resolve();
    }
  });
}

type IdentityAttempt =
  | { kind: 'ok'; account: DriveAccountIdentity }
  | { kind: 'http'; httpStatus: number; reason: string | null; message: string }
  | { kind: 'network'; message: string };

function normalizeIdentity(user: Record<string, unknown>): DriveAccountIdentity {
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
  const photo = str(user['photoLink']);
  return {
    email: str(user['emailAddress']),
    displayName: str(user['displayName']),
    // Only render Google's https avatar links — never an arbitrary scheme.
    photoUrl: photo !== null && photo.startsWith('https://') ? photo : null,
  };
}

function describeIdentityHttpFailure(attempt: Extract<IdentityAttempt, { kind: 'http' }>): string {
  if (attempt.httpStatus === 403) {
    if (attempt.reason !== null && DRIVE_RATE_LIMIT_403_REASONS.has(attempt.reason)) {
      return 'Google Drive rate limit reached — try again in a moment.';
    }
    if (attempt.reason === 'insufficientPermissions' || attempt.reason === 'serviceDisabled') {
      return 'Google Drive access is not available for this app — verify the Drive API is enabled and this account is a Test user.';
    }
    return attempt.reason !== null
      ? `Google Drive refused the request (${attempt.reason}).`
      : 'Google Drive refused the request.';
  }
  if (attempt.httpStatus === 401) {
    return 'Google authorization expired and could not be refreshed.';
  }
  return attempt.message !== '' ? attempt.message : `Google Drive request failed with HTTP ${attempt.httpStatus}.`;
}

export function createConnectionProbe(depsOverride?: Partial<ConnectionProbeDeps>): {
  probe(): Promise<DriveConnectionState>;
} {
  const fetchImpl: FetchLike = depsOverride?.fetchImpl ?? ((input, init) => fetch(input, init));
  const getManifest = depsOverride?.getManifest ?? defaultGetManifest;
  const removeCachedAuthToken = depsOverride?.removeCachedAuthToken ?? defaultRemoveCachedAuthToken;
  const connectionIntent = depsOverride?.connectionIntent ?? createChromeConnectionIntentStore();
  const authorize =
    depsOverride?.authorize ??
    ((options: { interactive: boolean }) => createAuthController().authorize(options));

  async function fetchIdentity(token: string): Promise<IdentityAttempt> {
    const params = new URLSearchParams({ fields: 'user(displayName,emailAddress,photoLink)' });
    let response: Response;
    try {
      response = await fetchImpl(`${ABOUT_URI}?${params.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      return { kind: 'network', message: error instanceof Error ? error.message : String(error) };
    }
    let body: Record<string, unknown> = {};
    try {
      const parsed = await response.json();
      if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
    } catch {
      body = {};
    }
    if (response.status !== 200) {
      const err = body['error'];
      let reason: string | null = null;
      let message = '';
      if (err && typeof err === 'object') {
        const errObj = err as { message?: unknown; errors?: unknown; details?: unknown };
        if (typeof errObj.message === 'string') message = errObj.message;
        if (Array.isArray(errObj.errors)) {
          for (const entry of errObj.errors) {
            const r = (entry as { reason?: unknown })?.reason;
            if (typeof r === 'string' && r !== '') {
              reason = r;
              break;
            }
          }
        }
        if (reason === null && Array.isArray(errObj.details)) {
          for (const entry of errObj.details) {
            const r = (entry as { reason?: unknown })?.reason;
            if (typeof r === 'string' && r !== '') {
              reason = r;
              break;
            }
          }
        }
      }
      return { kind: 'http', httpStatus: response.status, reason, message };
    }
    const user = body['user'];
    return { kind: 'ok', account: normalizeIdentity(user && typeof user === 'object' ? (user as Record<string, unknown>) : {}) };
  }

  function disconnectedFromAuth(result: AuthResult): DriveConnectionState {
    switch (result.status) {
      case 'authorized':
        // Unreachable by construction; kept for exhaustiveness.
        return { status: 'disconnected', reason: 'error', message: null };
      case 'denied':
        return { status: 'disconnected', reason: 'denied', message: null };
      case 'interaction-required':
        return {
          status: 'disconnected',
          reason: 'interaction-required',
          message: 'Google needs you to re-confirm access — click Connect.',
        };
      case 'not-configured':
        return { status: 'setup-needed', problemCode: result.problem.code, message: result.problem.message };
      case 'error':
        return { status: 'disconnected', reason: 'error', message: result.message };
    }
  }

  return {
    async probe(): Promise<DriveConnectionState> {
      // 1. Config gate — cheap, synchronous, no Chrome account interaction.
      const config = resolveOAuthConfig(getManifest());
      if (!config.ok) {
        return { status: 'setup-needed', problemCode: config.problem.code, message: config.problem.message };
      }

      // 1.5 PR-1b — the user's persisted disconnect choice is authoritative and
      // is checked BEFORE any token lookup: Chrome re-mints silent tokens from
      // the still-valid OAuth grant, so a cached/fresh token must never
      // override an explicit Disconnect. A storage read failure is treated as
      // "not disconnected" (probe proceeds) rather than blocking connection
      // checks forever.
      let userDisconnected = false;
      try {
        userDisconnected = await connectionIntent.get();
      } catch {
        userDisconnected = false;
      }
      if (userDisconnected) {
        return {
          status: 'disconnected',
          reason: 'user-requested',
          message: 'You disconnected Google Drive. Click Connect to reconnect.',
        };
      }

      // 2. Silent token check — verifies Chrome still holds a usable grant.
      const auth = await authorize({ interactive: false });
      if (auth.status !== 'authorized') return disconnectedFromAuth(auth);

      // 3. Prove the token works against Drive and fetch identity in one call.
      let identity = await fetchIdentity(auth.token);
      if (identity.kind === 'http' && identity.httpStatus === 401) {
        // Cached token was revoked/expired server-side: clear it and retry the
        // silent flow ONCE (same policy as the GD-03/04 operations).
        await removeCachedAuthToken({ token: auth.token }).catch(() => {});
        const reAuth = await authorize({ interactive: false });
        if (reAuth.status !== 'authorized') return disconnectedFromAuth(reAuth);
        identity = await fetchIdentity(reAuth.token);
      }

      if (identity.kind === 'ok') return { status: 'connected', account: identity.account };
      if (identity.kind === 'network') {
        return { status: 'connection-error', message: 'Could not reach Google Drive. Check your connection.' };
      }
      // A brand-new silent token STILL rejected with 401 means the cached grant
      // is effectively dead (revoked server-side); the honest state is
      // disconnected so the UI offers Connect — interactive consent can fix it.
      if (identity.httpStatus === 401) {
        return { status: 'disconnected', reason: 'error', message: 'Google authorization expired — click Connect to sign in again.' };
      }
      return { status: 'connection-error', message: describeIdentityHttpFailure(identity) };
    },
  };
}
