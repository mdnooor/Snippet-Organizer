import { Snippet, Category, Preferences, CategoryWithCount, BackupData } from './types';
import { normalizeUiShortcuts } from './shortcutUtils'; // SNIPPET-KBD-02 load-time migration

const DB_NAME = 'snippet-organizer';
const DB_VERSION = 1;
const STORE_SNIPPETS = 'snippets';
const STORE_CATEGORIES = 'categories';
const STORE_PREFS = 'preferences';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'default', name: 'Default', color: '#4f46e5' },
  { id: 'shipping', name: 'Shipping', color: '#64748b' },
  { id: 'billing', name: 'Billing', color: '#d97706' },
  { id: 'account', name: 'Account', color: '#0d9488' },
];

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'snip-1',
    title: 'Refund Approved',
    content: "<p>Hi, thanks for reaching out! I'm happy to confirm that your refund has been approved. The amount will be credited back to your original payment method within 3–5 business days.</p>",
    categoryId: 'default',
    isFavorite: false,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 2,
    lastUsedAt: Date.now() - 60000 * 2,
    deletedAt: null,
    version: 1,
  },
  {
    id: 'snip-2',
    title: 'Shipping Delay',
    content: '<p>We apologize for the delay in your order. Our team is working hard to get it to you as soon as possible and tracking information will be updated shortly.</p>',
    categoryId: 'shipping',
    isFavorite: false,
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 4,
    lastUsedAt: Date.now() - 3600000 * 2,
    deletedAt: null,
    version: 1,
  },
  {
    id: 'snip-3',
    title: 'Order Cancellation',
    content: '<p>Your cancellation request has been processed successfully. You will receive a confirmation email with details regarding your account and any pending charges.</p>',
    categoryId: 'billing',
    isFavorite: true,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 8,
    lastUsedAt: Date.now() - 3600000 * 5,
    deletedAt: null,
    version: 1,
  },
  {
    id: 'snip-4',
    title: 'Account Verification',
    content: '<p>To verify your account, please follow the steps below:<br>1. Go to your account settings<br>2. Click on Verify Identity<br>3. Upload your confirmation code.</p>',
    categoryId: 'account',
    isFavorite: false,
    createdAt: Date.now() - 3600000 * 48,
    updatedAt: Date.now() - 3600000 * 24,
    lastUsedAt: Date.now() - 3600000 * 10,
    deletedAt: null,
    version: 1,
  },
  {
    id: 'snip-5',
    title: 'Contact Support',
    content: "<p>If you need any further assistance, please feel free to reach out to our support team. We're here to help!</p>",
    categoryId: 'default',
    isFavorite: false,
    createdAt: Date.now() - 3600000 * 72,
    updatedAt: Date.now() - 3600000 * 30,
    lastUsedAt: Date.now() - 3600000 * 20,
    deletedAt: null,
    version: 1,
  },
];

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  favoriteConfirmationEnabled: false,
  searchFields: {
    title: true,
    content: true,
    category: true,
  },
  autoSyncEnabled: true,
  quickCopyOnClick: false,
  showCopyNotification: true,
  defaultCategoryId: 'default',
  defaultFilter: 'all',
  customShortcut: 'Ctrl+K',
  // SNIPPET-KBD-02 defaults. Navigation is fixed to the arrow keys; Enter copies
  // the active snippet; Backspace clears the search from the list context;
  // Ctrl+Shift+S focuses search. The global toggle (Ctrl+Shift+X) is a Chrome
  // command, not stored here.
  uiShortcuts: {
    focusSearch: 'Ctrl+Shift+S',
    copy: 'Enter',
    clearSearch: 'Backspace',
  },
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_SNIPPETS)) {
        const snippetStore = db.createObjectStore(STORE_SNIPPETS, { keyPath: 'id' });
        snippetStore.createIndex('categoryId', 'categoryId', { unique: false });
        snippetStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        snippetStore.createIndex('deletedAt', 'deletedAt', { unique: false });
        snippetStore.createIndex('lastUsedAt', 'lastUsedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS, { keyPath: 'id' });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      await seedInitialDataIfEmpty(db);
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

async function seedInitialDataIfEmpty(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction([STORE_CATEGORIES, STORE_SNIPPETS, STORE_PREFS], 'readwrite');
    const catStore = tx.objectStore(STORE_CATEGORIES);
    const snipStore = tx.objectStore(STORE_SNIPPETS);
    const prefStore = tx.objectStore(STORE_PREFS);

    const countReq = snipStore.count();
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          catStore.put(cat);
        }
        for (const snip of DEFAULT_SNIPPETS) {
          snipStore.put(snip);
        }
        prefStore.put({ id: 'user_preferences', ...DEFAULT_PREFERENCES });
      }
      resolve();
    };
    countReq.onerror = () => resolve();
  });
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(?:#39|apos);/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getCategories(): Promise<Category[]> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CATEGORIES, 'readonly');
      const store = tx.objectStore(STORE_CATEGORIES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || DEFAULT_CATEGORIES);
      req.onerror = () => resolve(DEFAULT_CATEGORIES);
    });
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function getAllSnippets(): Promise<Snippet[]> {
  try {
    const db = await openDb();
    purgeExpiredTrash().catch(() => {});
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readonly');
      const store = tx.objectStore(STORE_SNIPPETS);
      const req = store.getAll();
      req.onsuccess = () => {
        const snippets: Snippet[] = req.result || [];
        const active = snippets.filter((s) => s.deletedAt === null);
        active.sort(sortSnippets);
        resolve(active);
      };
      req.onerror = () => resolve(DEFAULT_SNIPPETS);
    });
  } catch {
    return DEFAULT_SNIPPETS;
  }
}

/**
 * GD-03 — Trash-inclusive read for cloud snapshots.
 *
 * Returns ACTIVE AND TRASHED snippets (deletion tombstones preserved) so cloud
 * backups are full-fidelity per docs/google-drive-integration/data-contract.md.
 * Deliberately does NOT purge expired trash (unlike getAllSnippets/getTrashedSnippets):
 * gathering a backup must never mutate local data, and tombstones must survive
 * into the snapshot. Read-only; sorted by id for deterministic backup digests.
 */
export async function getAllSnippetsIncludingTrash(): Promise<Snippet[]> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readonly');
      const store = tx.objectStore(STORE_SNIPPETS);
      const req = store.getAll();
      req.onsuccess = () => {
        const snippets: Snippet[] = (req.result || []).map((s) => ({ ...s }));
        snippets.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        resolve(snippets);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getFavoriteSnippets(): Promise<Snippet[]> {
  const all = await getAllSnippets();
  return all.filter((s) => s.isFavorite);
}

export async function getRecentSnippets(limit = 5): Promise<Snippet[]> {
  const all = await getAllSnippets();
  return all.slice(0, Math.max(1, limit));
}

function sortSnippets(a: Snippet, b: Snippet): number {
  const aUsed = a.lastUsedAt ?? -1;
  const bUsed = b.lastUsedAt ?? -1;
  if (aUsed === bUsed) {
    if (a.createdAt === b.createdAt) {
      return a.id.localeCompare(b.id);
    }
    return b.createdAt - a.createdAt;
  }
  return bUsed - aUsed;
}

export interface SearchFieldsConfig {
  title?: boolean;
  content?: boolean;
  category?: boolean;
}

/**
 * Filter and rank snippets according to the canonical search priority order:
 * 1. Title (highest priority)
 * 2. Content (second priority)
 * 3. Category (third priority)
 *
 * Rules:
 * - Disabled fields never participate in matching or ranking.
 * - When multiple enabled fields match a snippet, the snippet is ranked by its
 *   highest-priority matching field (Title match takes precedence even if Content also matches).
 * - Within the same priority group, exact matches rank above prefix matches, which rank above partial matches.
 * - Equivalent rank preserves original order (tie-breaker: recency / default sort / filter order).
 */
export function filterAndRankSnippets(
  snippets: Snippet[],
  query: string,
  categoriesMap: Map<string, string>,
  searchFields?: SearchFieldsConfig
): Snippet[] {
  const q = query.toLowerCase().trim();
  if (!q) return snippets;

  const searchTitle = searchFields?.title ?? true;
  const searchContent = searchFields?.content ?? true;
  const searchCategory = searchFields?.category ?? true;

  // If all search fields are disabled, no snippets match
  if (!searchTitle && !searchContent && !searchCategory) {
    return [];
  }

  interface ScoredSnippet {
    snippet: Snippet;
    score: number;
    originalIndex: number;
  }

  const scored: ScoredSnippet[] = [];

  for (let i = 0; i < snippets.length; i++) {
    const s = snippets[i];

    // 1. Title match (Priority 1)
    let hasTitleMatch = false;
    let titleScore = 99;
    if (searchTitle) {
      const titleLower = s.title.toLowerCase().trim();
      if (titleLower.includes(q)) {
        hasTitleMatch = true;
        if (titleLower === q) {
          titleScore = 10; // Exact match
        } else if (titleLower.startsWith(q)) {
          titleScore = 11; // Prefix match
        } else {
          titleScore = 12; // Partial / substring match
        }
      }
    }

    // 2. Content match (Priority 2)
    let hasContentMatch = false;
    let contentScore = 99;
    if (searchContent) {
      const contentText = stripHtml(s.content).toLowerCase();
      if (contentText.includes(q)) {
        hasContentMatch = true;
        if (contentText.trim() === q) {
          contentScore = 20; // Exact match
        } else if (contentText.trim().startsWith(q)) {
          contentScore = 21; // Prefix match
        } else {
          contentScore = 22; // Partial / substring match
        }
      }
    }

    // 3. Category match (Priority 3)
    let hasCatMatch = false;
    let catScore = 99;
    if (searchCategory) {
      const catName = (categoriesMap.get(s.categoryId) || '').toLowerCase().trim();
      if (catName.includes(q)) {
        hasCatMatch = true;
        if (catName === q) {
          catScore = 30; // Exact match
        } else if (catName.startsWith(q)) {
          catScore = 31; // Prefix match
        } else {
          catScore = 32; // Partial / substring match
        }
      }
    }

    // Must match at least one enabled field
    if (!hasTitleMatch && !hasContentMatch && !hasCatMatch) {
      continue;
    }

    // Classify by highest-priority match (Title > Content > Category)
    let finalScore: number;
    if (hasTitleMatch) {
      finalScore = titleScore;
    } else if (hasContentMatch) {
      finalScore = contentScore;
    } else {
      finalScore = catScore;
    }

    scored.push({
      snippet: s,
      score: finalScore,
      originalIndex: i,
    });
  }

  // Sort strictly by priority score ascending, preserving original order on tie
  scored.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return a.originalIndex - b.originalIndex;
  });

  return scored.map((item) => item.snippet);
}

export async function searchSnippets(
  query: string,
  categoriesMap: Map<string, string>,
  searchFields?: SearchFieldsConfig
): Promise<Snippet[]> {
  const all = await getAllSnippets();
  const q = query.toLowerCase().trim();
  if (!q) return all;

  const fields = searchFields ?? (await getPreferences()).searchFields;
  return filterAndRankSnippets(all, q, categoriesMap, fields);
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const snippet: Snippet | undefined = getReq.result;
      if (!snippet) {
        resolve();
        return;
      }
      snippet.isFavorite = isFavorite;
      snippet.updatedAt = Date.now();
      snippet.version += 1;
      store.put(snippet);
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function recordUsage(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const snippet: Snippet | undefined = getReq.result;
      if (!snippet) {
        resolve();
        return;
      }
      snippet.lastUsedAt = Date.now();
      snippet.updatedAt = Date.now();
      snippet.version += 1;
      store.put(snippet);
      resolve();
    };
    getReq.onerror = () => resolve();
  });
}

export async function createSnippet(data: {
  title: string;
  content: string;
  categoryId: string;
  isFavorite?: boolean;
}): Promise<Snippet> {
  const db = await openDb();
  const now = Date.now();
  const newSnippet: Snippet = {
    id: 'snip-' + crypto.randomUUID(),
    title: data.title.trim(),
    content: data.content,
    categoryId: data.categoryId,
    isFavorite: data.isFavorite ?? false,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    deletedAt: null,
    version: 1,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const req = store.add(newSnippet);
    req.onsuccess = () => resolve(newSnippet);
    req.onerror = () => reject(req.error);
  });
}

export async function updateSnippet(
  id: string,
  patch: Partial<Pick<Snippet, 'title' | 'content' | 'categoryId' | 'isFavorite'>>
): Promise<Snippet> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const snippet: Snippet | undefined = getReq.result;
      if (!snippet) {
        reject(new Error('Snippet not found'));
        return;
      }
      if (patch.title !== undefined) snippet.title = patch.title.trim();
      if (patch.content !== undefined) snippet.content = patch.content;
      if (patch.categoryId !== undefined) snippet.categoryId = patch.categoryId;
      if (patch.isFavorite !== undefined) snippet.isFavorite = patch.isFavorite;
      snippet.updatedAt = Date.now();
      snippet.version += 1;

      store.put(snippet);
      resolve(snippet);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteSnippet(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const snippet: Snippet | undefined = getReq.result;
      if (!snippet) {
        resolve();
        return;
      }
      snippet.deletedAt = Date.now();
      snippet.updatedAt = Date.now();
      snippet.version += 1;
      store.put(snippet);
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export const TRASH_RETENTION_DAYS = 3;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000; // 3 days (72 hours)

/**
 * Permanently deletes any trashed snippets that have exceeded the 3-day retention period.
 */
export async function purgeExpiredTrash(): Promise<number> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
      const store = tx.objectStore(STORE_SNIPPETS);
      const req = store.getAll();
      let purgedCount = 0;

      req.onsuccess = () => {
        const snippets: Snippet[] = req.result || [];
        const now = Date.now();
        for (const s of snippets) {
          if (s.deletedAt !== null && now - s.deletedAt > TRASH_RETENTION_MS) {
            store.delete(s.id);
            purgedCount++;
          }
        }
      };

      tx.oncomplete = () => resolve(purgedCount);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Retrieves all currently trashed snippets (deletedAt is not null), sorted newest deletion first.
 * Expired items older than 3 days are purged first.
 */
export async function getTrashedSnippets(): Promise<Snippet[]> {
  try {
    await purgeExpiredTrash();
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readonly');
      const store = tx.objectStore(STORE_SNIPPETS);
      const req = store.getAll();
      req.onsuccess = () => {
        const snippets: Snippet[] = req.result || [];
        const trashed = snippets.filter((s) => s.deletedAt !== null);
        trashed.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
        resolve(trashed);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Restores a trashed snippet to active status (deletedAt = null).
 * Preserves the original category reference, falling back to 'default' only if the original
 * category was deleted while the snippet was in trash.
 */
export async function restoreSnippet(id: string): Promise<Snippet> {
  const db = await openDb();
  const categories = await getCategories();
  const validCategoryIds = new Set(categories.map((c) => c.id));

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const snippet: Snippet | undefined = getReq.result;
      if (!snippet) {
        reject(new Error('Snippet not found in Trash'));
        return;
      }

      snippet.deletedAt = null;
      snippet.updatedAt = Date.now();
      snippet.version = (snippet.version || 1) + 1;

      // Preserve category reference; fallback to default if deleted
      if (!validCategoryIds.has(snippet.categoryId)) {
        snippet.categoryId = 'default';
      }

      store.put(snippet);
      resolve(snippet);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Restores all trashed snippets back into the library.
 */
export async function restoreAllTrashedSnippets(): Promise<number> {
  const db = await openDb();
  const categories = await getCategories();
  const validCategoryIds = new Set(categories.map((c) => c.id));

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const req = store.getAll();
    let restoredCount = 0;

    req.onsuccess = () => {
      const snippets: Snippet[] = req.result || [];
      const now = Date.now();
      for (const snippet of snippets) {
        if (snippet.deletedAt !== null) {
          snippet.deletedAt = null;
          snippet.updatedAt = now;
          snippet.version = (snippet.version || 1) + 1;
          if (!validCategoryIds.has(snippet.categoryId)) {
            snippet.categoryId = 'default';
          }
          store.put(snippet);
          restoredCount++;
        }
      }
    };

    tx.oncomplete = () => resolve(restoredCount);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Permanently removes a snippet from IndexedDB storage.
 */
export async function permanentlyDeleteSnippet(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Permanently deletes all trashed snippets from storage.
 */
export async function emptyTrash(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
    const store = tx.objectStore(STORE_SNIPPETS);
    const req = store.getAll();
    let deletedCount = 0;

    req.onsuccess = () => {
      const snippets: Snippet[] = req.result || [];
      for (const s of snippets) {
        if (s.deletedAt !== null) {
          store.delete(s.id);
          deletedCount++;
        }
      }
    };

    tx.oncomplete = () => resolve(deletedCount);
    tx.onerror = () => reject(tx.error);
  });
}

export async function copySnippet(snippet: Snippet): Promise<boolean> {
  const plainText = stripHtml(snippet.content);
  let copied = false;

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([snippet.content], { type: 'text/html' }),
        }),
      ]);
      copied = true;
    } catch {
      // fallback
    }
  }

  if (!copied && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(plainText);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (copied) {
    await recordUsage(snippet.id);
  }

  return copied;
}

export async function createCategory(name: string, color: string): Promise<Category> {
  const db = await openDb();
  const id = 'cat-' + crypto.randomUUID().slice(0, 8);
  const newCat: Category = { id, name: name.trim(), color };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORE_CATEGORIES);
    const req = store.add(newCat);
    req.onsuccess = () => resolve(newCat);
    req.onerror = () => reject(req.error);
  });
}

export async function duplicateSnippet(snippetId: string): Promise<Snippet> {
  const all = await getAllSnippets();
  const target = all.find((s) => s.id === snippetId);
  if (!target) throw new Error('Snippet not found');
  return createSnippet({
    title: target.title + ' (Copy)',
    content: target.content,
    categoryId: target.categoryId,
    isFavorite: target.isFavorite,
  });
}

export async function getPreferences(): Promise<Preferences> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PREFS, 'readonly');
      const store = tx.objectStore(STORE_PREFS);
      const req = store.get('user_preferences');
      req.onsuccess = () => {
        if (req.result) {
          const { id, ...prefs } = req.result;
          resolve({
            ...DEFAULT_PREFERENCES,
            ...prefs,
            searchFields: {
              ...DEFAULT_PREFERENCES.searchFields,
              ...(prefs.searchFields || {}),
            },
            // SNIPPET-KBD-02: drop obsolete keys and migrated defaults on load so
            // the Shift / Ctrl+Shift / Space bindings can never resurface.
            uiShortcuts: normalizeUiShortcuts(prefs.uiShortcuts),
          });
        } else {
          resolve(DEFAULT_PREFERENCES);
        }
      };
      req.onerror = () => resolve(DEFAULT_PREFERENCES);
    });
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(patch: Partial<Preferences>): Promise<Preferences> {
  const current = await getPreferences();
  const updated: Preferences = {
    ...current,
    ...patch,
    searchFields: {
      ...current.searchFields,
      ...(patch.searchFields || {}),
    },
  };

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFS, 'readwrite');
    const store = tx.objectStore(STORE_PREFS);
    const req = store.put({ id: 'user_preferences', ...updated });
    req.onsuccess = () => {
      // Mirror to chrome.storage if available
      try {
        const chromeApi = (globalThis as unknown as { chrome?: { storage?: { local?: { set: (obj: any) => void } } } }).chrome;
        if (chromeApi?.storage?.local) {
          chromeApi.storage.local.set({ user_preferences: updated });
        }
      } catch {}
      resolve(updated);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function resetPreferences(): Promise<Preferences> {
  return savePreferences(DEFAULT_PREFERENCES);
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'color'>>
): Promise<Category> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORE_CATEGORIES);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const cat: Category | undefined = getReq.result;
      if (!cat) {
        reject(new Error('Category not found'));
        return;
      }
      if (patch.name !== undefined && patch.name.trim().length > 0) {
        cat.name = patch.name.trim();
      }
      if (patch.color !== undefined) {
        cat.color = patch.color;
      }
      const putReq = store.put(cat);
      putReq.onsuccess = () => resolve(cat);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteCategory(id: string, fallbackCategoryId = 'default'): Promise<void> {
  if (id === 'default') {
    throw new Error('The Default category cannot be deleted.');
  }

  const db = await openDb();
  // 1. Reassign snippets in this category to fallback category
  const snippets = await getAllSnippets();
  const affected = snippets.filter((s) => s.categoryId === id);

  for (const snip of affected) {
    await updateSnippet(snip.id, { categoryId: fallbackCategoryId });
  }

  // 2. Remove category from store
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORE_CATEGORIES);
    const delReq = store.delete(id);
    delReq.onsuccess = () => resolve();
    delReq.onerror = () => reject(delReq.error);
  });
}

export async function getCategoriesWithCount(): Promise<CategoryWithCount[]> {
  const [categories, snippets] = await Promise.all([getCategories(), getAllSnippets()]);
  const counts = new Map<string, number>();

  for (const snip of snippets) {
    if (snip.deletedAt === null) {
      counts.set(snip.categoryId, (counts.get(snip.categoryId) || 0) + 1);
    }
  }

  return categories.map((c) => ({
    ...c,
    snippetCount: counts.get(c.id) || 0,
  }));
}

export async function exportAllData(): Promise<BackupData> {
  const [snippets, categories, preferences] = await Promise.all([
    getAllSnippets(),
    getCategories(),
    getPreferences(),
  ]);

  return {
    version: 1,
    exportedAt: Date.now(),
    appName: 'Snippet Organizer',
    snippets,
    categories,
    preferences,
  };
}

export async function importData(
  data: BackupData,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ snippetsCount: number; categoriesCount: number }> {
  if (!data || !Array.isArray(data.snippets) || !Array.isArray(data.categories)) {
    throw new Error('Invalid backup file format: missing snippets or categories.');
  }

  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CATEGORIES, STORE_SNIPPETS, STORE_PREFS], 'readwrite');
    const catStore = tx.objectStore(STORE_CATEGORIES);
    const snipStore = tx.objectStore(STORE_SNIPPETS);
    const prefStore = tx.objectStore(STORE_PREFS);

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => {
      resolve({
        snippetsCount: data.snippets.length,
        categoriesCount: data.categories.length,
      });
    };

    if (mode === 'replace') {
      catStore.clear();
      snipStore.clear();
    }

    // Import categories
    for (const cat of data.categories) {
      if (cat.id && cat.name) {
        catStore.put({
          id: cat.id,
          name: cat.name,
          color: cat.color || '#4f46e5',
        });
      }
    }

    // Ensure default category exists
    catStore.put(DEFAULT_CATEGORIES[0]);

    // Import snippets
    for (const s of data.snippets) {
      if (s.id && s.title) {
        snipStore.put({
          ...s,
          deletedAt: s.deletedAt ?? null,
          isFavorite: Boolean(s.isFavorite),
          updatedAt: s.updatedAt || Date.now(),
          createdAt: s.createdAt || Date.now(),
          version: (s.version || 0) + 1,
        });
      }
    }

    // Import preferences if present
    if (data.preferences) {
      prefStore.put({
        id: 'user_preferences',
        ...DEFAULT_PREFERENCES,
        ...data.preferences,
      });
    }
  });
}

export async function resetToDefaultData(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CATEGORIES, STORE_SNIPPETS, STORE_PREFS], 'readwrite');
    const catStore = tx.objectStore(STORE_CATEGORIES);
    const snipStore = tx.objectStore(STORE_SNIPPETS);
    const prefStore = tx.objectStore(STORE_PREFS);

    catStore.clear();
    snipStore.clear();
    prefStore.clear();

    const now = Date.now();
    for (const cat of DEFAULT_CATEGORIES) {
      catStore.put(cat);
    }
    for (const snip of DEFAULT_SNIPPETS) {
      snipStore.put({
        ...snip,
        createdAt: now - (Date.now() - snip.createdAt),
        updatedAt: now,
      });
    }
    prefStore.put({ id: 'user_preferences', ...DEFAULT_PREFERENCES });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ===========================================================================
// GD-05 — cloud restore execution (single atomic transaction, GD-01 write plan)
// ===========================================================================

/** Read the FULL local state for the pre-restore safety checkpoint (tombstones included). */
export async function readAllLocalStateForRestore(): Promise<{
  snippets: Snippet[];
  categories: Category[];
  preferences: Preferences;
}> {
  const [snippets, categories, preferences] = await Promise.all([
    getAllSnippetsIncludingTrash(),
    getCategories(),
    getPreferences(),
  ]);
  return { snippets, categories, preferences };
}

export interface RestoreApplyArgs {
  /** GD-01 write plan: snippets/categories to put, missing-category fallbacks, prefs opt-in. */
  plan: {
    snippetsToWrite: Snippet[];
    categoriesToWrite: Category[];
    missingCategoryFallbackIds: string[];
    applyPreferences: boolean;
  };
  /** Replace mode: clear snippets + categories first (preferences are NEVER cleared). */
  clearExisting: boolean;
  /** Snapshot preferences; non-null only with explicit user opt-in (plan.applyPreferences). */
  preferences: Preferences | null;
}

/**
 * Execute a GD-05 restore write plan inside ONE readwrite transaction over
 * snippets + categories + preferences — mirroring the established importData /
 * resetToDefaultData pattern. Any failure aborts the whole transaction (IndexedDB
 * rolls back every put/clear), so a failed restore can never be partially applied.
 * Records are written VERBATIM from the validated snapshot (GD-01 contract: no
 * version bumps, no timestamp rewriting); the only rewrite is remapping snippets
 * whose categoryId is missing from BOTH snapshot and local store to 'default'.
 */
export async function applyRestoreWritePlan(args: RestoreApplyArgs): Promise<{
  snippetsWritten: number;
  categoriesWritten: number;
}> {
  const { plan, clearExisting, preferences } = args;
  const fallbackIds = new Set(plan.missingCategoryFallbackIds);
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CATEGORIES, STORE_SNIPPETS, STORE_PREFS], 'readwrite');
    const catStore = tx.objectStore(STORE_CATEGORIES);
    const snipStore = tx.objectStore(STORE_SNIPPETS);
    const prefStore = tx.objectStore(STORE_PREFS);

    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Restore transaction aborted; nothing was written.'));
    tx.oncomplete = () => {
      resolve({
        snippetsWritten: plan.snippetsToWrite.length,
        categoriesWritten: plan.categoriesToWrite.length,
      });
    };

    if (clearExisting) {
      snipStore.clear();
      catStore.clear();
    }

    // Categories first (put = merge by id in merge mode; full set in replace mode).
    for (const cat of plan.categoriesToWrite) {
      catStore.put({ id: cat.id, name: cat.name, color: cat.color || '#4f46e5' });
    }
    if (clearExisting) {
      catStore.put(DEFAULT_CATEGORIES[0]); // 'default' always survives a Replace (existing contract)
    }

    for (const snippet of plan.snippetsToWrite) {
      snipStore.put(
        fallbackIds.has(snippet.categoryId) ? { ...snippet, categoryId: 'default' } : { ...snippet },
      );
    }

    if (plan.applyPreferences && preferences) {
      prefStore.put({ id: 'user_preferences', ...DEFAULT_PREFERENCES, ...preferences });
    }
  });
}
