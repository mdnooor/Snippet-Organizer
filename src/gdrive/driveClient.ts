/**
 * GD-03 — Google Drive client (appDataFolder snapshot operations).
 *
 * Implements ONLY what "create and version cloud backups" needs, using the
 * GD-02 `drive.appdata` authorization token. All Drive API facts were verified
 * live on 2026-10-18 against:
 *   - https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create
 *     (upload URI POST https://www.googleapis.com/upload/drive/v3/files; uploadType=multipart
 *     is limited to files ≤ 5 MB)
 *   - https://developers.google.com/workspace/drive/api/guides/manage-uploads
 *     (multipart ≤ 5 MB; resumable init → Location session URI → PUT data)
 *   - https://developers.google.com/workspace/drive/api/reference/rest/v3/files
 *     (appProperties: key/value metadata private to the requesting app)
 *   - https://developers.google.com/workspace/drive/api/guides/search-files
 *     (query: appProperties has { key='k' and value='v' }, name contains 'x')
 *   - https://developers.google.com/workspace/drive/api/guides/appdata
 *     (parents=['appDataFolder'], files.list with spaces=appDataFolder)
 *
 * Pure networking only: no storage writes, no DOM, no logging of tokens or
 * snapshot content. Every call is user-initiated via the orchestrator (D6).
 */
import type { SnapshotListEntry } from './types';

/** Multipart uploads are officially limited to 5 MB; larger payloads use resumable. */
export const MULTIPART_MAX_BYTES = 5 * 1024 * 1024;

const UPLOAD_URI = 'https://www.googleapis.com/upload/drive/v3/files';
const LIST_URI = 'https://www.googleapis.com/drive/v3/files';
const JSON_MIME = 'application/json';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface DriveFileMetadata {
  /** UTC snapshot file name, e.g. snippet-organizer-snapshot-20261018T103000Z.json */
  fileName: string;
  /** App-private, queryable properties (backupId, schemaVersion, createdAt, appVersion). */
  properties: Record<string, string>;
}

export type DriveUploadResult =
  | { status: 'ok'; driveFileId: string; name: string; sizeBytes: number | null; uploadMethod: 'multipart' | 'resumable' }
  /** 401 — token invalid/expired; caller may clear cache, re-authorize, retry once. */
  | { status: 'unauthorized'; message: string; reason?: string | null }
  /** 403 — scope/appDataFolder violation or quota; never retried automatically.
   *  `reason` carries Drive's precise error reason (e.g. insufficientPermissions,
   *  rateLimitExceeded) so the UI never has to guess (PR-1). */
  | { status: 'forbidden'; message: string; reason?: string | null }
  /** fetch itself threw — AMBIGUOUS: the request may have reached Drive; reconcile by backupId. */
  | { status: 'network-error'; message: string }
  | { status: 'error'; httpStatus: number | null; message: string };

export interface DriveSnapshotFileMeta {
  driveFileId: string;
  name: string;
  sizeBytes: number | null;
  createdTime: string | null;
  appProperties: Record<string, string>;
}

export type DriveListResult =
  | { status: 'ok'; files: DriveSnapshotFileMeta[]; nextPageToken: string | null }
  | { status: 'unauthorized'; message: string; reason?: string | null }
  | { status: 'forbidden'; message: string; reason?: string | null }
  /** 429 — Drive rate limit; surfaced distinctly so callers can back off (GD-04). */
  | { status: 'rate-limited'; message: string; reason?: string | null }
  /** 404 — kept for taxonomy completeness across the shared failure mapper. */
  | { status: 'not-found'; message: string; reason?: string | null }
  | { status: 'network-error'; message: string }
  | { status: 'error'; httpStatus: number | null; message: string };

/** GD-04 — raw file content via files.get?alt=media (verified endpoint). */
export type DriveDownloadResult =
  | { status: 'ok'; content: string; sizeBytes: number | null }
  /** 404 — file missing (never uploaded, already deleted, or inaccessible). */
  | { status: 'not-found'; message: string; reason?: string | null }
  | { status: 'unauthorized'; message: string; reason?: string | null }
  | { status: 'forbidden'; message: string; reason?: string | null }
  | { status: 'rate-limited'; message: string; reason?: string | null }
  | { status: 'network-error'; message: string }
  | { status: 'error'; httpStatus: number | null; message: string };

/** GD-04 — files.delete is PERMANENT (no trash in appDataFolder; verified endpoint). */
export type DriveDeleteResult =
  | { status: 'ok' }
  | { status: 'not-found'; message: string; reason?: string | null }
  | { status: 'unauthorized'; message: string; reason?: string | null }
  | { status: 'forbidden'; message: string; reason?: string | null }
  | { status: 'rate-limited'; message: string; reason?: string | null }
  | { status: 'network-error'; message: string }
  | { status: 'error'; httpStatus: number | null; message: string };

export interface DriveClient {
  /** Create a NEW appDataFolder file holding the serialized envelope. Never overwrites. */
  uploadSnapshotJson(args: { metadata: DriveFileMetadata; json: string }): Promise<DriveUploadResult>;
  /** List snapshot file metadata (GD-03 reconciliation; GD-04 browse). Read-only, paginated. */
  listSnapshotFiles(args: { backupId?: string; fileNameEquals?: string; pageToken?: string }): Promise<DriveListResult>;
  /** GD-04: download raw file content (metadata-first policy: only on explicit request). */
  downloadSnapshotFile(args: { driveFileId: string }): Promise<DriveDownloadResult>;
  /** GD-04: PERMANENTLY delete one cloud file. Cloud-only; confirmation is the caller's duty. */
  deleteFile(args: { driveFileId: string }): Promise<DriveDeleteResult>;
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const body = await response.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function messageFrom(response: Response, body: Record<string, unknown>): string {
  const err = body['error'];
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') return message;
  }
  const reason = reasonFrom(body);
  return `Drive request failed with HTTP ${response.status}${reason !== null ? ` (${reason})` : ''}.`;
}

/**
 * PR-1 — Drive's precise error reason, read from the documented error body:
 * classic style `error.errors[].reason` and newer `error.details[].reason`.
 * Lets the UI distinguish e.g. insufficientPermissions from rateLimitExceeded
 * instead of showing every failure as a generic "permissions" problem.
 */
export function reasonFrom(body: Record<string, unknown>): string | null {
  const err = body['error'];
  if (!err || typeof err !== 'object') return null;
  const errObj = err as { errors?: unknown; details?: unknown };
  if (Array.isArray(errObj.errors)) {
    for (const entry of errObj.errors) {
      const reason = (entry as { reason?: unknown })?.reason;
      if (typeof reason === 'string' && reason !== '') return reason;
    }
  }
  if (Array.isArray(errObj.details)) {
    for (const entry of errObj.details) {
      const reason = (entry as { reason?: unknown })?.reason;
      if (typeof reason === 'string' && reason !== '') return reason;
    }
  }
  return null;
}

/**
 * Drive rate-limits with BOTH 403 (these reasons) and 429. Treating every 403
 * as "permissions" mislabeled transient quota failures; the extended mapper
 * promotes this family to 'rate-limited' (PR-1).
 */
export const DRIVE_RATE_LIMIT_403_REASONS: ReadonlySet<string> = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'dailyLimitExceeded',
  'rateLimitExceededUnreg',
  'sharedLimitExceeded',
]);

type HttpFailure =
  | { status: 'unauthorized'; message: string; reason: string | null }
  | { status: 'forbidden'; message: string; reason: string | null }
  | { status: 'error'; httpStatus: number | null; message: string };

function mapHttpFailure(response: Response, body: Record<string, unknown>): HttpFailure {
  if (response.status === 401) return { status: 'unauthorized', message: messageFrom(response, body), reason: reasonFrom(body) };
  if (response.status === 403) return { status: 'forbidden', message: messageFrom(response, body), reason: reasonFrom(body) };
  return { status: 'error', httpStatus: response.status, message: messageFrom(response, body) };
}

/** GD-04 operations additionally distinguish 404 (missing) and 429 (rate limit). */
type ExtendedHttpFailure =
  | { status: 'unauthorized'; message: string; reason: string | null }
  | { status: 'forbidden'; message: string; reason: string | null }
  | { status: 'rate-limited'; message: string; reason: string | null }
  | { status: 'not-found'; message: string; reason: string | null }
  | { status: 'error'; httpStatus: number | null; message: string };

function mapExtendedHttpFailure(response: Response, body: Record<string, unknown>): ExtendedHttpFailure {
  const reason = reasonFrom(body);
  if (response.status === 404) return { status: 'not-found', message: messageFrom(response, body), reason };
  if (response.status === 429) return { status: 'rate-limited', message: messageFrom(response, body), reason };
  // 403 IS a rate limit for this documented reason family — surface it honestly.
  if (response.status === 403 && reason !== null && DRIVE_RATE_LIMIT_403_REASONS.has(reason)) {
    return { status: 'rate-limited', message: messageFrom(response, body), reason };
  }
  if (response.status === 401) return { status: 'unauthorized', message: messageFrom(response, body), reason };
  if (response.status === 403) return { status: 'forbidden', message: messageFrom(response, body), reason };
  return { status: 'error', httpStatus: response.status, message: messageFrom(response, body) };
}

function parseFileMeta(raw: Record<string, unknown>): DriveSnapshotFileMeta | null {
  const id = typeof raw['id'] === 'string' ? raw['id'] : '';
  if (id === '') return null;
  const size = typeof raw['size'] === 'string' ? Number(raw['size']) : typeof raw['size'] === 'number' ? raw['size'] : null;
  const props = raw['appProperties'];
  return {
    driveFileId: id,
    name: typeof raw['name'] === 'string' ? raw['name'] : '',
    sizeBytes: size !== null && Number.isFinite(size) ? size : null,
    createdTime: typeof raw['createdTime'] === 'string' ? raw['createdTime'] : null,
    appProperties: props && typeof props === 'object' ? (props as Record<string, string>) : {},
  };
}

export function createDriveClient(deps: { token: string; fetchImpl?: FetchLike }): DriveClient {
  const fetchImpl: FetchLike = deps.fetchImpl ?? ((input, init) => fetch(input, init));
  const authHeader = { Authorization: `Bearer ${deps.token}` };

  function buildQuery(fields: string, q?: string): string {
    const params = new URLSearchParams({ fields });
    if (q) params.set('q', q);
    return params.toString();
  }

  function multipartBody(metadata: DriveFileMetadata, json: string, boundary: string): string {
    const metaJson = JSON.stringify({
      name: metadata.fileName,
      parents: ['appDataFolder'],
      appProperties: metadata.properties,
    });
    return (
      `--${boundary}\r\n` +
      `Content-Type: ${JSON_MIME}; charset=UTF-8\r\n\r\n` +
      `${metaJson}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${JSON_MIME}\r\n\r\n` +
      `${json}\r\n` +
      `--${boundary}--`
    );
  }

  async function uploadMultipart(metadata: DriveFileMetadata, json: string): Promise<DriveUploadResult> {
    const boundary = `soc_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    const body = multipartBody(metadata, json, boundary);
    let response: Response;
    try {
      response = await fetchImpl(
        `${UPLOAD_URI}?${buildQuery('id,name,size,mimeType,createdTime')}&uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      );
    } catch (error) {
      return { status: 'network-error', message: error instanceof Error ? error.message : String(error) };
    }
    const responseBody = await safeJson(response);
    if (response.status === 200 || response.status === 201) {
      const meta = parseFileMeta(responseBody);
      if (!meta) return { status: 'error', httpStatus: response.status, message: 'Drive response missing file id.' };
      return { status: 'ok', driveFileId: meta.driveFileId, name: meta.name, sizeBytes: meta.sizeBytes, uploadMethod: 'multipart' };
    }
    return mapHttpFailure(response, responseBody);
  }

  async function uploadResumable(metadata: DriveFileMetadata, json: string): Promise<DriveUploadResult> {
    const metaJson = JSON.stringify({
      name: metadata.fileName,
      parents: ['appDataFolder'],
      appProperties: metadata.properties,
    });
    let initResponse: Response;
    try {
      initResponse = await fetchImpl(
        `${UPLOAD_URI}?uploadType=resumable`,
        {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': `${JSON_MIME}; charset=UTF-8`,
            'X-Upload-Content-Type': JSON_MIME,
            'X-Upload-Content-Length': String(byteLength(json)),
          },
          body: metaJson,
        },
      );
    } catch (error) {
      return { status: 'network-error', message: error instanceof Error ? error.message : String(error) };
    }
    if (initResponse.status !== 200 && initResponse.status !== 201) {
      const body = await safeJson(initResponse);
      return mapHttpFailure(initResponse, body);
    }
    const sessionUri = initResponse.headers.get('Location');
    if (!sessionUri) {
      return { status: 'error', httpStatus: initResponse.status, message: 'Resumable init response missing Location header.' };
    }

    let putResponse: Response;
    try {
      putResponse = await fetchImpl(sessionUri, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': JSON_MIME },
        body: json,
      });
    } catch (error) {
      return { status: 'network-error', message: error instanceof Error ? error.message : String(error) };
    }
    const putBody = await safeJson(putResponse);
    if (putResponse.status === 200 || putResponse.status === 201) {
      const meta = parseFileMeta(putBody);
      if (!meta) return { status: 'error', httpStatus: putResponse.status, message: 'Drive response missing file id.' };
      return { status: 'ok', driveFileId: meta.driveFileId, name: meta.name, sizeBytes: meta.sizeBytes, uploadMethod: 'resumable' };
    }
    return mapHttpFailure(putResponse, putBody);
  }

  return {
    async uploadSnapshotJson({ metadata, json }) {
      return byteLength(json) <= MULTIPART_MAX_BYTES
        ? uploadMultipart(metadata, json)
        : uploadResumable(metadata, json);
    },

    async listSnapshotFiles({ backupId, fileNameEquals, pageToken }) {
      const terms: string[] = [];
      if (backupId) terms.push(`appProperties has { key='backupId' and value='${backupId.replace(/'/g, "\\'")}' }`);
      if (fileNameEquals) terms.push(`name = '${fileNameEquals.replace(/'/g, "\\'")}'`);
      const params = new URLSearchParams({
        fields: 'nextPageToken,files(id,name,size,createdTime,appProperties)',
        spaces: 'appDataFolder',
        pageSize: '100',
      });
      if (pageToken) params.set('pageToken', pageToken);
      if (terms.length > 0) params.set('q', terms.join(' and '));
      let response: Response;
      try {
        response = await fetchImpl(`${LIST_URI}?${params.toString()}`, { method: 'GET', headers: { ...authHeader } });
      } catch (error) {
        return { status: 'network-error', message: error instanceof Error ? error.message : String(error) };
      }
      const body = await safeJson(response);
      if (response.status !== 200) return mapExtendedHttpFailure(response, body);
      const filesRaw = Array.isArray(body['files']) ? body['files'] : [];
      const files: DriveSnapshotFileMeta[] = [];
      for (const item of filesRaw) {
        if (item && typeof item === 'object') {
          const meta = parseFileMeta(item as Record<string, unknown>);
          if (meta) files.push(meta);
        }
      }
      const nextPageToken = typeof body['nextPageToken'] === 'string' ? body['nextPageToken'] : null;
      return { status: 'ok', files, nextPageToken };
    },

    async downloadSnapshotFile({ driveFileId }) {
      let response: Response;
      try {
        response = await fetchImpl(`${LIST_URI}/${encodeURIComponent(driveFileId)}?alt=media`, {
          method: 'GET',
          headers: { ...authHeader },
        });
      } catch (error) {
        return { status: 'network-error', message: error instanceof Error ? error.message : String(error) };
      }
      if (response.status !== 200) {
        return mapExtendedHttpFailure(response, await safeJson(response));
      }
      const content = await response.text();
      const lengthHeader = response.headers.get('content-length');
      const sizeBytes = lengthHeader !== null && lengthHeader !== '' && Number.isFinite(Number(lengthHeader)) ? Number(lengthHeader) : null;
      return { status: 'ok', content, sizeBytes };
    },

    async deleteFile({ driveFileId }) {
      let response: Response;
      try {
        response = await fetchImpl(`${LIST_URI}/${encodeURIComponent(driveFileId)}`, {
          method: 'DELETE',
          headers: { ...authHeader },
        });
      } catch (error) {
        return { status: 'network-error', message: error instanceof Error ? error.message : String(error) };
      }
      if (response.status === 200 || response.status === 204) return { status: 'ok' };
      return mapExtendedHttpFailure(response, await safeJson(response));
    },
  };
}

/** Re-export for convenience: GD-04 will hydrate these into SnapshotListEntry. */
export type { SnapshotListEntry };
