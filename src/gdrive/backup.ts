/**
 * GD-03 — Create and version cloud backups (orchestrator).
 *
 * Explicit, user-initiated flow (D6 — no background anything):
 *   authorize → gather local library (trash-inclusive, read-only) → build v2
 *   snapshot (GD-01 contract) → upload NEW appDataFolder file (GD-03 addendum,
 *   §14 of data-contract.md) → typed outcome. Success is declared ONLY after
 *   Drive confirms the file id (spec). Ambiguous network failures are
 *   reconciled by the unique backupId (via appProperties) BEFORE any retry;
 *   nothing is ever overwritten or deleted; local data is never mutated.
 *
 * Boundary: no GD-04 browse/download UI, no GD-05 restore, no deletions, no
 * retention policy (spec: retain until user deletion, subject to Drive limits).
 */
import { buildCloudSnapshot, createSnapshotFileName } from './snapshot';
import type { BuiltSnapshot } from './types';
import type { AuthResult } from './auth';
import { createChromeConnectionIntentStore, USER_DISCONNECTED_DRIVE_MESSAGE, type ConnectionIntentStore } from './connection';
import { gatherSnapshotData, type GatheredLibrary, type SnapshotReaders } from './gather';
import { createDriveClient, type DriveUploadResult, type FetchLike } from './driveClient';

export interface CloudBackupDeps {
  /** GD-02 auth controller (authorize/getToken/signOut). */
  authorize(options?: { interactive?: boolean }): Promise<AuthResult>;
  /** Optional token-cache clear for the 401 → re-auth → retry-once flow. */
  removeCachedAuthToken?(details: { token: string }): Promise<void>;
  /** Local read bindings (default: the db.ts trash-inclusive helpers). */
  readers: SnapshotReaders;
  fetchImpl?: FetchLike;
  /** Epoch-ms creation instant (injectable ⇒ deterministic tests). */
  clock(): number;
  /** Extension version for the envelope (default: chrome.runtime manifest). */
  getAppVersion?(): string;
  /**
   * PR-1c: persisted user disconnect intent — checked BEFORE authorize so a
   * disconnected user's Create-backup click never acquires a token or issues
   * any Drive request. Defaults to the guarded chrome adapter.
   */
  connectionIntent?: ConnectionIntentStore;
}

export interface CreateCloudBackupOptions {
  /** Optional user-facing label (spec: "Enter a name"); default = file name without .json. */
  displayName?: string;
}

export interface CloudBackupSuccess {
  status: 'created';
  backupId: string;
  fileName: string;
  displayName: string;
  driveFileId: string;
  sizeBytes: number | null;
  appVersion: string;
  /** 'unknown' on the reconciled path — the successful attempt's method can't be observed. */
  uploadMethod: 'multipart' | 'resumable' | 'unknown';
  /** True when a previous ambiguous attempt actually succeeded. */
  reconciled: boolean;
  counts: GatheredLibrary['counts'];
}

export type CloudBackupOutcome =
  | CloudBackupSuccess
  | { status: 'not-configured'; problemMessage: string }
  | { status: 'denied'; message: string }
  | { status: 'interaction-required'; message: string }
  | { status: 'unauthorized'; message: string }
  | { status: 'failed'; reason: 'auth-error' | 'gather-failed' | 'build-failed' | 'forbidden' | 'ambiguous' | 'http-error' | 'network-error' | 'user-disconnected'; message: string };

function defaultAppVersion(): string {
  const chromeApi = (globalThis as { chrome?: { runtime?: { getManifest?: () => { version?: unknown } } } }).chrome;
  const version = chromeApi?.runtime?.getManifest?.().version;
  return typeof version === 'string' && version.trim() !== '' ? version : 'unknown';
}

export function createCloudBackup(deps: CloudBackupDeps, options?: CreateCloudBackupOptions): Promise<CloudBackupOutcome> {
  return run(deps, options ?? {});
}

async function run(deps: CloudBackupDeps, options: CreateCloudBackupOptions): Promise<CloudBackupOutcome> {
  // 0. PR-1c: persisted user disconnect intent is authoritative BEFORE any
  // token lookup — an interactive authorize would silently re-mint a token
  // from the still-valid OAuth grant. Nothing is uploaded, nothing deleted.
  const connectionIntent = deps.connectionIntent ?? createChromeConnectionIntentStore();
  let userDisconnected = false;
  try {
    userDisconnected = await connectionIntent.get();
  } catch {
    userDisconnected = false; // storage read failure ⇒ probe policy parity: proceed honestly
  }
  if (userDisconnected) {
    return { status: 'failed', reason: 'user-disconnected', message: USER_DISCONNECTED_DRIVE_MESSAGE };
  }

  // 1. Authorization — interactive prompt only because the user explicitly asked for a backup.
  const auth: AuthResult = await deps.authorize({ interactive: true });
  if (auth.status === 'not-configured') {
    return { status: 'not-configured', problemMessage: auth.problem.message };
  }
  if (auth.status === 'denied') return { status: 'denied', message: auth.message };
  if (auth.status === 'interaction-required') return { status: 'interaction-required', message: auth.message };
  if (auth.status === 'error') return { status: 'failed', reason: 'auth-error', message: auth.message };

  // 2. Gather (read-only; throws mapped to typed failure).
  let gathered: GatheredLibrary;
  try {
    gathered = await gatherSnapshotData(deps.readers);
  } catch (error) {
    return { status: 'failed', reason: 'gather-failed', message: error instanceof Error ? error.message : String(error) };
  }

  // 3. Build the v2 snapshot per the GD-01 contract.
  const createdAtMs = deps.clock();
  const fileName = createSnapshotFileName(createdAtMs);
  const appVersion = deps.getAppVersion?.() || defaultAppVersion();
  let built: BuiltSnapshot;
  try {
    built = await buildCloudSnapshot({
      snippets: gathered.snippets,
      categories: gathered.categories,
      preferences: gathered.preferences,
      appVersion,
      createdAtMs,
      displayName: options.displayName,
    });
  } catch (error) {
    return { status: 'failed', reason: 'build-failed', message: error instanceof Error ? error.message : String(error) };
  }

  const client = createDriveClient({ token: auth.token, fetchImpl: deps.fetchImpl });
  const metadata = {
    fileName,
    properties: {
      backupId: built.envelope.backupId,
      schemaVersion: String(built.envelope.schemaVersion),
      createdAt: built.envelope.createdAt,
      appVersion,
      // GD-04: user-facing label becomes listable without downloading the file.
      displayName: built.envelope.displayName,
    },
  };

  // 4. Upload — a NEW file every time; never overwrites.
  let upload: DriveUploadResult = await client.uploadSnapshotJson({ metadata, json: built.serialized });

  // 5. 401 → clear cache, silent re-auth, retry ONCE with the fresh token.
  if (upload.status === 'unauthorized') {
    if (deps.removeCachedAuthToken) {
      await deps.removeCachedAuthToken({ token: auth.token }).catch(() => {});
    }
    const reAuth = await deps.authorize({ interactive: false });
    if (reAuth.status === 'authorized') {
      const retryClient = createDriveClient({ token: reAuth.token, fetchImpl: deps.fetchImpl });
      upload = await retryClient.uploadSnapshotJson({ metadata, json: built.serialized });
    }
  }
  if (upload.status === 'unauthorized') {
    return { status: 'unauthorized', message: upload.message };
  }

  // 6. Ambiguous network failure → reconcile by unique backupId BEFORE retrying.
  if (upload.status === 'network-error') {
    const probe = await client.listSnapshotFiles({ backupId: built.envelope.backupId });
    if (probe.status === 'ok') {
      const first = probe.files.length === 1 ? probe.files[0] : undefined;
      if (probe.files.length === 1 && first) {
        return {
          status: 'created',
          backupId: built.envelope.backupId,
          fileName,
          displayName: built.envelope.displayName,
          driveFileId: first.driveFileId,
          sizeBytes: first.sizeBytes,
          appVersion,
          uploadMethod: 'unknown',
          reconciled: true,
          counts: gathered.counts,
        };
      }
      if (probe.files.length === 0) {
        return { status: 'failed', reason: 'network-error', message: `Upload did not reach Drive (no file for ${built.envelope.backupId}). You can retry.` };
      }
      return {
        status: 'failed',
        reason: 'ambiguous',
        message: `Found ${probe.files.length} files for backup ID ${built.envelope.backupId}. Nothing was changed or deleted; resolve duplicates in the backup list.`,
      };
    }
    return { status: 'failed', reason: 'network-error', message: upload.message };
  }

  if (upload.status === 'forbidden') {
    // PR-1: surface Drive's precise reason (rateLimitExceeded ≠ permissions).
    const detail = upload.reason ? ` (${upload.reason})` : '';
    return { status: 'failed', reason: 'forbidden', message: `${upload.message}${detail}` };
  }
  if (upload.status === 'error') {
    return { status: 'failed', reason: 'http-error', message: upload.message };
  }

  // 7. Confirmed success (Drive returned the file id).
  return {
    status: 'created',
    backupId: built.envelope.backupId,
    fileName,
    displayName: built.envelope.displayName,
    driveFileId: upload.driveFileId,
    sizeBytes: upload.sizeBytes ?? built.sizeBytes,
    appVersion,
    uploadMethod: upload.uploadMethod,
    reconciled: false,
    counts: gathered.counts,
  };
}

export { defaultAppVersion };
