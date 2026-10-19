/**
 * GD-01 — Data-contract tests (pure logic only; no IndexedDB, no chrome.*, no network,
 * no real Google Drive or OAuth involvement — these tests verify contract code, nothing else).
 *
 * Runner: node:test executed through the existing tsx devDependency:
 *   npx tsx tests/gdrive-contract.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import type { Category, Snippet } from '../src/types';
import {
  buildCloudSnapshot,
  canonicalJson,
  createSnapshotFileName,
  parseCloudSnapshot,
  sha256Hex,
  toCompactUtc,
} from '../src/gdrive/snapshot';
import {
  applyResolutions,
  computeRestorePreview,
  contentHashOfSnippet,
} from '../src/gdrive/conflict';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const T0 = 1729257000000; // 2024-10-18T13:10:00.000Z — fixed for determinism

function makeSnippet(over: Partial<Snippet> = {}): Snippet {
  return {
    id: 'snip-1',
    title: 'Snippet One',
    content: '<p>hello</p>',
    categoryId: 'cat-1',
    isFavorite: false,
    createdAt: 1000,
    updatedAt: 1000,
    lastUsedAt: null,
    deletedAt: null,
    version: 1,
    ...over,
  };
}

function makeCategory(over: Partial<Category> = {}): Category {
  return { id: 'cat-1', name: 'Work', color: '#ef4444', ...over };
}

async function buildFixture(snippets: Snippet[], categories = [makeCategory()], preferences?: Record<string, unknown>) {
  return buildCloudSnapshot({
    snippets,
    categories,
    ...(preferences !== undefined ? { preferences: preferences as never } : {}),
    appVersion: '0.1.0',
    createdAtMs: T0,
  });
}

/** Serialize an envelope whose payload was mutated, with the digest recomputed honestly. */
async function serializeWithTamperedPayload(mutate: (payload: Record<string, unknown>) => void): Promise<string> {
  const { envelope } = await buildFixture([makeSnippet()]);
  const clone: Record<string, unknown> = JSON.parse(JSON.stringify(envelope));
  mutate(clone.payload as Record<string, unknown>);
  const integrity = clone.integrity as Record<string, unknown>;
  integrity.digest = await sha256Hex(canonicalJson(clone.payload));
  return JSON.stringify(clone, null, 2);
}

/** Serialize the built envelope with an envelope-level mutation (payload digest untouched). */
async function serializeWithTamperedEnvelope(mutate: (envelope: Record<string, unknown>) => void): Promise<string> {
  const { envelope } = await buildFixture([makeSnippet()]);
  const clone: Record<string, unknown> = JSON.parse(JSON.stringify(envelope));
  mutate(clone);
  return JSON.stringify(clone, null, 2);
}

// ---------------------------------------------------------------------------
// Build + roundtrip
// ---------------------------------------------------------------------------

test('build produces a valid v2 envelope with UTC naming and deterministic backupId', async () => {
  const built = await buildFixture([makeSnippet(), makeSnippet({ id: 'snip-2', deletedAt: 5000, title: 'Trashed One' })]);
  const env = built.envelope;

  assert.equal(env.format, 'snippet-organizer-backup');
  assert.equal(env.schemaVersion, 2);
  assert.equal(env.createdAt, '2024-10-18T13:10:00.000Z');
  assert.equal(env.appVersion, '0.1.0');
  assert.equal(env.backupId, `bk-${toCompactUtc(T0)}-${env.integrity.digest.slice(0, 8)}`);
  assert.match(env.backupId, /^bk-\d{8}T\d{6}Z-[0-9a-f]{8}$/);
  assert.equal(createSnapshotFileName(T0), 'snippet-organizer-snapshot-20241018T131000Z.json');
  assert.equal(env.integrity.algorithm, 'sha256');
  assert.match(env.integrity.digest, /^[0-9a-f]{64}$/);

  // Trash is included in the payload (D4).
  assert.equal(env.payload.snippets.length, 2);
  assert.equal(env.payload.snippets[1].deletedAt, 5000);

  // Deterministic: same inputs -> same backupId + digest.
  const again = await buildFixture([makeSnippet(), makeSnippet({ id: 'snip-2', deletedAt: 5000, title: 'Trashed One' })]);
  assert.equal(again.envelope.backupId, env.backupId);
  assert.equal(again.envelope.integrity.digest, env.integrity.digest);
});

test('build -> parse roundtrip preserves records including tombstones', async () => {
  const built = await buildFixture([makeSnippet(), makeSnippet({ id: 'snip-2', deletedAt: 9000 })], [makeCategory()], {});
  const parsed = await parseCloudSnapshot(built.serialized);
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.equal(parsed.warnings.length, 0);
  assert.deepEqual(parsed.snapshot.payload.snippets, built.envelope.payload.snippets);
  assert.deepEqual(parsed.snapshot.payload.categories, built.envelope.payload.categories);
  assert.equal(parsed.snapshot.backupId, built.envelope.backupId);
});

// ---------------------------------------------------------------------------
// Parse failures (untrusted input)
// ---------------------------------------------------------------------------

test('malformed JSON -> parse-error', async () => {
  const parsed = await parseCloudSnapshot('{ not json !!!');
  assert.equal(parsed.status, 'parse-error');
});

test('non-object JSON -> invalid', async () => {
  assert.equal((await parseCloudSnapshot('[1,2,3]')).status, 'invalid');
  assert.equal((await parseCloudSnapshot('42')).status, 'invalid');
});

test('missing envelope fields -> invalid with field paths', async () => {
  const json = await serializeWithTamperedEnvelope((env) => {
    delete env.backupId;
    delete env.createdAt;
  });
  const parsed = await parseCloudSnapshot(json);
  assert.equal(parsed.status, 'invalid');
  if (parsed.status !== 'invalid') return;
  const paths = parsed.issues.map((i) => i.path);
  assert.ok(paths.includes('backupId'), `expected backupId issue, got ${JSON.stringify(parsed.issues)}`);
  assert.ok(paths.includes('createdAt'));
});

test('unsupported future schema version -> unsupported-version, never parsed', async () => {
  const json = await serializeWithTamperedEnvelope((env) => {
    env.schemaVersion = 3;
  });
  const parsed = await parseCloudSnapshot(json);
  assert.equal(parsed.status, 'unsupported-version');
  if (parsed.status !== 'unsupported-version') return;
  assert.equal(parsed.observedSchemaVersion, 3);
});

test('envelope with wrong payload.version -> invalid', async () => {
  const json = await serializeWithTamperedPayload((payload) => {
    payload.version = 2;
  });
  const parsed = await parseCloudSnapshot(json);
  assert.equal(parsed.status, 'invalid');
  if (parsed.status !== 'invalid') return;
  assert.ok(parsed.issues.some((i) => i.path === 'payload.version'));
});

test('digest mismatch (corrupted payload) -> invalid integrity issue', async () => {
  const { serialized } = await buildFixture([makeSnippet()]);
  // Tamper AFTER build without recomputing the digest.
  const tampered = serialized.replace('<p>hello</p>', '<p>TAMPERED</p>');
  const parsed = await parseCloudSnapshot(tampered);
  assert.equal(parsed.status, 'invalid');
  if (parsed.status !== 'invalid') return;
  assert.ok(parsed.issues.some((i) => i.path === 'integrity.digest'));
});

test('size limit -> invalid before parsing', async () => {
  const { serialized } = await buildFixture([makeSnippet()]);
  const parsed = await parseCloudSnapshot(serialized, { maxBytes: 10 });
  assert.equal(parsed.status, 'invalid');
  if (parsed.status !== 'invalid') return;
  assert.ok(parsed.issues[0].message.includes('maximum allowed size'));
});

test('unrecognized object -> invalid', async () => {
  const parsed = await parseCloudSnapshot(JSON.stringify({ hello: 'world' }));
  assert.equal(parsed.status, 'invalid');
});

// ---------------------------------------------------------------------------
// Record quarantine / duplicates (payload tampered honestly: digest recomputed)
// ---------------------------------------------------------------------------

test('malformed record is quarantined with a warning; valid records proceed', async () => {
  const json = await serializeWithTamperedPayload((payload) => {
    (payload.snippets as unknown[]).push({ id: 'bad-1', content: 'no title' });
  });
  const parsed = await parseCloudSnapshot(json);
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.equal(parsed.snapshot.payload.snippets.length, 1); // only the valid record
  const q = parsed.warnings.filter((w) => w.code === 'record-quarantined');
  assert.equal(q.length, 1);
  assert.match(q[0].message, /title must be a non-empty string/);
});

test('duplicate id inside one snapshot: first occurrence kept, warning raised', async () => {
  const json = await serializeWithTamperedPayload((payload) => {
    (payload.snippets as unknown[]).push(makeSnippet({ title: 'Second Copy With Same Id' }));
  });
  const parsed = await parseCloudSnapshot(json);
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.equal(parsed.snapshot.payload.snippets.length, 1);
  assert.equal(parsed.snapshot.payload.snippets[0].title, 'Snippet One');
  assert.ok(parsed.warnings.some((w) => w.code === 'duplicate-id-in-snapshot'));
});

test('unknown fields are ignored with a warning (forward tolerance within v2)', async () => {
  const json = await serializeWithTamperedPayload((payload) => {
    (payload.snippets as unknown[])[0] = { ...makeSnippet(), someFutureField: 1 };
  });
  const parsed = await parseCloudSnapshot(json);
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.ok(parsed.warnings.some((w) => w.code === 'unknown-fields-ignored'));
  const record = parsed.snapshot.payload.snippets[0] as unknown as Record<string, unknown>;
  assert.equal(record.someFutureField, undefined);
});

// ---------------------------------------------------------------------------
// Legacy v1 migration
// ---------------------------------------------------------------------------

test('bare v1 BackupData file migrates to v2 envelope with trashed records preserved', async () => {
  const legacy = {
    version: 1,
    exportedAt: 1720000000000, // 2024-07-03T09:06:40.000Z
    appName: 'Snippet Organizer',
    snippets: [
      makeSnippet({ id: 'a', title: 'Active' }),
      makeSnippet({ id: 'b', title: 'Trashed', deletedAt: 1720000001000 }),
      { id: 'c', title: 'Lenient Coercions', content: 'x', categoryId: 'cat-9', isFavorite: 1, createdAt: '1717000000000', updatedAt: 1717000000000 },
    ],
    categories: [makeCategory({ id: 'cat-1', name: 'Work' })],
  };
  const parsed = await parseCloudSnapshot(JSON.stringify(legacy));
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.ok(parsed.warnings.some((w) => w.code === 'legacy-v1-migrated'));
  assert.equal(parsed.snapshot.schemaVersion, 2);
  assert.equal(parsed.snapshot.payload.snippets.length, 3);
  assert.equal(parsed.snapshot.payload.snippets[1].deletedAt, 1720000001000);
  // Lenient coercions matched to the existing importer: isFavorite 1 -> true, numeric string -> number, missing version -> 0.
  const coerced = parsed.snapshot.payload.snippets[2];
  assert.equal(coerced.isFavorite, true);
  assert.equal(coerced.createdAt, 1717000000000);
  assert.equal(coerced.version, 0);
});

test('v1 file that imports today (invalid record dropped silently) yields an explicit quarantine warning', async () => {
  const legacy = {
    version: 1,
    exportedAt: 1720000000000,
    appName: 'Snippet Organizer',
    snippets: [makeSnippet({ id: 'good' }), { id: '', title: 'No Id' }],
    categories: [makeCategory()],
  };
  const parsed = await parseCloudSnapshot(JSON.stringify(legacy));
  assert.equal(parsed.status, 'ok');
  if (parsed.status !== 'ok') return;
  assert.equal(parsed.snapshot.payload.snippets.length, 1);
  assert.ok(parsed.warnings.some((w) => w.code === 'record-quarantined'));
});

// ---------------------------------------------------------------------------
// Content hashing (D5 normalization rules)
// ---------------------------------------------------------------------------

test('content hash ignores volatile fields (usage bumps, import version bumps)', async () => {
  const base = makeSnippet();
  const noisy = makeSnippet({ updatedAt: 999999, lastUsedAt: 888888, version: 42, createdAt: 1 });
  assert.equal(await contentHashOfSnippet(base), await contentHashOfSnippet(noisy));
});

test('content hash trims the title but is verbatim on content', async () => {
  const base = makeSnippet();
  assert.equal(await contentHashOfSnippet(base), await contentHashOfSnippet(makeSnippet({ title: '  Snippet One  ' })));
  assert.notEqual(await contentHashOfSnippet(base), await contentHashOfSnippet(makeSnippet({ content: '<p>changed</p>' })));
  assert.notEqual(await contentHashOfSnippet(base), await contentHashOfSnippet(makeSnippet({ isFavorite: true })));
  assert.notEqual(await contentHashOfSnippet(base), await contentHashOfSnippet(makeSnippet({ categoryId: 'cat-2' })));
});

test('deletion state is NOT part of the content hash', async () => {
  assert.equal(
    await contentHashOfSnippet(makeSnippet()),
    await contentHashOfSnippet(makeSnippet({ deletedAt: 1234 })),
  );
});

// ---------------------------------------------------------------------------
// Restore preview (conflict vocabulary)
// ---------------------------------------------------------------------------

test('preview classifies: add, unchanged, content-conflict, deletion-state-conflict', async () => {
  const { envelope } = await buildFixture([
    makeSnippet({ id: 'new', title: 'Brand New' }),
    makeSnippet({ id: 'same', title: 'Same' }),
    makeSnippet({ id: 'edited', title: 'Edited Locally', content: '<p>incoming edit</p>' }),
    makeSnippet({ id: 'trashed-locally', title: 'Deleted On Device', deletedAt: 7777 }),
  ]);
  const local = [
    makeSnippet({ id: 'same', title: 'Same' }),
    makeSnippet({ id: 'edited', title: 'Edited Locally', content: '<p>local edit</p>' }),
    makeSnippet({ id: 'trashed-locally', title: 'Deleted On Device' }),
  ];
  const preview = await computeRestorePreview({ snapshot: envelope, localSnippets: local, localCategories: [makeCategory()] });

  assert.deepEqual(preview.toAdd.map((s) => s.id), ['new']);
  assert.deepEqual(preview.unchanged.map((s) => s.id), ['same']);

  const edited = preview.conflicts.find((c) => c.id === 'edited');
  assert.ok(edited);
  assert.equal(edited.kind, 'content-conflict');
  assert.equal(edited.contentDiffers, true);

  const trashed = preview.conflicts.find((c) => c.id === 'trashed-locally');
  assert.ok(trashed);
  assert.equal(trashed.kind, 'deletion-state-conflict');
  assert.equal(trashed.contentDiffers, false); // same content, deletion state differs
});

test('preview flags same-name/different-id as informational duplicates and missing categories', async () => {
  const { envelope } = await buildFixture(
    [makeSnippet({ id: 'incoming-1', title: 'My Note' }), makeSnippet({ id: 'incoming-2', title: 'My Note', categoryId: 'cat-missing' })],
    [], // snapshot carries no categories
  );
  const local = [makeSnippet({ id: 'local-1', title: 'My Note' })];
  const preview = await computeRestorePreview({ snapshot: envelope, localSnippets: local, localCategories: [makeCategory()] });

  assert.equal(preview.duplicateNames.length, 2);
  assert.ok(preview.duplicateNames.every((d) => d.localId === 'local-1' && d.title === 'My Note'));
  // 'cat-1' exists locally, 'cat-missing' exists nowhere.
  assert.deepEqual(preview.missingCategoryIds, ['cat-missing']);
});

test('quarantined count is surfaced through the preview input', async () => {
  const { envelope } = await buildFixture([makeSnippet({ id: 'only' })]);
  const preview = await computeRestorePreview({ snapshot: envelope, localSnippets: [], localCategories: [], quarantinedCount: 3 });
  assert.equal(preview.quarantinedCount, 3);
});

test('full-fidelity roundtrip: restoring a snapshot over its own source state is all-unchanged', async () => {
  const library = [
    makeSnippet({ id: 'a', title: 'A' }),
    makeSnippet({ id: 'b', title: 'B', deletedAt: 4242 }),
  ];
  const { envelope } = await buildFixture(library);
  const preview = await computeRestorePreview({ snapshot: envelope, localSnippets: library, localCategories: [makeCategory()] });
  assert.equal(preview.toAdd.length, 0);
  assert.equal(preview.conflicts.length, 0);
  assert.equal(preview.unchanged.length, 2);
});

// ---------------------------------------------------------------------------
// Resolutions -> write plan (still pure; GD-05 executes)
// ---------------------------------------------------------------------------

test('unspecified conflicts default to keep-local (never silently overwritten)', async () => {
  const { envelope } = await buildFixture([
    makeSnippet({ id: 'add-1', title: 'Add' }),
    makeSnippet({ id: 'conf-1', title: 'Incoming Version', content: '<p>incoming</p>' }),
  ]);
  const preview = await computeRestorePreview({
    snapshot: envelope,
    localSnippets: [makeSnippet({ id: 'conf-1', title: 'Local Version', content: '<p>local</p>' })],
    localCategories: [makeCategory()],
  });
  const plan = applyResolutions(preview);
  assert.deepEqual(plan.snippetsToWrite.map((s) => s.id), ['add-1']); // conflict untouched
  assert.equal(plan.reIdApplied.length, 0);
});

test('take-incoming and keep-both apply as chosen; keep-both re-ids the incoming record', async () => {
  const { envelope } = await buildFixture([
    makeSnippet({ id: 'conf-1', title: 'Incoming', content: '<p>incoming</p>' }),
    makeSnippet({ id: 'conf-2', title: 'Incoming 2', content: '<p>incoming 2</p>' }),
  ]);
  const preview = await computeRestorePreview({
    snapshot: envelope,
    localSnippets: [
      makeSnippet({ id: 'conf-1', title: 'Local', content: '<p>local</p>' }),
      makeSnippet({ id: 'conf-2', title: 'Local 2', content: '<p>local 2</p>' }),
    ],
    localCategories: [makeCategory()],
  });
  let counter = 0;
  const plan = applyResolutions(preview, {
    choices: { 'conf-1': 'take-incoming', 'conf-2': 'keep-both' },
    newIdFactory: () => `fresh-${++counter}`,
  });
  const byId = new Map(plan.snippetsToWrite.map((s) => [s.id, s]));
  assert.equal(byId.get('conf-1')?.content, '<p>incoming</p>');
  assert.ok(byId.has('fresh-1'));
  assert.equal(byId.get('fresh-1')?.title, 'Incoming 2');
  assert.deepEqual(plan.reIdApplied, [{ fromId: 'conf-2', toId: 'fresh-1' }]);
});

test('deletion-state conflict resolved with take-incoming restores the trashed state', async () => {
  const { envelope } = await buildFixture([makeSnippet({ id: 'd-1', title: 'Trashed In Cloud', deletedAt: 12345 })]);
  const preview = await computeRestorePreview({
    snapshot: envelope,
    localSnippets: [makeSnippet({ id: 'd-1', title: 'Trashed In Cloud' })],
    localCategories: [makeCategory()],
  });
  assert.equal(preview.conflicts.length, 1);
  const plan = applyResolutions(preview, { choices: { 'd-1': 'take-incoming' } });
  assert.equal(plan.snippetsToWrite.length, 1);
  assert.equal(plan.snippetsToWrite[0].deletedAt, 12345);
});

test('preferences apply only with explicit opt-in', async () => {
  const { envelope } = await buildFixture([makeSnippet()], [makeCategory()], { defaultView: 'all' });
  const preview = await computeRestorePreview({ snapshot: envelope, localSnippets: [], localCategories: [] });
  assert.equal(preview.hasPreferences, true);
  assert.equal(applyResolutions(preview).applyPreferences, false);
  assert.equal(applyResolutions(preview, { applyPreferences: true }).applyPreferences, true);
});

test('write plan carries snapshot categories and missing-category fallbacks', async () => {
  const { envelope } = await buildFixture(
    [makeSnippet({ categoryId: 'cat-nowhere' })],
    [], // snapshot carries no categories
  );
  const preview = await computeRestorePreview({ snapshot: envelope, localSnippets: [], localCategories: [] });
  assert.deepEqual(preview.missingCategoryIds, ['cat-nowhere']);
  const plan = applyResolutions(preview);
  assert.deepEqual(plan.missingCategoryFallbackIds, ['cat-nowhere']);
});
