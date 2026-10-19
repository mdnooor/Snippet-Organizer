/**
 * GD-04 tests — browse, download, and delete cloud snapshots.
 *
 * Coverage: paginated metadata-first listing (hydration, sorting, duplicate
 * distinction, page cap), download with GD-01 validation before use (valid /
 * invalid / unsupported-version, raw bytes preserved), PERMANENT cloud-only
 * deletion (typed results incl. not-found), and the 401 → clear-cache →
 * silent re-auth → retry-once policy shared across operations. All networking
 * is stubbed — real Chrome/Drive behavior is GD-08 territory.
 *
 * Run: npx.cmd tsx tests/gdrive-browse.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createDriveService, BROWSE_MAX_PAGES, type DriveServiceDeps } from '../src/gdrive/snapshotStore';
import type { ConnectionIntentStore } from '../src/gdrive/connection';
import { buildCloudSnapshot } from '../src/gdrive/snapshot';
import type { AuthResult } from '../src/gdrive/auth';
import type { Snippet } from '../src/types';

const T0 = 1729257000000;
const TOKEN_A = 'token-first';
const TOKEN_B = 'token-refreshed';

// ---------------------------------------------------------------------------
// Fixtures / stubs
// ---------------------------------------------------------------------------

function makeSnippet(id: string, overrides: Partial<Snippet> = {}): Snippet {
  return {
    id,
    title: `Snippet ${id}`,
    content: `content ${id}`,
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

async function makeEnvelopeJson(createdAtMs = T0): Promise<string> {
  const built = await buildCloudSnapshot({
    snippets: [makeSnippet('s1'), makeSnippet('s2', { deletedAt: 1690000000000 })],
    categories: [{ id: 'default', name: 'Default', color: '#4f46e5' }],
    appVersion: '0.1.0',
    createdAtMs,
  });
  return built.serialized;
}

interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
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
      const record: RecordedRequest = { url, method: init?.method ?? 'GET', headers: headerObject(init) };
      const index = requests.push(record) - 1;
      return responder(record, index);
    },
  };
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function listResponse(files: unknown[], nextPageToken: string | null = null): Response {
  return jsonResponse(nextPageToken ? { files, nextPageToken } : { files });
}

function authorized(token = TOKEN_A): AuthResult {
  return { status: 'authorized', token };
}

interface ServiceOverrides extends Partial<DriveServiceDeps> {
  auth?: AuthResult[];
}

function makeService(overrides: ServiceOverrides = {}) {
  const authResults = overrides.auth ?? [authorized()];
  let authIndex = 0;
  const deps: DriveServiceDeps = {
    authorize: async () => authResults[Math.min(authIndex++, authResults.length - 1)] ?? authorized(),
    removeCachedAuthToken: overrides.removeCachedAuthToken,
    fetchImpl: overrides.fetchImpl,
    connectionIntent: overrides.connectionIntent,
  };
  return { service: createDriveService(deps), deps };
}

/** PR-1c: in-memory persisted disconnect intent with a read counter. */
function makeIntent(initial: boolean): ConnectionIntentStore & { calls: number } {
  let value = initial;
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    get: async () => {
      calls += 1;
      return value;
    },
    set: async (v: boolean) => {
      value = v;
    },
  };
}

const fullProps = {
  backupId: 'bk-20261018T103000Z-abcd1234',
  schemaVersion: '2',
  createdAt: '2026-10-18T10:30:00Z',
  appVersion: '0.1.0',
  displayName: 'Weekly backup',
};

// ---------------------------------------------------------------------------
// Browse: pagination, hydration, sorting
// ---------------------------------------------------------------------------

test('browse: follows nextPageToken across pages (pageToken sent on later requests)', async () => {
  const stub = makeFetchStub((req, index) =>
    index === 0
      ? listResponse([{ id: 'f1', name: 'a.json', size: '10', createdTime: '2026-10-18T10:30:00Z', appProperties: fullProps }], 'cursor-2')
      : listResponse(
          [
            { id: 'f2', name: 'b.json', size: '20', createdTime: '2026-10-18T09:00:00Z', appProperties: fullProps },
            { id: 'f3', name: 'c.json', size: '30', createdTime: '2026-10-18T08:00:00Z' },
          ],
          null,
        ),
  );
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.browse();

  assert.equal(stub.requests.length, 2);
  assert.ok(stub.requests[0]!.url.includes('spaces=appDataFolder'));
  assert.ok(!stub.requests[0]!.url.includes('pageToken='));
  assert.ok(stub.requests[1]!.url.includes('pageToken=cursor-2'));
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(result.entries.length, 3);
    assert.equal(result.entries[0]!.driveFileId, 'f1'); // newest first
    assert.equal(result.entries[2]!.backupId, null);
    assert.equal(result.entries[2]!.identifiable, false);
  }
});

test('browse: empty list → ok with zero entries', async () => {
  const stub = makeFetchStub(() => listResponse([]));
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.browse();
  assert.deepEqual(result, { status: 'ok', entries: [] });
});

test('browse: safety cap stops after maxPages even with endless pagination', async () => {
  const stub = makeFetchStub(() => listResponse([{ id: `f${stub.requests.length}`, name: 'x.json', size: '1', createdTime: '2026-10-18T10:30:00Z' }], 'never-ending'));
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.browse({ maxPages: 3 });
  assert.equal(stub.requests.length, 3);
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') assert.equal(result.entries.length, 3);
});

test('browse: default cap is BROWSE_MAX_PAGES (20)', async () => {
  const stub = makeFetchStub(() => listResponse([], 'more'));
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  await service.browse();
  assert.equal(stub.requests.length, BROWSE_MAX_PAGES);
});

test('browse: hydration — appProperties fields, displayName fallback, v2 compatibility', async () => {
  const stub = makeFetchStub(() =>
    listResponse([
      { id: 'f1', name: 'snippet-organizer-snapshot-20261018T103000Z.json', size: '512', createdTime: '2026-10-18T10:30:01Z', appProperties: fullProps },
      { id: 'f2', name: 'mystery.json', size: '7', createdTime: '2026-10-18T09:00:00Z', appProperties: {} },
    ]),
  );
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.browse();
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const [ours, foreign] = result.entries;
  assert.equal(ours!.displayName, 'Weekly backup');
  assert.equal(ours!.backupId, fullProps.backupId);
  assert.equal(ours!.schemaVersion, 2);
  assert.equal(ours!.compatibility, 'v2');
  assert.equal(ours!.createdAt, '2026-10-18T10:30:00Z'); // envelope instant, not Drive time
  assert.equal(ours!.appVersion, '0.1.0');
  assert.equal(ours!.identifiable, true);
  assert.equal(foreign!.displayName, 'mystery'); // file name minus .json
  assert.equal(foreign!.backupId, null);
  assert.equal(foreign!.schemaVersion, null);
  assert.equal(foreign!.compatibility, 'unknown');
  assert.equal(foreign!.createdAt, '2026-10-18T09:00:00Z'); // falls back to Drive time
  assert.equal(foreign!.identifiable, false);
});

test('browse: duplicate names stay distinct; newest-first with deterministic tie-break', async () => {
  const stub = makeFetchStub(() =>
    listResponse([
      { id: 'zzz', name: 'same-name.json', size: '1', createdTime: '2026-10-18T10:30:00Z', appProperties: { ...fullProps, backupId: 'bk-A' } },
      { id: 'aaa', name: 'same-name.json', size: '2', createdTime: '2026-10-18T10:30:00Z', appProperties: { ...fullProps, backupId: 'bk-B' } },
      { id: 'mmm', name: 'older.json', size: '3', createdTime: '2026-10-18T08:00:00Z', appProperties: { ...fullProps, backupId: 'bk-C', createdAt: '2026-10-18T08:00:00Z' } },
    ]),
  );
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.browse();
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.entries.length, 3);
  // Tie on timestamp → driveFileId ascending ('aaa' before 'zzz'); older last.
  assert.deepEqual(result.entries.map((e) => e.driveFileId), ['aaa', 'zzz', 'mmm']);
  assert.deepEqual(result.entries.map((e) => e.backupId), ['bk-B', 'bk-A', 'bk-C']);
});

test('browse: metadata-first — no alt=media download requests are made', async () => {
  const stub = makeFetchStub(() => listResponse([{ id: 'f1', name: 'a.json', size: '10', createdTime: '2026-10-18T10:30:00Z', appProperties: fullProps }]));
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  await service.browse();
  assert.ok(stub.requests.every((r) => !r.url.includes('alt=media')));
});

// ---------------------------------------------------------------------------
// Browse: auth + failure mapping
// ---------------------------------------------------------------------------

test('browse: not-configured and denied short-circuit with zero network calls', async () => {
  const stub = makeFetchStub(() => listResponse([]));
  const notConfigured = await makeService({ fetchImpl: stub.fetchImpl, auth: [{ status: 'not-configured', problem: { code: 'placeholder-client-id', message: 'set up oauth' } }] }).service.browse();
  assert.equal(notConfigured.status, 'not-configured');
  const denied = await makeService({ fetchImpl: stub.fetchImpl, auth: [{ status: 'denied', message: 'User cancelled' }] }).service.browse();
  assert.equal(denied.status, 'denied');
  assert.equal(stub.requests.length, 0);
});

test('browse: 401 clears cached token, silently re-authorizes, retries once with fresh token', async () => {
  const cleared: string[] = [];
  const stub = makeFetchStub((req, index) =>
    index === 0 ? jsonResponse({ error: { message: 'Invalid Credentials' } }, 401) : listResponse([]),
  );
  const { service } = makeService({
    fetchImpl: stub.fetchImpl,
    auth: [authorized(TOKEN_A), authorized(TOKEN_B)],
    removeCachedAuthToken: async ({ token }) => {
      cleared.push(token);
    },
  });
  const result = await service.browse();
  assert.equal(result.status, 'ok');
  assert.deepEqual(cleared, [TOKEN_A]);
  assert.equal(stub.requests.length, 2);
  assert.equal(stub.requests[0]!.headers['Authorization'], `Bearer ${TOKEN_A}`);
  assert.equal(stub.requests[1]!.headers['Authorization'], `Bearer ${TOKEN_B}`);
});

test('browse: persistent 401 reports unauthorized after exactly one retry', async () => {
  const stub = makeFetchStub(() => jsonResponse({ error: { message: 'Invalid Credentials' } }, 401));
  const { service } = makeService({ fetchImpl: stub.fetchImpl, auth: [authorized(TOKEN_A), authorized(TOKEN_B)] });
  const result = await service.browse();
  assert.equal(result.status, 'unauthorized');
  if (result.status === 'unauthorized') assert.match(result.message, /Invalid Credentials/);
  assert.equal(stub.requests.length, 2);
});

test('browse: 403 → forbidden, 429 → rate-limited, 500 → error(httpStatus)', async () => {
  for (const [status, expected] of [[403, 'forbidden'], [429, 'rate-limited'], [500, 'error']] as const) {
    const stub = makeFetchStub(() => jsonResponse({ error: { message: `boom ${status}` } }, status));
    const { service } = makeService({ fetchImpl: stub.fetchImpl });
    const result = await service.browse();
    assert.equal(result.status, expected, `status ${status}`);
    if (result.status === 'error') assert.equal(result.httpStatus, 500);
  }
});

test('browse: fetch throw maps to network-error', async () => {
  const stub = makeFetchStub(() => {
    throw new Error('offline');
  });
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.browse();
  assert.deepEqual(result, { status: 'network-error', message: 'offline' });
});

// ---------------------------------------------------------------------------
// Download: validation before use
// ---------------------------------------------------------------------------

test('download: correct URL/method/auth, raw bytes intact, valid snapshot parses ok, .json name enforced', async () => {
  const envelope = await makeEnvelopeJson();
  const stub = makeFetchStub(() => new Response(envelope, { status: 200, headers: { 'content-length': String(envelope.length) } }));
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.download({ driveFileId: 'file-9', fallbackFileName: 'snapshot-no-extension' });

  assert.equal(stub.requests.length, 1);
  const req = stub.requests[0]!;
  assert.equal(req.url, 'https://www.googleapis.com/drive/v3/files/file-9?alt=media');
  assert.equal(req.method, 'GET');
  assert.equal(req.headers['Authorization'], `Bearer ${TOKEN_A}`);

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.raw, envelope);
  assert.equal(result.parsed.status, 'ok');
  assert.equal(result.fileName, 'snapshot-no-extension.json');
});

test('download: malformed content is returned raw with parsed status invalid (usable-snapshot gate)', async () => {
  const stub = makeFetchStub(() => new Response('{"format":"snippet-organizer-backup","corrupt":true}', { status: 200 }));
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.download({ driveFileId: 'file-x', fallbackFileName: 'x.json' });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.notEqual(result.parsed.status, 'ok');
  assert.equal(result.raw, '{"format":"snippet-organizer-backup","corrupt":true}');
});

test('download: future schemaVersion → unsupported-version, raw preserved', async () => {
  const envelope = await makeEnvelopeJson();
  const doctored = envelope.replace('"schemaVersion": 2', '"schemaVersion": 99');
  const stub = makeFetchStub(() => new Response(doctored, { status: 200 }));
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.download({ driveFileId: 'file-y', fallbackFileName: 'y.json' });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.parsed.status, 'unsupported-version');
  if (result.parsed.status === 'unsupported-version') assert.equal(result.parsed.observedSchemaVersion, 99);
  assert.equal(result.raw, doctored);
});

test('download: 404 → not-found; 429 → rate-limited; fetch throw → network-error', async () => {
  const notFound = await makeService({ fetchImpl: makeFetchStub(() => jsonResponse({ error: { message: 'File not found' } }, 404)).fetchImpl }).service.download({ driveFileId: 'gone', fallbackFileName: 'g.json' });
  assert.equal(notFound.status, 'not-found');
  const limited = await makeService({ fetchImpl: makeFetchStub(() => jsonResponse({}, 429)).fetchImpl }).service.download({ driveFileId: 'busy', fallbackFileName: 'b.json' });
  assert.equal(limited.status, 'rate-limited');
  const offline = await makeService({
    fetchImpl: () => {
      throw new Error('offline');
    },
  }).service.download({ driveFileId: 'x', fallbackFileName: 'x.json' });
  assert.equal(offline.status, 'network-error');
});

// ---------------------------------------------------------------------------
// Delete: permanent, cloud-only
// ---------------------------------------------------------------------------

test('delete: DELETE method on files/{id}; 204 → ok; exactly one request (no local reads/writes)', async () => {
  const stub = makeFetchStub(() => new Response(null, { status: 204 }));
  const { service } = makeService({ fetchImpl: stub.fetchImpl });
  const result = await service.remove({ driveFileId: 'file-del' });

  assert.equal(result.status, 'ok');
  assert.equal(stub.requests.length, 1);
  const req = stub.requests[0]!;
  assert.equal(req.method, 'DELETE');
  assert.equal(req.url, 'https://www.googleapis.com/drive/v3/files/file-del');
  assert.equal(req.headers['Authorization'], `Bearer ${TOKEN_A}`);
});

test('delete: 404 → not-found (missing/already deleted); 403 → forbidden; throw → network-error', async () => {
  const missing = await makeService({ fetchImpl: makeFetchStub(() => jsonResponse({ error: { message: 'File not found' } }, 404)).fetchImpl }).service.remove({ driveFileId: 'gone' });
  assert.equal(missing.status, 'not-found');
  const forbidden = await makeService({ fetchImpl: makeFetchStub(() => jsonResponse({ error: { message: 'insufficient' } }, 403)).fetchImpl }).service.remove({ driveFileId: 'x' });
  assert.equal(forbidden.status, 'forbidden');
  const offline = await makeService({
    fetchImpl: () => {
      throw new Error('offline');
    },
  }).service.remove({ driveFileId: 'x' });
  assert.equal(offline.status, 'network-error');
});

test('delete: 401 triggers the same clear-cache + retry-once flow', async () => {
  const cleared: string[] = [];
  const stub = makeFetchStub((req, index) => (index === 0 ? jsonResponse({}, 401) : new Response(null, { status: 204 })));
  const { service } = makeService({
    fetchImpl: stub.fetchImpl,
    auth: [authorized(TOKEN_A), authorized(TOKEN_B)],
    removeCachedAuthToken: async ({ token }) => {
      cleared.push(token);
    },
  });
  const result = await service.remove({ driveFileId: 'file-del' });
  assert.equal(result.status, 'ok');
  assert.deepEqual(cleared, [TOKEN_A]);
  assert.equal(stub.requests[1]!.headers['Authorization'], `Bearer ${TOKEN_B}`);
});

// ---------------------------------------------------------------------------
// PR-1c — the persisted disconnect intent is authoritative for ALL Drive ops
// ---------------------------------------------------------------------------

test('PR-1c browse: persisted disconnect flag blocks listing with ZERO token calls and ZERO requests', async () => {
  const intent = makeIntent(true);
  const stub = makeFetchStub(() => listResponse([{ id: 'f1', name: 'a.json', size: '10', createdTime: '2026-10-18T10:30:00Z', appProperties: fullProps }]));
  const authCalls: boolean[] = [];
  const service = createDriveService({
    authorize: async (opts) => {
      authCalls.push(opts?.interactive ?? false);
      return authorized();
    },
    fetchImpl: stub.fetchImpl,
    connectionIntent: intent,
  });
  const outcome = await service.browse();
  assert.deepEqual(outcome, {
    status: 'user-disconnected',
    message: 'Google Drive is disconnected — click Connect to reconnect.',
  });
  assert.deepEqual(authCalls, [], 'authorize must never run while the user is disconnected');
  assert.equal(stub.requests.length, 0, 'no Drive request may run while the user is disconnected');
  assert.equal(intent.calls, 1, 'the intent store is consulted exactly once per operation');
});

test('PR-1c delete/download: disconnect never deletes or fetches remote backups', async () => {
  const intent = makeIntent(true);
  const stub = makeFetchStub(() => new Response(null, { status: 204 }));
  const service = createDriveService({
    authorize: async () => authorized(),
    fetchImpl: stub.fetchImpl,
    connectionIntent: intent,
  });
  const removed = await service.remove({ driveFileId: 'precious-1' });
  assert.equal(removed.status, 'user-disconnected');
  const downloaded = await service.download({ driveFileId: 'precious-1', fallbackFileName: 'x.json' });
  assert.equal(downloaded.status, 'user-disconnected');
  assert.equal(stub.requests.length, 0, 'disconnect must never issue files.delete or any download');
});

test('PR-1c browse: clearing the intent (explicit Connect) allows the live listing again', async () => {
  const intent = makeIntent(true);
  const stub = makeFetchStub(() => listResponse([{ id: 'f1', name: 'a.json', size: '10', createdTime: '2026-10-18T10:30:00Z', appProperties: fullProps }]));
  const service = createDriveService({ authorize: async () => authorized(), fetchImpl: stub.fetchImpl, connectionIntent: intent });
  const before = await service.browse();
  assert.equal(before.status, 'user-disconnected');
  // The Connect click clears the flag; the same service instance then lists normally.
  await intent.set(false);
  const after = await service.browse();
  assert.equal(after.status, 'ok');
  if (after.status === 'ok') assert.equal(after.entries.length, 1);
  assert.equal(stub.requests.length, 1);
});

test('PR-1c browse: intent-store read failure is treated as not-disconnected (probe parity)', async () => {
  const failingIntent: ConnectionIntentStore = { get: () => Promise.reject(new Error('storage gone')), set: async () => {} };
  const stub = makeFetchStub(() => listResponse([{ id: 'f1', name: 'a.json', size: '10', createdTime: '2026-10-18T10:30:00Z', appProperties: fullProps }]));
  const service = createDriveService({ authorize: async () => authorized(), fetchImpl: stub.fetchImpl, connectionIntent: failingIntent });
  const outcome = await service.browse();
  assert.equal(outcome.status, 'ok');
  assert.equal(stub.requests.length, 1);
});
