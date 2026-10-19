/**
 * GD-04 — Cloud snapshot browsing, download-for-export, and deletion.
 *
 * Orchestration over the GD-03 Drive client, GD-01 validation, and GD-02 auth:
 *  - metadata-first browsing: lists are hydrated from Drive metadata + the
 *    snapshot appProperties; file contents are downloaded ONLY on explicit
 *    request (data-contract.md §15);
 *  - newest-first sort (envelope createdAt, fallback Drive createdTime; ties
 *    broken by driveFileId ascending);
 *  - pagination follows nextPageToken with a safety cap (20 pages × 100);
 *  - download validates via parseCloudSnapshot BEFORE the UI may present the
 *    content as a usable snapshot; raw bytes remain available for a safe raw
 *    save of invalid/unsupported files (restore of those stays GD-05-blocked);
 *  - delete is PERMANENT (files.delete) and cloud-only: this module never
 *    reads or writes local storage;
 *  - every operation authorizes first and retries ONCE on 401 after clearing
 *    the cached token (same policy as GD-03's backup orchestrator).
 * All expected failures are typed results — nothing throws, nothing fakes success.
 */
import type { AuthResult } from './auth';
import { createChromeConnectionIntentStore, USER_DISCONNECTED_DRIVE_MESSAGE, type ConnectionIntentStore } from './connection';
import { parseCloudSnapshot } from './snapshot';
import type { ParsedSnapshot } from './types';
import {
  createDriveClient,
  type DriveClient,
  type DriveDeleteResult,
  type DriveSnapshotFileMeta,
  type FetchLike,
} from './driveClient';

/** Safety cap on list pagination (20 pages × pageSize 100 = 2000 entries). */
export const BROWSE_MAX_PAGES = 20;

/** One browsable snapshot, hydrated from Drive metadata + appProperties. */
export interface SnapshotBrowserEntry {
  driveFileId: string;
  /** Drive file name (UTC snapshot filename for our uploads). */
  fileName: string;
  /** appProperties displayName, falling back to the file name minus .json. */
  displayName: string;
  /** Application-level snapshot id; null when the file lacks our appProperties. */
  backupId: string | null;
  /** Envelope creation instant (appProperties), falling back to Drive createdTime. */
  createdAt: string | null;
  /** Drive-side server timestamp for the file. */
  createdTime: string | null;
  appVersion: string | null;
  /** From appProperties; null = unknown until the content is downloaded. */
  schemaVersion: number | null;
  sizeBytes: number | null;
  /** Provisional metadata-only status; full validation happens after download. */
  compatibility: 'v2' | 'unknown';
  /** False for files that lack our backupId appProperty (foreign/corrupted). */
  identifiable: boolean;
}

/** Failures shared by all service operations (auth layer + transport layer). */
export type ServiceFailure =
  | { status: 'not-configured'; problemMessage: string }
  | { status: 'denied'; message: string }
  | { status: 'interaction-required'; message: string }
  | { status: 'unauthorized'; message: string; reason?: string | null }
  | { status: 'forbidden'; message: string; reason?: string | null }
  | { status: 'rate-limited'; message: string; reason?: string | null }
  /** 404 — download/delete of a file that is gone (deleted, never existed, inaccessible). */
  | { status: 'not-found'; message: string; reason?: string | null }
  | { status: 'network-error'; message: string }
  | { status: 'error'; httpStatus: number | null; message: string }
  /** PR-1c: the persisted user disconnect intent is set — no token is acquired,
   * no Drive request is issued, and remote data is NEVER deleted implicitly. */
  | { status: 'user-disconnected'; message: string };

export type BrowseSnapshotsResult =
  | { status: 'ok'; entries: SnapshotBrowserEntry[] }
  | ServiceFailure;

export type DownloadSnapshotOutcome =
  | { status: 'ok'; /** Exact downloaded bytes (for the raw save). */ raw: string; /** Suggested save name (always ends in .json). */ fileName: string; parsed: ParsedSnapshot }
  | ServiceFailure;

export type DeleteSnapshotOutcome =
  | { status: 'ok' }
  | ServiceFailure;

export interface DriveServiceDeps {
  authorize(options?: { interactive?: boolean }): Promise<AuthResult>;
  /** Defaults to a guarded chrome.identity.removeCachedAuthToken adapter. */
  removeCachedAuthToken?(details: { token: string }): Promise<void>;
  fetchImpl?: FetchLike;
  /**
   * PR-1c: persisted user disconnect intent (chrome.storage.local
   * `gdriveUserDisconnected`). Checked BEFORE every authorize: while set, every
   * service operation (browse/download/delete/restore download) returns
   * `user-disconnected` with ZERO token acquisition and ZERO Drive requests —
   * the connection UI and Drive browsing can never contradict each other.
   * Defaults to the guarded chrome adapter; storage read failure ⇒ treated as
   * not-disconnected (probe policy parity).
   */
  connectionIntent?: ConnectionIntentStore;
}

export interface DriveService {
  browse(options?: { maxPages?: number }): Promise<BrowseSnapshotsResult>;
  download(args: { driveFileId: string; fallbackFileName: string }): Promise<DownloadSnapshotOutcome>;
  /** Permanent, cloud-only deletion. The UI must confirm with the snapshot name first. */
  remove(args: { driveFileId: string }): Promise<DeleteSnapshotOutcome>;
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

function hydrateEntry(meta: DriveSnapshotFileMeta): SnapshotBrowserEntry {
  const props = meta.appProperties ?? {};
  const backupId = typeof props['backupId'] === 'string' && props['backupId'] !== '' ? props['backupId'] : null;
  const schemaRaw = Number(props['schemaVersion']);
  const schemaVersion = props['schemaVersion'] !== undefined && Number.isFinite(schemaRaw) ? schemaRaw : null;
  const displayName =
    typeof props['displayName'] === 'string' && props['displayName'] !== ''
      ? props['displayName']
      : meta.name.replace(/\.json$/, '');
  return {
    driveFileId: meta.driveFileId,
    fileName: meta.name,
    displayName,
    backupId,
    createdAt: typeof props['createdAt'] === 'string' && props['createdAt'] !== '' ? props['createdAt'] : meta.createdTime,
    createdTime: meta.createdTime,
    appVersion: typeof props['appVersion'] === 'string' && props['appVersion'] !== '' ? props['appVersion'] : null,
    schemaVersion,
    sizeBytes: meta.sizeBytes,
    compatibility: schemaVersion === 2 ? 'v2' : 'unknown',
    identifiable: backupId !== null,
  };
}

function sortNewestFirst(entries: SnapshotBrowserEntry[]): SnapshotBrowserEntry[] {
  return [...entries].sort((a, b) => {
    const keyA = a.createdAt ?? a.createdTime ?? '';
    const keyB = b.createdAt ?? b.createdTime ?? '';
    if (keyA !== keyB) return keyA < keyB ? 1 : -1; // newest (lexically greatest ISO) first
    return a.driveFileId < b.driveFileId ? -1 : a.driveFileId > b.driveFileId ? 1 : 0;
  });
}

function ensureJsonFileName(name: string): string {
  return name.toLowerCase().endsWith('.json') ? name : `${name}.json`;
}

/** Auth result that is not 'authorized' maps to a typed service failure. */
function authFailure(result: AuthResult): ServiceFailure | null {
  switch (result.status) {
    case 'authorized':
      return null;
    case 'not-configured':
      return { status: 'not-configured', problemMessage: result.problem.message };
    case 'denied':
      return { status: 'denied', message: result.message };
    case 'interaction-required':
      return { status: 'interaction-required', message: result.message };
    case 'error':
      return { status: 'error', httpStatus: null, message: result.message };
  }
}

export function createDriveService(deps: DriveServiceDeps): DriveService {
  const removeCached = deps.removeCachedAuthToken ?? defaultRemoveCachedAuthToken;

  /** authorize → op; on 401 clear cache + silent re-auth + retry ONCE. */
  async function withAuthorizedClient<T extends { status: string }>(
    op: (client: DriveClient) => Promise<T>,
  ): Promise<T | ServiceFailure> {
    // PR-1c step 0: the persisted user disconnect intent is authoritative for
    // ALL user-initiated Drive operations. Checked BEFORE any token lookup —
    // an interactive authorize would silently re-mint a token from the
    // still-valid OAuth grant (removeCachedAuthToken does NOT revoke it), so
    // intent must gate authorization itself.
    const connectionIntent = deps.connectionIntent ?? createChromeConnectionIntentStore();
    let userDisconnected = false;
    try {
      userDisconnected = await connectionIntent.get();
    } catch {
      userDisconnected = false; // storage read failure ⇒ probe policy parity: proceed honestly
    }
    if (userDisconnected) {
      return { status: 'user-disconnected', message: USER_DISCONNECTED_DRIVE_MESSAGE };
    }

    const auth: AuthResult = await deps.authorize({ interactive: true });
    if (auth.status !== 'authorized') {
      // authFailure is non-null for every non-authorized status.
      return authFailure(auth) as ServiceFailure;
    }

    const client = createDriveClient({ token: auth.token, fetchImpl: deps.fetchImpl });
    let result = await op(client);

    if (result.status === 'unauthorized') {
      await removeCached({ token: auth.token }).catch(() => {});
      const reAuth = await deps.authorize({ interactive: false });
      if (reAuth.status === 'authorized') {
        const retryClient = createDriveClient({ token: reAuth.token, fetchImpl: deps.fetchImpl });
        result = await op(retryClient);
      }
    }
    return result;
  }

  return {
    async browse(options) {
      return withAuthorizedClient(async (client) => {
        const maxPages = Math.max(1, options?.maxPages ?? BROWSE_MAX_PAGES);
        const hydrated: SnapshotBrowserEntry[] = [];
        let pageToken: string | null = null;
        let pages = 0;
        do {
          const page = await client.listSnapshotFiles(pageToken ? { pageToken } : {});
          if (page.status !== 'ok') return page;
          for (const meta of page.files) hydrated.push(hydrateEntry(meta));
          pageToken = page.nextPageToken;
          pages += 1;
        } while (pageToken && pages < maxPages);
        return { status: 'ok', entries: sortNewestFirst(hydrated) };
      });
    },

    async download({ driveFileId, fallbackFileName }) {
      const outcome = await withAuthorizedClient(async (client) => client.downloadSnapshotFile({ driveFileId }));
      if (outcome.status !== 'ok') return outcome;
      const parsed = await parseCloudSnapshot(outcome.content);
      return {
        status: 'ok',
        raw: outcome.content,
        fileName: ensureJsonFileName(fallbackFileName),
        parsed,
      };
    },

    async remove({ driveFileId }) {
      return withAuthorizedClient((client) => client.deleteFile({ driveFileId }));
    },
  };
}
