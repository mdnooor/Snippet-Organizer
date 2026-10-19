/**
 * GD-03 — Local library gathering for cloud snapshots.
 *
 * Reads the full-fidelity local state (ACTIVE AND TRASHED snippets, categories,
 * preferences) in deterministic order, per the GD-03 addendum in
 * docs/google-drive-integration/data-contract.md §14:
 *  - snippets/categories sorted by id ⇒ unchanged data ⇒ identical payload bytes
 *    ⇒ identical digest ⇒ identical backupId;
 *  - strictly read-only: no purge, no writes, no caller-object mutation;
 *  - the DB binding is injected so this module stays testable without IndexedDB.
 */
import type { Category, Preferences, Snippet } from '../types';

/** The three read functions needed to assemble a snapshot payload. */
export interface SnapshotReaders {
  getAllSnippetsIncludingTrash(): Promise<Snippet[]>;
  getCategories(): Promise<Category[]>;
  getPreferences(): Promise<Preferences>;
}

export interface GatheredLibrary {
  snippets: Snippet[];
  categories: Category[];
  preferences: Preferences;
  counts: { activeSnippets: number; trashedSnippets: number; categories: number };
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function isTrashed(snippet: Snippet): boolean {
  return snippet.deletedAt !== null && snippet.deletedAt !== undefined;
}

/**
 * Gather and normalize the library state for a snapshot. Pure with respect to
 * inputs: returned records are copies; the caller's arrays are not modified.
 * Throws only if a reader violates its contract (non-array result) — the
 * orchestrator maps that to a typed gather failure.
 */
export async function gatherSnapshotData(readers: SnapshotReaders): Promise<GatheredLibrary> {
  const [snippets, categories, preferences] = await Promise.all([
    readers.getAllSnippetsIncludingTrash(),
    readers.getCategories(),
    readers.getPreferences(),
  ]);

  if (!Array.isArray(snippets)) throw new TypeError('getAllSnippetsIncludingTrash must return an array');
  if (!Array.isArray(categories)) throw new TypeError('getCategories must return an array');
  if (!preferences || typeof preferences !== 'object') throw new TypeError('getPreferences must return a preferences object');

  const sortedSnippets = snippets.map((s) => ({ ...s })).sort(byId);
  const sortedCategories = categories.map((c) => ({ ...c })).sort(byId);

  return {
    snippets: sortedSnippets,
    categories: sortedCategories,
    preferences: { ...preferences },
    counts: {
      activeSnippets: sortedSnippets.filter((s) => !isTrashed(s)).length,
      trashedSnippets: sortedSnippets.filter(isTrashed).length,
      categories: sortedCategories.length,
    },
  };
}
