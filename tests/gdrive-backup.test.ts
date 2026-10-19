/**
 * GD-03 tests — cloud snapshot creation, gathering, and versioning.
 *
 * Coverage: trash-inclusive gathering (tombstones preserved, deterministic
 * order, no mutation), Drive client request shapes (multipart/resumable/list,
 * failure mapping), and the createCloudBackup orchestrator (auth short-circuits,
 * 401 retry-once, reconcile-by-backupId on ambiguous failure, duplicate
 * policy, no-credentials-in-payload). All networking is stubbed — these tests
 * do NOT exercise real Chrome/Google Drive (GD-08 gate).
 *
 * Run: npx.cmd tsx tests/gdrive-backup.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { getAllSnippetsIncludingTrash } from '../src/db';
import { gatherSnapshotData, type SnapshotReaders } from '../src/gdrive/gather';
import { createDriveClient, MULTIPART_MAX_BYTES } from '../src/gdrive/driveClient';
import { createCloudBackup, type CloudBackupDeps } from '../src/gdrive/backup';
import type { AuthResult } from '../src/gdrive/auth';
import type { ConnectionIntentStore } from '../src/gdrive/connection';
import { parseCloudSnapshot, createSnapshotFileName } from '../src/gdrive/snapshot';
import type { Category, Preferences, Snippet } from '../src/types';

const T0 = 1729257000000; // fixed creation instant
const TOKEN_A = 'token-first';
const TOKEN_B = 'token-refreshed';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let idCounter = 0;
function makeSnippet(overrides: Partial<Snippet> = {}): Snippet {
  idCounter += 1;
  return {
    id: `snip-${String(idCounter).padStart(3, '0')}`,
    title: `Snippet ${idCounter}`,
    content: `content ${idCounter}`,
    categoryId: 'default',
    isFavorite: false,
    createdAt: T0,
    updatedAt: T0,
    lastUsedAt: null,
    deletedAt: null,
    version: 1,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 'default', name: 'Default', color: '#4f46e5', ...overrides };
}

function makePreferences(): Preferences {
  return {
    theme: 'system',
    defaultCategoryId: 'default',
    searchFields: { title: true, content: true },
    copyFormat: 'plain',
  } as unknown as Preferences;
}

interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}

function headerObject(init?: RequestInit): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = init?.headers;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, string>)) out[key] = value;
  }
  return out;
}

function makeFetchStub(responder: (req: RecordedRequest, callIndex: number) => Response): {
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response>;
  requests: RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];
  return {
    requests,
    fetchImpl: async (url, init) => {
      const record: RecordedRequest = { url, method: init?.method ?? 'GET', headers: headerObject(init), body: typeof init?.body === 'string' ? init.body : undefined };
      const index = requests.push(record) - 1;
      return responder(record, index);
    },
  };
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function authorized(token = TOKEN_A): AuthResult {
  return { status: 'authorized', token };
}

interface ReaderOverrides {
  snippets?: Snippet[];
  categories?: Category[];
  preferences?: Preferences;
  getAllSnippetsIncludingTrash?: () => Promise<Snippet[]>;
}

interface ReaderCalls {
  snippets: number;
  categories: number;
  preferences: number;
}

function makeReaders(overrides: ReaderOverrides = {}): SnapshotReaders & { calls: ReaderCalls } {
  const calls: ReaderCalls = { snippets: 0, categories: 0, preferences: 0 };
  const readers: SnapshotReaders = {
    getAllSnippetsIncludingTrash: async () => {
      calls.snippets += 1;
      return overrides.snippets ?? (overrides.getAllSnippetsIncludingTrash ? overrides.getAllSnippetsIncludingTrash() : []);
    },
    getCategories: async () => {
      calls.categories += 1;
      return overrides.categories ?? [];
    },
    getPreferences: async () => {
      calls.preferences += 1;
      return overrides.preferences ?? makePreferences();
    },
  };
  return Object.assign(readers, { calls });
}

interface DepsOverrides extends Partial<CloudBackupDeps> {
  auth?: AuthResult[];
}

function makeBackupDeps(overrides: DepsOverrides = {}): CloudBackupDeps {
  const authResults = overrides.auth ?? [authorized()];
  let authIndex = 0;
  return {
    authorize: async () => authResults[Math.min(authIndex++, authResults.length - 1)] ?? authorized(),
    removeCachedAuthToken: overrides.removeCachedAuthToken,
    readers: overrides.readers ?? makeReaders(),
    fetchImpl: overrides.fetchImpl,
    clock: overrides.clock ?? (() => T0),
    getAppVersion: overrides.getAppVersion ?? (() => '0.1.0'),
    connectionIntent: overrides.connectionIntent,
  };
}

// ---------------------------------------------------------------------------
// Gathering
// ---------------------------------------------------------------------------

test('gather: includes trashed snippets with deletedAt tombstones preserved', async () => {
  const trashed = makeSnippet({ id: 'snip-trash', deletedAt: 1690000000000 });
  const lib = await gatherSnapshotData(makeReaders({ snippets: [makeSnippet({ id: 'snip-a' }), trashed], categories: [makeCategory()] }));
  assert.equal(lib.counts.activeSnippets, 1);
  assert.equal(lib.counts.trashedSnippets, 1);
  const restored = lib.snippets.find((s) => s.id === 'snip-trash');
  assert.ok(restored);
  assert.equal(restored.deletedAt, 1690000000000);
});

test('gather: deterministic id ordering and counts; source arrays untouched', async () => {
  const source = [makeSnippet({ id: 'c' }), makeSnippet({ id: 'a' }), makeSnippet({ id: 'b' })];
  const cats = [makeCategory({ id: 'z' }), makeCategory({ id: 'a', name: 'A' })];
  const snapshotOfSource = JSON.stringify(source);
  const lib = await gatherSnapshotData(makeReaders({ snippets: source, categories: cats }));
  assert.deepEqual(lib.snippets.map((s) => s.id), ['a', 'b', 'c']);
  assert.deepEqual(lib.categories.map((c) => c.id), ['a', 'z']);
  assert.equal(JSON.stringify(source), snapshotOfSource); // no caller mutation
});

test('gather: reader contract violations throw TypeError (orchestrator maps to gather-failed)', async () => {
  await assert.rejects(
    gatherSnapshotData({ getAllSnippetsIncludingTrash: async () => null as unknown as Snippet[], getCategories: async () => [], getPreferences: async () => makePreferences() }),
    /must return an array/,
  );
});

test('db: getAllSnippetsIncludingTrash is exported and callable (IndexedDB runtime behavior verified only in-app, GD-08)', async () => {
  assert.equal(typeof getAllSnippetsIncludingTrash, 'function');
  // In Node (no IndexedDB) the helper resolves to [] by design.
  assert.deepEqual(await getAllSnippetsIncludingTrash(), []);
});

// ---------------------------------------------------------------------------
// Drive client — multipart upload
// ---------------------------------------------------------------------------

function parseMultipart(body: string, boundary: string): { metadata: Record<string, unknown>; mediaJson: string } {
  const metaPart = body.split('\r\n\r\n')[1] ?? '';
  const metadata = JSON.parse(metaPart.split('\r\n--')[0]) as Record<string, unknown>;
  assert.ok(body.endsWith(`\r\n--${boundary}--`));
  return { metadata, mediaJson: body };
}

test('driveClient: multipart upload — URL, auth, metadata parents/appProperties, media body, ok result', async () => {
  const stub = makeFetchStub(() => jsonResponse({ id: 'drive-1', name: 'snap.json', size: '1234', createdTime: '2026-10-18T10:30:00Z' }));
  const client = createDriveClient({ token: TOKEN_A, fetchImpl: stub.fetchImpl });
  const result = await client.uploadSnapshotJson({ metadata: { fileName: 'snap.json', properties: { backupId: 'bk-1' } }, json: '{"hello":"world"}' });

  assert.equal(stub.requests.length, 1);
  const req = stub.requests[0]!;
  assert.ok(req.url.startsWith('https://www.googleapis.com/upload/drive/v3/files?'));
  assert.ok(req.url.includes('uploadType=multipart'));
  assert.equal(req.method, 'POST');
  assert.equal(req.headers['Authorization'], `Bearer ${TOKEN_A}`);

  const contentType = req.headers['Content-Type'] ?? '';
  assert.ok(contentType.startsWith('multipart/related; boundary='));
  const boundary = contentType.slice('multipart/related; boundary='.length);

  const { metadata } = parseMultipart(req.body ?? '', boundary);
  assert.equal(metadata['name'], 'snap.json');
  assert.deepEqual(metadata['parents'], ['appDataFolder']);
  assert.deepEqual(metadata['appProperties'], { backupId: 'bk-1' });
  assert.ok((req.body ?? '').includes('{"hello":"world"}'));

  assert.deepEqual(result, { status: 'ok', driveFileId: 'drive-1', name: 'snap.json', sizeBytes: 1234, uploadMethod: 'multipart' });
});

test('driveClient: HTTP failure mapping — 401 unauthorized, 403 forbidden, 500 error', async () => {
  for (const [status, expected] of [[401, 'unauthorized'], [403, 'forbidden'], [500, 'error']] as const) {
    const stub = makeFetchStub(() => jsonResponse({ error: { message: `boom ${status}` } }, status));
    const client = createDriveClient({ token: 't', fetchImpl: stub.fetchImpl });
    const result = await client.uploadSnapshotJson({ metadata: { fileName: 'f.json', properties: {} }, json: '{}' });
    assert.equal(result.status, expected, `status ${status}`);
    if (result.status === 'error') assert.equal(result.httpStatus, 500);
    if (result.status === 'unauthorized' || result.status === 'forbidden' || result.status === 'error') {
      assert.match(result.message, new RegExp(`boom ${status}`));
    }
  }
});

// ---------------------------------------------------------------------------
// PR-1 — precise Drive error reasons (not every failure is "permissions")
// ---------------------------------------------------------------------------

test('PR-1 driveClient: 403 body reason is parsed and attached (upload path keeps forbidden)', async () => {
  const stub = makeFetchStub(() =>
    jsonResponse({ error: { code: 403, message: 'The user does not have sufficient permissions', errors: [{ reason: 'insufficientPermissions' }] } }, 403),
  );
  const client = createDriveClient({ token: 't', fetchImpl: stub.fetchImpl });
  const result = await client.uploadSnapshotJson({ metadata: { fileName: 'f.json', properties: {} }, json: '{}' });
  assert.equal(result.status, 'forbidden');
  if (result.status === 'forbidden') {
    assert.equal(result.reason, 'insufficientPermissions');
    assert.match(result.message, /sufficient permissions/);
  }
});

test('PR-1 driveClient: 403 rateLimitExceeded on list promotes to rate-limited (not forbidden)', async () => {
  const stub = makeFetchStub(() =>
    jsonResponse({ error: { code: 403, message: 'Rate limit exceeded', errors: [{ reason: 'rateLimitExceeded' }] } }, 403),
  );
  const client = createDriveClient({ token: 't', fetchImpl: stub.fetchImpl });
  const result = await client.listSnapshotFiles({});
  assert.equal(result.status, 'rate-limited');
  if (result.status === 'rate-limited') assert.equal(result.reason, 'rateLimitExceeded');
});

test('PR-1 driveClient: 403 insufficientPermissions on list stays forbidden with reason', async () => {
  const stub = makeFetchStub(() =>
    jsonResponse({ error: { code: 403, message: 'Insufficient permissions', errors: [{ reason: 'insufficientPermissions' }] } }, 403),
  );
  const client = createDriveClient({ token: 't', fetchImpl: stub.fetchImpl });
  const result = await client.listSnapshotFiles({});
  assert.equal(result.status, 'forbidden');
  if (result.status === 'forbidden') assert.equal(result.reason, 'insufficientPermissions');
});

test('PR-1 driveClient: error body without reasons falls back to HTTP-status message with no fabricated reason', async () => {
  const stub = makeFetchStub(() => jsonResponse({ error: { code: 403, message: 'Forbidden' } }, 403));
  const client = createDriveClient({ token: 't', fetchImpl: stub.fetchImpl });
  const result = await client.listSnapshotFiles({});
  assert.equal(result.status, 'forbidden');
  if (result.status === 'forbidden') {
    assert.equal(result.reason, null);
    assert.match(result.message, /Forbidden/);
  }
});

test('driveClient: fetch throw maps to network-error (ambiguous)', async () => {
  const stub = makeFetchStub(() => {
    throw new Error('socket hang up');
  });
  const client = createDriveClient({ token: 't', fetchImpl: stub.fetchImpl });
  const result = await client.uploadSnapshotJson({ metadata: { fileName: 'f.json', properties: {} }, json: '{}' });
  assert.deepEqual(result, { status: 'network-error', message: 'socket hang up' });
});

// ---------------------------------------------------------------------------
// Drive client — resumable upload (> 5 MB)
// ---------------------------------------------------------------------------

test('driveClient: >5MB payload switches to resumable (init → Location → PUT)', async () => {
  const bigJson = `{"pad":"${'x'.repeat(MULTIPART_MAX_BYTES)}"}`; // > 5 MB
  const stub = makeFetchStub((req, index) =>
    index === 0
      ? new Response(null, { status: 200, headers: { Location: 'https://www.googleapis.com/upload/session-1' } })
      : jsonResponse({ id: 'drive-big', name: 'big.json', size: String(bigJson.length) }, 200),
  );
  const client = createDriveClient({ token: TOKEN_A, fetchImpl: stub.fetchImpl });
  const result = await client.uploadSnapshotJson({ metadata: { fileName: 'big.json', properties: { backupId: 'bk-big' } }, json: bigJson });

  assert.equal(stub.requests.length, 2);
  const init = stub.requests[0]!;
  assert.ok(init.url.includes('uploadType=resumable'));
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['Content-Type'], 'application/json; charset=UTF-8');
  assert.equal(init.headers['X-Upload-Content-Type'], 'application/json');
  const initMeta = JSON.parse(init.body ?? '{}') as Record<string, unknown>;
  assert.equal(initMeta['name'], 'big.json');
  assert.deepEqual(initMeta['parents'], ['appDataFolder']);

  const put = stub.requests[1]!;
  assert.equal(put.url, 'https://www.googleapis.com/upload/session-1');
  assert.equal(put.method, 'PUT');
  assert.equal(put.body, bigJson);
  assert.deepEqual(result, { status: 'ok', driveFileId: 'drive-big', name: 'big.json', sizeBytes: bigJson.length, uploadMethod: 'resumable' });
});

// ---------------------------------------------------------------------------
// Drive client — listing (reconciliation primitive)
// ---------------------------------------------------------------------------

test('driveClient: listSnapshotFiles queries appDataFolder by backupId appProperty', async () => {
  const stub = makeFetchStub(() =>
    jsonResponse({ files: [{ id: 'f1', name: 'snap.json', size: '10', createdTime: '2026-10-18T10:30:00Z', appProperties: { backupId: 'bk-1' } }] }),
  );
  const client = createDriveClient({ token: TOKEN_A, fetchImpl: stub.fetchImpl });
  const result = await client.listSnapshotFiles({ backupId: 'bk-1' });

  const req = stub.requests[0]!;
  const params = new URL(req.url).searchParams;
  assert.equal(params.get('spaces'), 'appDataFolder');
  assert.equal(params.get('q'), `appProperties has { key='backupId' and value='bk-1' }`);
  assert.ok(params.get('fields')!.includes('appProperties'));
  assert.equal(req.headers['Authorization'], `Bearer ${TOKEN_A}`);
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0]!.driveFileId, 'f1');
    assert.equal(result.files[0]!.appProperties['backupId'], 'bk-1');
  }
});

// ---------------------------------------------------------------------------
// createCloudBackup orchestrator
// ---------------------------------------------------------------------------

const standardLibrary = {
  snippets: [makeSnippet({ id: 'snip-1' }), makeSnippet({ id: 'snip-2', deletedAt: 1690000000000 })],
  categories: [makeCategory()],
};

test('backup: full success — metadata, counts, tombstones survive into the uploaded snapshot', async () => {
  const stub = makeFetchStub(() => jsonResponse({ id: 'drive-9', name: createSnapshotFileName(T0), size: '999' }));
  const deps = makeBackupDeps({ readers: makeReaders({ ...standardLibrary }), fetchImpl: stub.fetchImpl });
  const outcome = await createCloudBackup(deps, { displayName: 'Weekly backup' });

  assert.equal(outcome.status, 'created');
  if (outcome.status !== 'created') return;
  assert.equal(outcome.driveFileId, 'drive-9');
  assert.equal(outcome.displayName, 'Weekly backup');
  assert.equal(outcome.counts.trashedSnippets, 1);
  assert.equal(outcome.counts.activeSnippets, 1);
  assert.equal(outcome.uploadMethod, 'multipart');
  assert.equal(outcome.reconciled, false);
  assert.equal(outcome.fileName, createSnapshotFileName(T0));

  const req = stub.requests[0]!;
  const boundary = (req.headers['Content-Type'] ?? '').split('boundary=')[1] ?? '';
  const metaPart = (req.body ?? '').split('\r\n\r\n')[1] ?? '';
  const metadata = JSON.parse(metaPart.split('\r\n--')[0]) as Record<string, unknown>;
  assert.equal((metadata['appProperties'] as Record<string, string>)['backupId'], outcome.backupId);

  // Tombstone fidelity end-to-end: the exact uploaded bytes parse as a valid v2 snapshot.
  const uploaded = (req.body ?? '').split('\r\n\r\n')[2] ?? '';
  const uploadedJson = uploaded.slice(0, uploaded.length - ('\r\n--' + boundary + '--').length);
  const parsed = await parseCloudSnapshot(uploadedJson);
  assert.equal(parsed.status, 'ok');
  if (parsed.status === 'ok') {
    assert.equal(parsed.snapshot.backupId, outcome.backupId);
    const trashed = parsed.snapshot.payload.snippets.find((s) => s.id === 'snip-2');
    assert.ok(trashed);
    assert.equal(trashed.deletedAt, 1690000000000);
    assert.equal(parsed.snapshot.displayName, 'Weekly backup');
  }
});

test('backup: no credentials or tokens anywhere in the uploaded snapshot', async () => {
  const stub = makeFetchStub(() => jsonResponse({ id: 'drive-1' }));
  const deps = makeBackupDeps({ readers: makeReaders({ ...standardLibrary }), fetchImpl: stub.fetchImpl });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'created');
  const body = stub.requests[0]!.body ?? '';
  for (const forbidden of ['ya29', 'access_token', 'refresh_token', 'client_secret', 'Authorization', TOKEN_A, TOKEN_B]) {
    assert.equal(body.includes(forbidden), false, `payload must not contain ${forbidden}`);
  }
});

test('backup: repeated backups stay distinct — no overwrite, unique ids/filenames per instant', async () => {
  let now = T0;
  const stub = makeFetchStub(() => jsonResponse({ id: `drive-${stub.requests.length}` }));
  const deps = makeBackupDeps({ readers: makeReaders({ ...standardLibrary }), fetchImpl: stub.fetchImpl, clock: () => now });
  const first = await createCloudBackup(deps);
  now = T0 + 1000;
  const second = await createCloudBackup(deps);
  assert.equal(first.status, 'created');
  assert.equal(second.status, 'created');
  if (first.status === 'created' && second.status === 'created') {
    assert.notEqual(first.backupId, second.backupId);
    assert.notEqual(first.fileName, second.fileName);
    assert.equal(first.driveFileId, 'drive-1');
    assert.equal(second.driveFileId, 'drive-2');
  }
});

test('backup: deterministic backupId — same content and instant produce the same id', async () => {
  const stub = makeFetchStub(() => jsonResponse({ id: 'drive-x' }));
  const deps = makeBackupDeps({ readers: makeReaders({ ...standardLibrary }), fetchImpl: stub.fetchImpl, clock: () => T0 });
  const first = await createCloudBackup(deps);
  const second = await createCloudBackup(deps);
  assert.equal(first.status, 'created');
  assert.equal(second.status, 'created');
  if (first.status === 'created' && second.status === 'created') assert.equal(first.backupId, second.backupId);
});

test('backup: 401 clears cached token, re-authorizes silently, retries exactly once with fresh token', async () => {
  const cleared: string[] = [];
  const stub = makeFetchStub((req, index) =>
    index === 0
      ? jsonResponse({ error: { message: 'Invalid Credentials' } }, 401)
      : jsonResponse({ id: 'drive-ok' }, 200),
  );
  const deps = makeBackupDeps({
    readers: makeReaders({ ...standardLibrary }),
    fetchImpl: stub.fetchImpl,
    auth: [authorized(TOKEN_A), authorized(TOKEN_B)],
    removeCachedAuthToken: async ({ token }) => {
      cleared.push(token);
    },
  });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'created');
  assert.deepEqual(cleared, [TOKEN_A]);
  assert.equal(stub.requests.length, 2);
  assert.equal(stub.requests[0]!.headers['Authorization'], `Bearer ${TOKEN_A}`);
  assert.equal(stub.requests[1]!.headers['Authorization'], `Bearer ${TOKEN_B}`);
});

test('backup: 401 that persists after one retry reports unauthorized (no loop)', async () => {
  const stub = makeFetchStub(() => jsonResponse({ error: { message: 'Invalid Credentials' } }, 401));
  const deps = makeBackupDeps({
    readers: makeReaders({ ...standardLibrary }),
    fetchImpl: stub.fetchImpl,
    auth: [authorized(TOKEN_A), authorized(TOKEN_B)],
  });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'unauthorized');
  if (outcome.status === 'unauthorized') assert.match(outcome.message, /Invalid Credentials/);
  assert.equal(stub.requests.length, 2); // initial + single retry, nothing more
});

test('backup: ambiguous network failure reconciles by backupId — exactly one match = created (reconciled)', async () => {
  const stub = makeFetchStub((req, index) =>
    index === 0
      ? (() => {
          throw new Error('timeout');
        })()
      : jsonResponse({ files: [{ id: 'drive-found', name: createSnapshotFileName(T0), size: '55', createdTime: '2026-10-18T10:30:00Z', appProperties: {} }] }),
  );
  const deps = makeBackupDeps({ readers: makeReaders({ ...standardLibrary }), fetchImpl: stub.fetchImpl });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'created');
  if (outcome.status === 'created') {
    assert.equal(outcome.reconciled, true);
    assert.equal(outcome.driveFileId, 'drive-found');
    assert.equal(outcome.uploadMethod, 'unknown');
  }
  assert.equal(stub.requests.length, 2);
  assert.ok(stub.requests[1]!.url.includes('spaces=appDataFolder'));
});

test('backup: ambiguous failure with zero matches = typed failure, retry left to the user', async () => {
  const stub = makeFetchStub((req, index) => (index === 0 ? (() => { throw new Error('timeout'); })() : jsonResponse({ files: [] })));
  const deps = makeBackupDeps({ readers: makeReaders({ ...standardLibrary }), fetchImpl: stub.fetchImpl });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'failed');
  if (outcome.status === 'failed') {
    assert.equal(outcome.reason, 'network-error');
    assert.match(outcome.message, /retry/i);
  }
});

test('backup: ambiguous failure with duplicates = typed ambiguous; nothing deleted', async () => {
  const stub = makeFetchStub((req, index) =>
    index === 0
      ? (() => {
          throw new Error('timeout');
        })()
      : jsonResponse({ files: [{ id: 'f1' }, { id: 'f2' }] }),
  );
  const deps = makeBackupDeps({ readers: makeReaders({ ...standardLibrary }), fetchImpl: stub.fetchImpl });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'failed');
  if (outcome.status === 'failed') assert.equal(outcome.reason, 'ambiguous');
  assert.equal(stub.requests.length, 2); // upload attempt + list probe; NO delete call ever
  assert.ok(stub.requests.every((r) => r.method !== 'DELETE'));
});

test('backup: not-configured short-circuits before any gathering or network', async () => {
  const stub = makeFetchStub(() => jsonResponse({ id: 'x' }));
  const readers = makeReaders({ ...standardLibrary });
  const deps = makeBackupDeps({ readers, fetchImpl: stub.fetchImpl, auth: [{ status: 'not-configured', problem: { code: 'placeholder-client-id', message: 'set up oauth' } }] });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'not-configured');
  if (outcome.status === 'not-configured') assert.match(outcome.problemMessage, /set up oauth/);
  assert.equal(stub.requests.length, 0);
  assert.deepEqual((readers as unknown as { calls: { snippets: number; categories: number; preferences: number } }).calls, { snippets: 0, categories: 0, preferences: 0 });
});

test('backup: denied consent and gather failure map to typed outcomes without network calls', async () => {
  const stub = makeFetchStub(() => jsonResponse({ id: 'x' }));

  const denied = await createCloudBackup(makeBackupDeps({ fetchImpl: stub.fetchImpl, auth: [{ status: 'denied', message: 'User cancelled' }] }));
  assert.equal(denied.status, 'denied');

  const brokenReaders = makeReaders();
  brokenReaders.getAllSnippetsIncludingTrash = async () => {
    throw new Error('db closed');
  };
  const gatherFail = await createCloudBackup(makeBackupDeps({ readers: brokenReaders, fetchImpl: stub.fetchImpl }));
  assert.equal(gatherFail.status, 'failed');
  if (gatherFail.status === 'failed') assert.equal(gatherFail.reason, 'gather-failed');

  assert.equal(stub.requests.length, 0);
});

test('backup: 403 maps to typed forbidden failure', async () => {
  const stub = makeFetchStub(() => jsonResponse({ error: { message: 'appDataFolder forbidden' } }, 403));
  const deps = makeBackupDeps({ readers: makeReaders({ ...standardLibrary }), fetchImpl: stub.fetchImpl });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'failed');
  if (outcome.status === 'failed') assert.equal(outcome.reason, 'forbidden');
});

test('backup: gathering reads each source exactly once (read-only, no writes)', async () => {
  const stub = makeFetchStub(() => jsonResponse({ id: 'drive-1' }));
  const readers = makeReaders({ ...standardLibrary });
  const deps = makeBackupDeps({ readers, fetchImpl: stub.fetchImpl });
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'created');
  const calls = (readers as unknown as { calls: { snippets: number; categories: number; preferences: number } }).calls;
  assert.deepEqual(calls, { snippets: 1, categories: 1, preferences: 1 });
});

// ---------------------------------------------------------------------------
// PR-1c — persisted disconnect intent gates backup creation too
// ---------------------------------------------------------------------------

test('PR-1c backup: persisted disconnect flag blocks creation — zero auth, zero reads, zero network', async () => {
  const intent: ConnectionIntentStore = { get: async () => true, set: async () => {} };
  const stub = makeFetchStub(() => jsonResponse({ id: 'x' }));
  const readers = makeReaders({ ...standardLibrary });
  const authCalls: boolean[] = [];
  const deps = makeBackupDeps({
    readers,
    fetchImpl: stub.fetchImpl,
    connectionIntent: intent,
  });
  deps.authorize = async (opts) => {
    authCalls.push(opts?.interactive ?? false);
    return authorized();
  };
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'failed');
  if (outcome.status === 'failed') {
    assert.equal(outcome.reason, 'user-disconnected');
    assert.equal(outcome.message, 'Google Drive is disconnected — click Connect to reconnect.');
  }
  assert.deepEqual(authCalls, [], 'authorize must never run while the user is disconnected');
  assert.deepEqual((readers as unknown as { calls: { snippets: number; categories: number; preferences: number } }).calls, { snippets: 0, categories: 0, preferences: 0 });
  assert.equal(stub.requests.length, 0, 'nothing may be uploaded while the user is disconnected');
});

test('PR-1c backup: clearing the intent (explicit Connect) lets creation proceed to authorization', async () => {
  let value = true;
  const intent: ConnectionIntentStore = {
    get: async () => value,
    set: async (v: boolean) => {
      value = v;
    },
  };
  const stub = makeFetchStub(() => jsonResponse({ id: 'drive-1' }));
  const readers = makeReaders({ ...standardLibrary });
  const deps = makeBackupDeps({ readers, fetchImpl: stub.fetchImpl, connectionIntent: intent });
  const blocked = await createCloudBackup(deps);
  assert.equal(blocked.status, 'failed');
  if (blocked.status === 'failed') assert.equal(blocked.reason, 'user-disconnected');
  await intent.set(false); // the explicit Connect click
  const outcome = await createCloudBackup(deps);
  assert.equal(outcome.status, 'created');
  assert.equal(stub.requests.length >= 1, true);
});
