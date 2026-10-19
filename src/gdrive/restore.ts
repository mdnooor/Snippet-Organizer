/**
 * GD-05 — Restore preview orchestration, pre-restore safety checkpoint, and the
 * single-transaction execution of the GD-01 write plan.
 *
 * Reuses the GD-01 contract exclusively (computeRestorePreview / applyResolutions /
 * parseCloudSnapshot) — there is no second conflict or restore vocabulary here:
 *  - preview is READ-ONLY: it classifies additions, unchanged records, conflicts
 *    (content + deletion-state), informational duplicate names, missing categories,
 *    and quarantined-record counts; canceling at any point before execution writes
 *    nothing (the preview functions cannot write — they are pure);
 *  - the safety checkpoint (GD-00 D7) captures the FULL local state INCLUDING
 *    tombstones and is verified through the existing parseCloudSnapshot contract
 *    (v1 BackupData migrates; integrity + size checks run on it). No checkpoint,
 *    no restore — destructive Replace additionally requires explicit confirmation
 *    in the UI on top of this hard gate;
 *  - execution delegates to ONE atomic IndexedDB transaction (db.applyRestoreWritePlan,
 *    mirroring the established importData/resetToDefaultData pattern). IndexedDB aborts
 *    the whole transaction on failure, so a write failure is a full rollback — never a
 *    partial restore; post-write verification then re-reads counts before success is
 *    reported;
 *  - Replace semantics follow the existing local import contract: snippets and
 *    categories are cleared and rewritten from the snapshot; preferences are only
 *    touched with explicit opt-in.
 */
import type { BackupData, Category, Preferences, Snippet } from '../types';
import { parseCloudSnapshot } from './snapshot';
import type { ParsedSnapshot, CloudSnapshotEnvelope } from './types';
import {
  applyResolutions,
  computeRestorePreview,
  countQuarantined,
  type ConflictResolutionChoice,
  type RestorePreview,
  type RestoreWritePlan,
} from './conflict';

export type RestoreMode = 'merge' | 'replace';

// ---------------------------------------------------------------------------
// Pre-restore safety checkpoint (GD-00 D7)
// ---------------------------------------------------------------------------

/** Full local state captured before any restore write; verified against the GD-01 parser. */
export interface RestoreCheckpoint {
  /** Exact pre-restore local state (v1 BackupData shape, trash-INCLUSIVE). */
  data: BackupData;
  createdAtMs: number;
  snippetCount: number;
  /** True only after parseCloudSnapshot verified the serialized checkpoint. */
  verified: true;
}

export interface CheckpointReaders {
  /** MUST include trashed snippets (tombstones) — use the trash-inclusive read. */
  readAllSnippetsIncludingTrash(): Promise<Snippet[]>;
  readCategories(): Promise<Category[]>;
  readPreferences(): Promise<Preferences>;
}

export type CheckpointResult =
  | { status: 'ok'; checkpoint: RestoreCheckpoint }
  | { status: 'failed'; message: string };

/**
 * Capture + verify the pre-restore safety snapshot. Verification reuses the GD-01
 * contract: the serialized v1 export must parse (and therefore migrate, pass integrity
 * and size checks) as a snapshot. Failure blocks every restore write.
 */
export async function buildRestoreCheckpoint(readers: CheckpointReaders): Promise<CheckpointResult> {
  try {
    const [snippets, categories, preferences] = await Promise.all([
      readers.readAllSnippetsIncludingTrash(),
      readers.readCategories(),
      readers.readPreferences(),
    ]);
    if (!Array.isArray(snippets) || !Array.isArray(categories)) {
      return { status: 'failed', message: 'Local state read returned invalid data.' };
    }
    const data: BackupData = {
      version: 1,
      exportedAt: Date.now(),
      appName: 'Snippet Organizer',
      snippets,
      categories,
      preferences,
    };
    const parsed = await parseCloudSnapshot(JSON.stringify(data));
    if (parsed.status !== 'ok') {
      return {
        status: 'failed',
        message: `Safety checkpoint failed snapshot validation (${parsed.status}); restore blocked.`,
      };
    }
    return {
      status: 'ok',
      checkpoint: {
        data,
        createdAtMs: Date.now(),
        snippetCount: snippets.length,
        verified: true,
      },
    };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Safety checkpoint could not be created.',
    };
  }
}

// ---------------------------------------------------------------------------
// Read-only preview over a validated snapshot
// ---------------------------------------------------------------------------

export type PreviewRestoreResult =
  | { status: 'ok'; preview: RestorePreview; /** The validated envelope (for Replace plans / preferences). */ envelope: CloudSnapshotEnvelope }
  | { status: 'not-usable'; /** ParsedSnapshot status: parse-error | invalid | unsupported-version. */ parsedStatus: string; message: string };

/**
 * Preview from an already-downloaded + parsed snapshot (GD-04 download path).
 * The caller supplies the trash-inclusive local state; nothing here can write.
 */
export async function previewRestoreFromParsed(
  parsed: ParsedSnapshot,
  input: { localSnippets: Snippet[]; localCategories: Category[] },
): Promise<PreviewRestoreResult> {
  if (parsed.status !== 'ok') {
    return {
      status: 'not-usable',
      parsedStatus: parsed.status,
      message: `This file is not a usable snapshot (${parsed.status}); restore is blocked.`,
    };
  }
  const preview = await computeRestorePreview({
    snapshot: parsed.snapshot,
    localSnippets: input.localSnippets,
    localCategories: input.localCategories,
    quarantinedCount: countQuarantined(parsed.warnings),
  });
  return { status: 'ok', preview, envelope: parsed.snapshot };
}

// ---------------------------------------------------------------------------
// Write plans (pure, via the GD-01 contract)
// ---------------------------------------------------------------------------

/** Merge plan: GD-01 applyResolutions with explicit choices (default keep-local). */
export function buildMergePlan(
  preview: RestorePreview,
  options: { choices?: Record<string, ConflictResolutionChoice>; applyPreferences?: boolean; newIdFactory?: () => string } = {},
): RestoreWritePlan {
  return applyResolutions(preview, {
    choices: options.choices,
    applyPreferences: options.applyPreferences,
    newIdFactory: options.newIdFactory,
  });
}

/**
 * Replace plan: the whole validated snapshot becomes the library. Follows the existing
 * local-import Replace contract — snippets + categories cleared, preferences untouched
 * unless the (separate) preferences argument is later supplied with opt-in.
 */
export function buildReplacePlan(envelope: CloudSnapshotEnvelope): RestoreWritePlan {
  const snapshotCategoryIds = new Set(envelope.payload.categories.map((c) => c.id));
  const missingCategoryFallbackIds: string[] = [];
  for (const snippet of envelope.payload.snippets) {
    if (!snapshotCategoryIds.has(snippet.categoryId) && !missingCategoryFallbackIds.includes(snippet.categoryId)) {
      missingCategoryFallbackIds.push(snippet.categoryId);
    }
  }
  return {
    snippetsToWrite: envelope.payload.snippets.map((s) => ({ ...s })),
    categoriesToWrite: envelope.payload.categories.map((c) => ({ ...c })),
    reIdApplied: [],
    missingCategoryFallbackIds,
    applyPreferences: false, // Replace never carries preferences implicitly; opt-in handled at execution.
  };
}

// ---------------------------------------------------------------------------
// Execution: one atomic transaction + post-write verification
// ---------------------------------------------------------------------------

export interface RestoreExecutorDeps {
  /** MUST run everything in a single readwrite transaction (aborts = full rollback). */
  executeAtomic(args: {
    plan: RestoreWritePlan;
    /** Replace mode clears snippets + categories first (never preferences). */
    clearExisting: boolean;
    /** Snapshot preferences, only non-null with explicit user opt-in. */
    preferences: Preferences | null;
  }): Promise<{ snippetsWritten: number; categoriesWritten: number }>;
  /** Post-restore check; success is reported ONLY when this passes. */
  verifyAfterWrite(args: { expectedSnippets: number; expectedCategories: number | null }): Promise<boolean>;
}

export interface RestoreCheckpointRef {
  snippetCount: number;
  verified: boolean;
}

export type RestoreExecutionResult =
  | { status: 'ok'; snippetsWritten: number; categoriesWritten: number }
  /** Hard gate: no verified checkpoint ⇒ no writes, ever. */
  | { status: 'checkpoint-unavailable'; message: string }
  /** Transaction aborted/failed; IndexedDB rollback means nothing was written. */
  | { status: 'write-failed'; message: string }
  /** Writes committed but post-write verification failed — surfaced honestly. */
  | { status: 'verification-failed'; message: string };

/**
 * Execute a prepared restore. Ordering is fixed: checkpoint gate → single atomic
 * transaction → post-write verification. `expectedSnippets` comes from
 * planRestoreExpectations, computed BEFORE execution.
 */
export async function executeRestore(
  deps: RestoreExecutorDeps,
  args: {
    mode: RestoreMode;
    plan: RestoreWritePlan;
    preferences: Preferences | null;
    checkpoint: RestoreCheckpointRef;
    expectedSnippets: number;
  },
): Promise<RestoreExecutionResult> {
  if (!args.checkpoint || args.checkpoint.verified !== true) {
    return { status: 'checkpoint-unavailable', message: 'No verified safety checkpoint; restore blocked.' };
  }
  let written: { snippetsWritten: number; categoriesWritten: number };
  try {
    written = await deps.executeAtomic({
      plan: args.plan,
      clearExisting: args.mode === 'replace',
      preferences: args.plan.applyPreferences ? args.preferences : null,
    });
  } catch (error) {
    return {
      status: 'write-failed',
      message: error instanceof Error ? error.message : 'The restore transaction failed and was rolled back.',
    };
  }
  // Replace rewrites categories from the snapshot; the existing local-import contract
  // guarantees the 'default' category survives, so account for it when it is absent.
  const expectedCategories =
    args.mode === 'replace'
      ? args.plan.categoriesToWrite.some((c) => c.id === 'default')
        ? args.plan.categoriesToWrite.length
        : args.plan.categoriesToWrite.length + 1
      : null;
  const verified = await deps
    .verifyAfterWrite({ expectedSnippets: args.expectedSnippets, expectedCategories })
    .catch(() => false);
  if (!verified) {
    return {
      status: 'verification-failed',
      message: 'Restore was committed but the post-restore check failed. Use the safety copy if anything looks wrong.',
    };
  }
  return { status: 'ok', snippetsWritten: written.snippetsWritten, categoriesWritten: written.categoriesWritten };
}

/**
 * Deterministic post-write expectations, computed BEFORE execution (never after —
 * expectations must not be derived from whatever the write happened to do).
 * Replace: exactly the plan size. Merge: locals + additions + keep-both re-identified
 * records (take-incoming overwrites and keep-local skips, so neither changes the count).
 */
export function planRestoreExpectations(
  mode: RestoreMode,
  plan: RestoreWritePlan,
  preview: RestorePreview,
  choices: Record<string, ConflictResolutionChoice>,
  checkpoint: RestoreCheckpointRef,
): { expectedSnippets: number } {
  if (mode === 'replace') {
    return { expectedSnippets: plan.snippetsToWrite.length };
  }
  const keepBoth = preview.conflicts.filter((c) => choices[c.id] === 'keep-both').length;
  return { expectedSnippets: checkpoint.snippetCount + preview.toAdd.length + keepBoth };
}
