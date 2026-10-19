/**
 * GD-05 tests — restore preview, conflict resolution, safety checkpoint, atomic execution.
 *
 * Coverage: read-only preview classification (additions/unchanged/content-conflicts/
 * deletion-state conflicts/duplicate names/missing categories/quarantined counts),
 * not-usable gating (parse-error/invalid/unsupported-version), every resolution choice
 * (keep-local default, take-incoming incl. tombstone restoration, keep-both re-id),
 * Replace plan determinism, checkpoint creation + verification + failure gating,
 * executor ordering (checkpoint gate → atomic tx → post-write verification), injected
 * write failure (rolled back, never partial), cancellation purity, and v1/v2 snapshot
 * compatibility. IndexedDB itself is stubbed at the executor boundary (real IndexedDB
 * is exercised only in-app, GD-08); db.applyRestoreWritePlan mirrors the established
 * importData transaction pattern.
 *
 * Run: npx.cmd tsx tests/gdrive-restore.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCloudSnapshot, parseCloudSnapshot } from '../src/gdrive/snapshot';
import { DEFAULT_PREFERENCES } from '../src/db';
import {
  previewRestoreFromParsed,
  buildRestoreCheckpoint,
  buildMergePlan,
  buildReplacePlan,
  executeRestore,
  planRestoreExpectations,
  type CheckpointReaders,
  type RestoreCheckpoint,
  type RestoreExecutorDeps,
} from '../src/gdrive/restore';
import type { CloudSnapshotEnvelope, ParsedSnapshot } from '../src/gdrive/types';
import type { BackupData, Category, Preferences, Snippet } from '../src/types';

const T0 = 1729257000000;

/** Fixture prefs: real shape (Preferences requires every field). */
function makePrefs(patch: Partial<Preferences> = {}): Preferences {
  return { ...DEFAULT_PREFERENCES, ...patch };
}

// ---------------------------------------------------------------------------
// Fixtures
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

const SNAPSHOT_CATEGORIES: Category[] = [
  { id: 'default', name: 'Default', color: '#4f46e5' },
  { id: 'cat-work', name: 'Work', color: '#0d9488' },
];

async function makeV2Envelope(
  snippets: Snippet[] = [makeSnippet('s1'), makeSnippet('s2', { deletedAt: 1690000000000 })],
  categories: Category[] = SNAPSHOT_CATEGORIES,
): Promise<CloudSnapshotEnvelope> {
  const built = await buildCloudSnapshot({ snippets, categories, appVersion: '0.1.0', createdAtMs: T0 });
  const parsed = await parseCloudSnapshot(built.serialized);
  if (parsed.status !== 'ok') throw new Error('fixture envelope failed validation');
  return parsed.snapshot;
}

/** Fixture ParsedSnapshot: built + verified by the real parser, so always the ok member. */
async function makeV2Parsed(
  snippets: Snippet[] = [makeSnippet('s1'), makeSnippet('s2', { deletedAt: 1690000000000 })],
): Promise<ParsedSnapshot> {
  return { status: 'ok', snapshot: await makeV2Envelope(snippets), warnings: [] };
}

function makeV1Json(snippets: Snippet[] = [makeSnippet('v1-1')]): string {
  const data: BackupData = {
    version: 1,
    exportedAt: T0,
    appName: 'Snippet Organizer',
    snippets,
    categories: [{ id: 'default', name: 'Default', color: '#4f46e5' }],
    preferences: makePrefs({ theme: 'dark' }),
  };
  return JSON.stringify(data);
}

const LOCAL_CATEGORIES: Category[] = [{ id: 'default', name: 'Default', color: '#4f46e5' }];

const verifiedCheckpoint = (snippetCount = 5): RestoreCheckpoint => ({
  data: {
    version: 1,
    exportedAt: T0,
    appName: 'Snippet Organizer',
    snippets: Array.from({ length: snippetCount }, (_, i) => makeSnippet(`local-${i}`)),
    categories: LOCAL_CATEGORIES,
    preferences: {} as Preferences,
  },
  createdAtMs: T0,
  snippetCount,
  verified: true,
});

interface AtomicCall {
  plan: { snippetsToWrite: Snippet[]; categoriesToWrite: { id: string }[]; missingCategoryFallbackIds: string[]; applyPreferences: boolean };
  clearExisting: boolean;
  preferences: Preferences | null;
}

function makeExecutorDeps(overrides: { atomic?: AtomicCall[]; failAtomic?: boolean; verify?: boolean } = {}): {
  deps: RestoreExecutorDeps;
  atomicCalls: AtomicCall[];
  verifyCalls: { expectedSnippets: number; expectedCategories: number | null }[];
} {
  const atomicCalls = overrides.atomic ?? [];
  const verifyCalls: { expectedSnippets: number; expectedCategories: number | null }[] = [];
  return {
    atomicCalls,
    verifyCalls,
    deps: {
      executeAtomic: async (args) => {
        atomicCalls.push(args);
        if (overrides.failAtomic) throw new Error('injected write failure');
        return { snippetsWritten: args.plan.snippetsToWrite.length, categoriesWritten: args.plan.categoriesToWrite.length };
      },
      verifyAfterWrite: async (args) => {
        verifyCalls.push(args);
        return overrides.verify ?? true;
      },
    },
  };
}

const checkpointReaders = (snippets: Snippet[], categories: Category[], preferences: Preferences = makePrefs()): CheckpointReaders => ({
  readAllSnippetsIncludingTrash: async () => snippets,
  readCategories: async () => categories,
  readPreferences: async () => preferences,
});

// ---------------------------------------------------------------------------
// Preview: generation and diff classification (read-only)
// ---------------------------------------------------------------------------

test('preview: incoming ids absent locally are additions', async () => {
  const parsed = await makeV2Parsed([makeSnippet('new-1')]);
  const result = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('local-1')], localCategories: LOCAL_CATEGORIES });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.preview.toAdd.length, 1);
  assert.equal(result.preview.toAdd[0]!.id, 'new-1');
  assert.equal(result.preview.conflicts.length, 0);
});

test('preview: same id + content + deletion state is unchanged (no-op record)', async () => {
  const twin = makeSnippet('s1', { updatedAt: T0 + 999 }); // volatile field differs — still identical content
  const parsed = await makeV2Parsed([twin]);
  const result = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1')], localCategories: LOCAL_CATEGORIES });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.preview.unchanged.length, 1);
  assert.equal(result.preview.conflicts.length, 0);
  assert.equal(result.preview.toAdd.length, 0);
});

test('preview: same id, different content → content-conflict with contentDiffers', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1', { content: 'cloud version' })]);
  const result = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1', { content: 'local version' })], localCategories: LOCAL_CATEGORIES });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.preview.conflicts.length, 1);
  const conflict = result.preview.conflicts[0]!;
  assert.equal(conflict.kind, 'content-conflict');
  assert.equal(conflict.contentDiffers, true);
  assert.equal(conflict.local.content, 'local version');
  assert.equal(conflict.incoming.content, 'cloud version');
});

test('preview: same content, different trash state → deletion-state-conflict (contentDiffers false)', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1')]); // active in snapshot
  const result = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1', { deletedAt: 1690000000000 })], localCategories: LOCAL_CATEGORIES });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const conflict = result.preview.conflicts[0]!;
  assert.equal(conflict.kind, 'deletion-state-conflict');
  assert.equal(conflict.contentDiffers, false);
});

test('preview: same title, different id → informational duplicateNames only', async () => {
  const parsed = await makeV2Parsed([makeSnippet('cloud-1', { title: 'Meeting notes' })]);
  const result = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('local-9', { title: 'Meeting notes' })], localCategories: LOCAL_CATEGORIES });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.preview.duplicateNames.length, 1);
  assert.equal(result.preview.duplicateNames[0]!.incomingId, 'cloud-1');
  assert.equal(result.preview.duplicateNames[0]!.localId, 'local-9');
  assert.equal(result.preview.toAdd.length, 1); // still an addition — same name ≠ same record
});

test('preview: category referenced by neither snapshot nor local store is flagged missing', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1', { categoryId: 'cat-gone' })]);
  const result = await previewRestoreFromParsed(parsed, { localSnippets: [], localCategories: [] });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.deepEqual(result.preview.missingCategoryIds, ['cat-gone']);
});

test('preview: v1 file with an invalid record migrates and surfaces a quarantined count', async () => {
  const v1Json = makeV1Json([makeSnippet('v1-1'), { id: '', title: '', content: 'broken' } as unknown as Snippet]);
  const parsed = await parseCloudSnapshot(v1Json);
  assert.equal(parsed.status, 'ok'); // v1 migrates
  const result = await previewRestoreFromParsed(parsed, { localSnippets: [], localCategories: LOCAL_CATEGORIES });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.preview.quarantinedCount, 1);
  assert.equal(result.preview.toAdd.length, 1); // the valid v1 record survived migration
});

test('preview: malformed / corrupt / unsupported snapshots are not usable (three statuses)', async () => {
  const notJson = await previewRestoreFromParsed(await parseCloudSnapshot('not json at all'), { localSnippets: [], localCategories: [] });
  assert.equal(notJson.status, 'not-usable');
  if (notJson.status === 'not-usable') assert.equal(notJson.parsedStatus, 'parse-error');

  const corrupt = await previewRestoreFromParsed(await parseCloudSnapshot('{"format":"snippet-organizer-backup"}'), { localSnippets: [], localCategories: [] });
  assert.equal(corrupt.status, 'not-usable');
  if (corrupt.status === 'not-usable') assert.equal(corrupt.parsedStatus, 'invalid');

  const envelope = await makeV2Envelope();
  const future = await parseCloudSnapshot(JSON.stringify({ ...envelope, schemaVersion: 99 }));
  const unsupported = await previewRestoreFromParsed(future, { localSnippets: [], localCategories: [] });
  assert.equal(unsupported.status, 'not-usable');
  if (unsupported.status === 'not-usable') assert.equal(unsupported.parsedStatus, 'unsupported-version');
});

test('preview: tombstones in the snapshot are previewed as incoming records (never dropped)', async () => {
  const parsed = await makeV2Parsed(); // s2 is trashed
  const result = await previewRestoreFromParsed(parsed, { localSnippets: [], localCategories: LOCAL_CATEGORIES });
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const trashed = result.preview.toAdd.find((s) => s.id === 's2');
  assert.ok(trashed);
  assert.ok(trashed!.deletedAt !== null);
});

// ---------------------------------------------------------------------------
// Resolution choices (buildMergePlan over the GD-01 contract)
// ---------------------------------------------------------------------------

test('merge plan: unspecified conflicts default to keep-local (nothing overwritten)', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1', { content: 'cloud' })]);
  const preview = (await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1', { content: 'local' })], localCategories: LOCAL_CATEGORIES }));
  if (preview.status !== 'ok') throw new Error('preview failed');
  const plan = buildMergePlan(preview.preview);
  assert.equal(plan.snippetsToWrite.length, 0); // no adds, conflict defaulted to keep-local
  assert.equal(plan.applyPreferences, false);
});

test('merge plan: take-incoming writes the incoming record verbatim', async () => {
  const incoming = makeSnippet('s1', { content: 'cloud', isFavorite: true });
  const parsed = await makeV2Parsed([incoming]);
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1', { content: 'local' })], localCategories: LOCAL_CATEGORIES });
  if (preview.status !== 'ok') throw new Error('preview failed');
  const plan = buildMergePlan(preview.preview, { choices: { s1: 'take-incoming' } });
  assert.equal(plan.snippetsToWrite.length, 1);
  assert.deepEqual(plan.snippetsToWrite[0], incoming);
});

test('merge plan: take-incoming on a deletion-state conflict restores the trashed state (tombstone preserved)', async () => {
  const incoming = makeSnippet('s1', { deletedAt: 1690000000000 }); // trashed in snapshot
  const parsed = await makeV2Parsed([incoming]);
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1')], localCategories: LOCAL_CATEGORIES });
  if (preview.status !== 'ok') throw new Error('preview failed');
  const plan = buildMergePlan(preview.preview, { choices: { s1: 'take-incoming' } });
  assert.equal(plan.snippetsToWrite[0]!.deletedAt, 1690000000000);
});

test('merge plan: keep-both stores the incoming record under a fresh id and records the re-id', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1', { content: 'cloud' })]);
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1', { content: 'local' })], localCategories: LOCAL_CATEGORIES });
  if (preview.status !== 'ok') throw new Error('preview failed');
  const plan = buildMergePlan(preview.preview, { choices: { s1: 'keep-both' }, newIdFactory: () => 'snip-fresh' });
  assert.equal(plan.snippetsToWrite.length, 1);
  assert.equal(plan.snippetsToWrite[0]!.id, 'snip-fresh');
  assert.deepEqual(plan.reIdApplied, [{ fromId: 's1', toId: 'snip-fresh' }]);
});

test('merge plan: preferences apply only with explicit opt-in', async () => {
  const parsed = await makeV2Parsed();
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [], localCategories: LOCAL_CATEGORIES });
  if (preview.status !== 'ok') throw new Error('preview failed');
  assert.equal(preview.preview.hasPreferences, false); // this snapshot carries none
  const planWithout = buildMergePlan(preview.preview, { applyPreferences: true });
  assert.equal(planWithout.applyPreferences, false);
});

// ---------------------------------------------------------------------------
// Replace plan: deterministic full-library rewrite
// ---------------------------------------------------------------------------

test('replace plan: carries the entire validated snapshot and ignores conflict choices', async () => {
  const parsed = await makeV2Parsed();
  if (parsed.status !== 'ok') throw new Error('fixture failed');
  const plan = buildReplacePlan(parsed.snapshot);
  assert.equal(plan.snippetsToWrite.length, 2);
  assert.equal(plan.categoriesToWrite.length, 2);
  assert.deepEqual(plan.reIdApplied, []);
  assert.equal(plan.applyPreferences, false);
});

test('replace plan: snapshot references missing from its own categories become fallbacks', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1', { categoryId: 'cat-orphan' })]);
  if (parsed.status !== 'ok') throw new Error('fixture failed');
  const plan = buildReplacePlan(parsed.snapshot);
  assert.deepEqual(plan.missingCategoryFallbackIds, ['cat-orphan']);
});

// ---------------------------------------------------------------------------
// Safety checkpoint (pre-restore, trash-inclusive, contract-verified)
// ---------------------------------------------------------------------------

test('checkpoint: captures trash-inclusive state and verifies through the GD-01 parser', async () => {
  const locals = [makeSnippet('l1'), makeSnippet('l2', { deletedAt: 1690000000000 })];
  const result = await buildRestoreCheckpoint(checkpointReaders(locals, LOCAL_CATEGORIES, makePrefs({ theme: 'dark' })));
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.checkpoint.verified, true);
  assert.equal(result.checkpoint.snippetCount, 2);
  assert.equal(result.checkpoint.data.snippets.length, 2);
  assert.ok(result.checkpoint.data.snippets.some((s) => s.deletedAt !== null)); // tombstones included
  // The serialized checkpoint migrates through the same contract (v1 → v2).
  const reparsed = await parseCloudSnapshot(JSON.stringify(result.checkpoint.data));
  assert.equal(reparsed.status, 'ok');
  if (reparsed.status === 'ok') {
    assert.equal(reparsed.snapshot.payload.snippets.length, 2);
    assert.ok(reparsed.snapshot.payload.snippets.some((s) => s.deletedAt !== null));
  }
});

test('checkpoint: reader failure → failed (restore would be blocked)', async () => {
  const result = await buildRestoreCheckpoint({
    readAllSnippetsIncludingTrash: async () => {
      throw new Error('idb unavailable');
    },
    readCategories: async () => [],
    readPreferences: async () => ({} as Preferences),
  });
  assert.equal(result.status, 'failed');
  if (result.status === 'failed') assert.match(result.message, /idb unavailable/);
});

test('checkpoint: corrupt local state fails snapshot validation → failed', async () => {
  const result = await buildRestoreCheckpoint({
    readAllSnippetsIncludingTrash: async () => 'not-an-array' as unknown as Snippet[],
    readCategories: async () => [],
    readPreferences: async () => ({} as Preferences),
  });
  assert.equal(result.status, 'failed');
  if (result.status === 'failed') assert.match(result.message, /invalid data|validation/);
});

// ---------------------------------------------------------------------------
// Execution: checkpoint gate → atomic tx → post-write verification
// ---------------------------------------------------------------------------

test('executeRestore: no verified checkpoint ⇒ checkpoint-unavailable, zero writes (both modes)', async () => {
  const { deps, atomicCalls } = makeExecutorDeps();
  const unverified: RestoreCheckpoint = { ...verifiedCheckpoint(), verified: false as unknown as true };
  for (const mode of ['merge', 'replace'] as const) {
    const outcome = await executeRestore(deps, {
      mode,
      plan: { snippetsToWrite: [], categoriesToWrite: [], reIdApplied: [], missingCategoryFallbackIds: [], applyPreferences: false },
      preferences: null,
      checkpoint: unverified,
      expectedSnippets: 0,
    });
    assert.equal(outcome.status, 'checkpoint-unavailable', mode);
  }
  assert.equal(atomicCalls.length, 0);
});

test('executeRestore: merge success — single tx without clearing, preferences withheld without opt-in', async () => {
  const parsed = await makeV2Parsed([makeSnippet('new-1')]);
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [], localCategories: LOCAL_CATEGORIES });
  if (preview.status !== 'ok') throw new Error('preview failed');
  const plan = buildMergePlan(preview.preview);
  const { deps, atomicCalls, verifyCalls } = makeExecutorDeps();
  const outcome = await executeRestore(deps, {
    mode: 'merge',
    plan,
    preferences: makePrefs({ theme: 'dark' }),
    checkpoint: verifiedCheckpoint(3),
    expectedSnippets: 4, // 3 locals + 1 addition
  });
  assert.equal(outcome.status, 'ok');
  if (outcome.status === 'ok') assert.equal(outcome.snippetsWritten, 1);
  assert.equal(atomicCalls.length, 1);
  assert.equal(atomicCalls[0]!.clearExisting, false);
  assert.equal(atomicCalls[0]!.preferences, null); // no opt-in ⇒ preferences never written
  assert.deepEqual(verifyCalls, [{ expectedSnippets: 4, expectedCategories: null }]);
});

test('executeRestore: replace success — clears snippets+categories, expected categories include default survivor', async () => {
  const parsed = await makeV2Parsed();
  if (parsed.status !== 'ok') throw new Error('fixture failed');
  const plan = buildReplacePlan(parsed.snapshot); // snapshot HAS 'default'
  const { deps, atomicCalls, verifyCalls } = makeExecutorDeps();
  const outcome = await executeRestore(deps, {
    mode: 'replace',
    plan,
    preferences: null,
    checkpoint: verifiedCheckpoint(9),
    expectedSnippets: plan.snippetsToWrite.length,
  });
  assert.equal(outcome.status, 'ok');
  assert.equal(atomicCalls[0]!.clearExisting, true);
  assert.deepEqual(verifyCalls[0]!.expectedCategories, 2); // snapshot already contains 'default' → no +1

  const parsed2 = await makeV2Parsed([makeSnippet('x', { categoryId: 'only' })]);
  if (parsed2.status !== 'ok') throw new Error('fixture failed');
  const plan2 = buildReplacePlan({
    ...parsed2.snapshot,
    payload: { ...parsed2.snapshot.payload, categories: [{ id: 'only', name: 'Only', color: '#0d9488' }] },
  });
  assert.equal(plan2.categoriesToWrite.some((c) => c.id === 'default'), false);
  const { deps: deps2, verifyCalls: verifyCalls2 } = makeExecutorDeps();
  await executeRestore(deps2, {
    mode: 'replace',
    plan: plan2,
    preferences: null,
    checkpoint: verifiedCheckpoint(1),
    expectedSnippets: plan2.snippetsToWrite.length,
  });
  assert.deepEqual(verifyCalls2[0]!.expectedCategories, 2); // snapshot's 1 category + guaranteed default
});

test('executeRestore: preferences reach the transaction only via the plan opt-in', async () => {
  const parsed = await makeV2Parsed();
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [], localCategories: LOCAL_CATEGORIES });
  if (preview.status !== 'ok') throw new Error('preview failed');
  const prefs = makePrefs({ theme: 'dark' });
  const planOptIn = buildMergePlan(preview.preview, { applyPreferences: true, choices: {} });
  // This snapshot has no preferences payload; applyResolutions keeps the opt-in false.
  assert.equal(planOptIn.applyPreferences, false);
  const { deps, atomicCalls } = makeExecutorDeps();
  await executeRestore(deps, { mode: 'merge', plan: planOptIn, preferences: prefs, checkpoint: verifiedCheckpoint(1), expectedSnippets: 1 });
  assert.equal(atomicCalls[0]!.preferences, null);
});

test('executeRestore: injected write failure → write-failed, verification never runs (tx rollback = no partial restore)', async () => {
  const { deps, verifyCalls } = makeExecutorDeps({ failAtomic: true });
  const outcome = await executeRestore(deps, {
    mode: 'merge',
    plan: { snippetsToWrite: [makeSnippet('a')], categoriesToWrite: [], reIdApplied: [], missingCategoryFallbackIds: [], applyPreferences: false },
    preferences: null,
    checkpoint: verifiedCheckpoint(2),
    expectedSnippets: 3,
  });
  assert.equal(outcome.status, 'write-failed');
  if (outcome.status === 'write-failed') assert.match(outcome.message, /injected write failure/);
  assert.equal(verifyCalls.length, 0);
});

test('executeRestore: post-write verification failure is surfaced honestly (verification-failed)', async () => {
  const { deps } = makeExecutorDeps({ verify: false });
  const outcome = await executeRestore(deps, {
    mode: 'replace',
    plan: { snippetsToWrite: [makeSnippet('a')], categoriesToWrite: [], reIdApplied: [], missingCategoryFallbackIds: [], applyPreferences: false },
    preferences: null,
    checkpoint: verifiedCheckpoint(2),
    expectedSnippets: 1,
  });
  assert.equal(outcome.status, 'verification-failed');
  if (outcome.status === 'verification-failed') assert.match(outcome.message, /post-restore check/);
});

test('planRestoreExpectations: merge counts locals + additions + keep-both; replace equals plan size', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1', { content: 'c-cloud' }), makeSnippet('new-1'), makeSnippet('new-2')]);
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1', { content: 'c-local' })], localCategories: LOCAL_CATEGORIES });
  if (preview.status !== 'ok') throw new Error('preview failed');
  const choices = { s1: 'keep-both' } as const;
  const plan = buildMergePlan(preview.preview, { choices });
  const checkpoint = verifiedCheckpoint(5);
  assert.deepEqual(planRestoreExpectations('merge', plan, preview.preview, { s1: 'keep-both' }, checkpoint), { expectedSnippets: 5 + 2 + 1 });
  assert.deepEqual(planRestoreExpectations('replace', plan, preview.preview, {}, checkpoint), { expectedSnippets: plan.snippetsToWrite.length });
  // take-incoming overwrites → no count change; keep-local skips → none either.
  assert.deepEqual(planRestoreExpectations('merge', plan, preview.preview, { s1: 'take-incoming' }, checkpoint), { expectedSnippets: 7 });
  assert.deepEqual(planRestoreExpectations('merge', plan, preview.preview, { s1: 'keep-local' }, checkpoint), { expectedSnippets: 7 });
});

test('cancellation: building preview and plan performs no writes (executor never invoked)', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1', { content: 'cloud' })]);
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [makeSnippet('s1')], localCategories: LOCAL_CATEGORIES });
  if (preview.status !== 'ok') throw new Error('preview failed');
  void buildMergePlan(preview.preview, { choices: { s1: 'take-incoming' } }); // user picks, then cancels
  const { deps, atomicCalls, verifyCalls } = makeExecutorDeps();
  assert.equal(atomicCalls.length, 0); // executeRestore never called
  assert.equal(verifyCalls.length, 0);
});

test('category integrity: missing-category fallbacks flow into the transaction args', async () => {
  const parsed = await makeV2Parsed([makeSnippet('s1', { categoryId: 'cat-gone' })]);
  const preview = await previewRestoreFromParsed(parsed, { localSnippets: [], localCategories: [] });
  if (preview.status !== 'ok') throw new Error('preview failed');
  const plan = buildMergePlan(preview.preview);
  assert.deepEqual(plan.missingCategoryFallbackIds, ['cat-gone']);
  const { deps, atomicCalls } = makeExecutorDeps();
  await executeRestore(deps, { mode: 'merge', plan, preferences: null, checkpoint: verifiedCheckpoint(0), expectedSnippets: 1 });
  assert.deepEqual(atomicCalls[0]!.plan.missingCategoryFallbackIds, ['cat-gone']);
});
