/**
 * GD-01 — Content hashing, restore preview, and conflict vocabulary. PURE module.
 *
 * Canonical specification: docs/google-drive-integration/data-contract.md (ADR-011).
 * Final decisions implemented here (user-approved 2026-10-18):
 *  - D5: identity = snippet `id`; equivalence = deterministic content hash over
 *    {title (trimmed), content (verbatim), categoryId, isFavorite}. Volatile fields
 *    (createdAt, updatedAt, lastUsedAt, version) are EXCLUDED — usage/copy activity and
 *    import-time version bumps are not content changes. `deletedAt` is excluded from the
 *    content hash and compared as a separate deletion state.
 *  - D5/D6: conflicts are always surfaced in a preview; NOTHING is silently overwritten;
 *    naive "newest timestamp wins" is never used. Default resolution = keep-local.
 *
 * Cloud data is untrusted input: preview/plan functions only read and copy; they never
 * write to any store (the restore transaction itself is GD-05) and never render anything.
 */
import type { Category, Snippet } from '../types';
import { type CloudSnapshotEnvelope, type SnapshotWarning } from './types';
import { canonicalJson, sha256Hex } from './snapshot';

// ---------------------------------------------------------------------------
// Normalization + content hash
// ---------------------------------------------------------------------------

export function normalizeTitle(title: string): string {
  return title.trim();
}

/**
 * Deterministic content hash. Included: normalized title, verbatim content, categoryId,
 * isFavorite. Excluded (volatile or non-content): createdAt, updatedAt, lastUsedAt,
 * version (usage/copy/import bumps), deletedAt (tracked as deletion state).
 * Content is compared VERBATIM — no HTML normalization — so the hash can over-report
 * trivial differences (visible to the user) but never hides a real one (silent loss).
 */
export async function contentHashOfSnippet(
  snippet: Pick<Snippet, 'title' | 'content' | 'categoryId' | 'isFavorite'>,
): Promise<string> {
  const normalized = {
    categoryId: snippet.categoryId,
    content: snippet.content,
    isFavorite: snippet.isFavorite === true,
    title: normalizeTitle(snippet.title),
  };
  return `sha256:${await sha256Hex(canonicalJson(normalized))}`;
}

/** Deletion state classes on the boolean tombstone (exact `deletedAt` timestamps are not compared). */
export function isDeleted(snippet: Snippet): boolean {
  return snippet.deletedAt !== null;
}

// ---------------------------------------------------------------------------
// Restore preview
// ---------------------------------------------------------------------------

export type ConflictKind = 'content-conflict' | 'deletion-state-conflict';

export interface RestorePreviewConflict {
  id: string;
  kind: ConflictKind;
  local: Snippet;
  incoming: Snippet;
  /** True when the CONTENT hash differs; false for deletion-state-only differences. */
  contentDiffers: boolean;
}

export interface DuplicateNamePair {
  title: string;
  localId: string;
  incomingId: string;
}

export interface RestorePreviewInput {
  snapshot: CloudSnapshotEnvelope;
  /** Full local library INCLUDING trashed records (caller reads both; see data-contract.md). */
  localSnippets: Snippet[];
  localCategories: Category[];
  /** Number of records quarantined at parse time (surfaced for transparency). */
  quarantinedCount?: number;
}

export interface RestorePreview {
  /** Incoming records whose `id` does not exist locally (active or trashed) — pure additions. */
  toAdd: Snippet[];
  /** Same id + same content hash + same deletion state — restore is a no-op for these. */
  unchanged: Snippet[];
  /** Same id with differing content and/or deletion state — explicit user choice required. */
  conflicts: RestorePreviewConflict[];
  /** Same normalized title but different id — INFORMATIONAL only, both are kept. */
  duplicateNames: DuplicateNamePair[];
  /** Category ids referenced by incoming snippets but present in neither snapshot nor local store. */
  missingCategoryIds: string[];
  /** Category ids carried by the snapshot. */
  incomingCategoryIds: string[];
  /** Category records carried by the snapshot (source for the restore write plan). */
  incomingCategories: Category[];
  /** Snapshot carries preferences; applying them is a separate explicit restore choice (GD-05). */
  hasPreferences: boolean;
  quarantinedCount: number;
}

export async function computeRestorePreview(input: RestorePreviewInput): Promise<RestorePreview> {
  const localById = new Map(input.localSnippets.map((s) => [s.id, s]));
  const localCategoryIds = new Set(input.localCategories.map((c) => c.id));
  const incomingCategoryIds = new Set(input.snapshot.payload.categories.map((c) => c.id));

  const preview: RestorePreview = {
    toAdd: [],
    unchanged: [],
    conflicts: [],
    duplicateNames: [],
    missingCategoryIds: [],
    incomingCategoryIds: [...incomingCategoryIds],
    incomingCategories: input.snapshot.payload.categories.map((c) => ({ ...c })),
    hasPreferences: input.snapshot.payload.preferences !== undefined,
    quarantinedCount: input.quarantinedCount ?? 0,
  };

  for (const incoming of input.snapshot.payload.snippets) {
    const local = localById.get(incoming.id);
    if (!local) {
      preview.toAdd.push(incoming);
      continue;
    }
    const sameContent = (await contentHashOfSnippet(local)) === (await contentHashOfSnippet(incoming));
    const sameDeletionState = isDeleted(local) === isDeleted(incoming);
    if (sameContent && sameDeletionState) {
      preview.unchanged.push(incoming);
    } else {
      preview.conflicts.push({
        id: incoming.id,
        kind: sameContent ? 'deletion-state-conflict' : 'content-conflict',
        local,
        incoming,
        contentDiffers: !sameContent,
      });
    }
  }

  // Same name / different id: informational (existing duplicate handling keeps both).
  const localTitles = new Map<string, string>();
  for (const s of input.localSnippets) {
    const nt = normalizeTitle(s.title);
    if (!localTitles.has(nt)) localTitles.set(nt, s.id);
  }
  for (const add of preview.toAdd) {
    const nt = normalizeTitle(add.title);
    const localId = localTitles.get(nt);
    if (localId !== undefined) preview.duplicateNames.push({ title: nt, localId, incomingId: add.id });
  }

  const referencedCategoryIds = new Set(input.snapshot.payload.snippets.map((s) => s.categoryId));
  for (const id of referencedCategoryIds) {
    if (!incomingCategoryIds.has(id) && !localCategoryIds.has(id)) preview.missingCategoryIds.push(id);
  }

  return preview;
}

// ---------------------------------------------------------------------------
// Conflict resolution -> restore write plan (still pure; GD-05 executes the transaction)
// ---------------------------------------------------------------------------

export type ConflictResolutionChoice = 'keep-local' | 'take-incoming' | 'keep-both';

export interface RestoreWritePlan {
  /** Records to put() inside the single restore transaction, resolutions applied. */
  snippetsToWrite: Snippet[];
  /** Snapshot categories to put() (put = merge by id; existing categories are untouched). */
  categoriesToWrite: Category[];
  /** 'keep-both' re-assignments: incoming record stored under a fresh id. */
  reIdApplied: { fromId: string; toId: string }[];
  /** Referenced categories missing from both snapshot and local store; restore maps them to 'default'. */
  missingCategoryFallbackIds: string[];
  /** True only when the caller explicitly chose to apply snapshot preferences. */
  applyPreferences: boolean;
}

export interface ApplyResolutionsOptions {
  /** Per-conflict choices keyed by snippet id. Unspecified conflicts default to 'keep-local'. */
  choices?: Record<string, ConflictResolutionChoice>;
  /** Explicit opt-in to overwrite local preferences with the snapshot's. */
  applyPreferences?: boolean;
  /** Injectable fresh-id factory (tests pass a deterministic one). */
  newIdFactory?: () => string;
}

function defaultNewId(): string {
  return `snip-${crypto.randomUUID()}`;
}

/**
 * Apply conflict resolutions to produce a pure write plan.
 * SAFE DEFAULT: any conflict without an explicit choice resolves to 'keep-local' —
 * the system never silently overwrites local data (D5).
 */
export function applyResolutions(
  preview: RestorePreview,
  options: ApplyResolutionsOptions = {},
): RestoreWritePlan {
  const choices = options.choices ?? {};
  const newId = options.newIdFactory ?? defaultNewId;
  const plan: RestoreWritePlan = {
    snippetsToWrite: [],
    categoriesToWrite: preview.incomingCategories.map((c) => ({ ...c })),
    reIdApplied: [],
    missingCategoryFallbackIds: [...preview.missingCategoryIds],
    applyPreferences: options.applyPreferences === true && preview.hasPreferences,
  };

  for (const add of preview.toAdd) plan.snippetsToWrite.push({ ...add });

  for (const conflict of preview.conflicts) {
    const choice = choices[conflict.id] ?? 'keep-local';
    if (choice === 'take-incoming') {
      plan.snippetsToWrite.push({ ...conflict.incoming });
    } else if (choice === 'keep-both') {
      const freshId = newId();
      plan.snippetsToWrite.push({ ...conflict.incoming, id: freshId });
      plan.reIdApplied.push({ fromId: conflict.id, toId: freshId });
    }
    // 'keep-local' (explicit or default): nothing is written for this id.
  }

  return plan;
}

/** Convenience for callers: count warnings by code (used by restore-preview UI in GD-05). */
export function countQuarantined(warnings: SnapshotWarning[]): number {
  return warnings.filter((w) => w.code === 'record-quarantined').length;
}
