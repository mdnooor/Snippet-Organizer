import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, XCircle } from 'lucide-react';
import { Header } from './Header';
import { SearchAndFilters } from './SearchAndFilters';
import { SnippetCard } from './SnippetCard';
import { Footer } from './Footer';
import { SnippetPreviewModal } from './SnippetPreviewModal';
import { SnippetEditorModal } from './SnippetEditorModal';
import { SettingsModal } from './SettingsModal';
import { Snippet, Category, FilterType, Preferences } from '../types';
import {
  DEFAULT_UI_SHORTCUTS,
  isEditableTarget,
  matchShortcut,
  parseShortcut,
} from '../shortcutUtils';
import {
  getAllSnippets,
  getFavoriteSnippets,
  getRecentSnippets,
  searchSnippets,
  filterAndRankSnippets,
  getCategories,
  toggleFavorite,
  deleteSnippet,
  createSnippet,
  duplicateSnippet,
  updateSnippet,
  copySnippet,
  createCategory,
  getPreferences,
  savePreferences,
} from '../db';
import { createConnectionProbe, type DriveConnectionState } from '../gdrive/connection';
import { createPopupRefresh } from '../popupRefresh';

interface MainPopupProps {
  onClose?: () => void;
  isStandalone?: boolean;
  isFloating?: boolean;
  onTogglePin?: () => void;
}

export const MainPopup: React.FC<MainPopupProps> = ({
  onClose,
  isStandalone = false,
  isFloating = false,
  onTogglePin,
}) => {
  const isUrlFloating =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mode') === 'floating';
  const [internalPinned, setInternalPinned] = useState(isUrlFloating || isFloating);

  useEffect(() => {
    setInternalPinned(isUrlFloating || isFloating);
  }, [isUrlFloating, isFloating]);

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Map<string, string>>(new Map());

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);

  // PR-1: REAL Drive connection status for the footer. Silent probe at popup
  // open — chrome.identity non-interactive path + Drive about.get; NEVER
  // prompts (worst case: interaction-required maps to 'not-connected').
  // In-memory only; re-probed on every popup open AND on Refresh-button clicks
  // (POPUP-REFRESH-01). The probe itself honors the persisted
  // `gdriveUserDisconnected` intent (connection.ts step 1.5): while a user is
  // disconnected it returns `disconnected` BEFORE any token lookup, so a
  // Refresh can never silently reconnect, never show email/avatar/connected
  // footer for a disconnected user, and never clear the intent (it only reads).
  const popupProbeRef = useRef<ReturnType<typeof createConnectionProbe> | null>(null);
  const [popupDriveStatus, setPopupDriveStatus] = useState<'connected' | 'not-connected' | 'checking'>('checking');
  const runPopupProbe = useCallback(async (): Promise<void> => {
    // TURN-17: mark the check as genuinely in progress so the footer's
    // activity cue (Google logo pulse during 'checking') reflects a REAL
    // operation — mount probe and Refresh-button re-probe alike. Never a
    // fake "sync" (GD-07/GD-06 rules stand).
    setPopupDriveStatus('checking');
    if (!popupProbeRef.current) popupProbeRef.current = createConnectionProbe();
    const state: DriveConnectionState = await popupProbeRef.current.probe();
    setPopupDriveStatus(state.status === 'connected' ? 'connected' : 'not-connected');
  }, []);
  useEffect(() => {
    runPopupProbe().catch(() => {
      // The probe is typed never to throw; guard anyway.
      setPopupDriveStatus('not-connected');
    });
  }, [runPopupProbe]);
  // SNIPPET-KBD-01: true while the snippet list (not the search field) is the
  // active keyboard-interaction target.
  const [listNavActive, setListNavActive] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // MOTION-01: single copy-feedback toast — shown only after the REAL clipboard
  // result (copySnippet resolves), entrance/exit animated, fixed position so the
  // popup layout never shifts. key forces the entrance animation to replay on
  // rapid repeated copies instead of overlapping.
  const [copyToast, setCopyToast] = useState<{
    message: string;
    type: 'success' | 'error';
    key: number;
    leaving: boolean;
  } | null>(null);
  const copyToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyToastExitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // BULK-DEL-01: Bulk Selection Mode. bulkSelectedIds holds EXPLICITLY selected
  // snippet ids only, so Select All scopes to the active (filtered) list and
  // deletion can never touch snippets hidden by a filter or never selected.
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [previewSnippetId, setPreviewSnippetId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    mode: 'new' | 'edit';
    snippetId: string | null;
  }>({
    isOpen: false,
    mode: 'new',
    snippetId: null,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>({
    favoriteConfirmationEnabled: false,
    searchFields: {
      title: true,
      content: true,
      category: true,
    },
    autoSyncEnabled: true,
  });

  const listRef = useRef<HTMLDivElement>(null);
  const hasInitializedFilter = useRef(false);
  // POPUP-REFRESH-01: load sequence counter (see loadData) + refresh state.
  const loadEpochRef = useRef(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounce search query by 150ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load initial categories and data
  const loadData = useCallback(async () => {
    // POPUP-REFRESH-01: monotonic epoch — if a newer load starts before an
    // older one finishes (e.g. Refresh racing a modal-close reload), the older
    // response must not overwrite the newer state with pre-change data.
    const epoch = ++loadEpochRef.current;
    try {
      const [cats, all, prefs] = await Promise.all([
        getCategories(),
        getAllSnippets(),
        getPreferences(),
      ]);
      if (epoch !== loadEpochRef.current) return; // superseded by a newer load
      setCategories(cats);
      const catMap = new Map<string, string>();
      cats.forEach((c) => catMap.set(c.id, c.name));
      setCategoriesMap(catMap);

      setSnippets(all);
      setPreferences(prefs);
      if (!hasInitializedFilter.current) {
        hasInitializedFilter.current = true;
        if (prefs.defaultFilter) {
          setActiveFilter(prefs.defaultFilter);
        }
      }
    } finally {
      if (epoch === loadEpochRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply filters and search
  useEffect(() => {
    let result = [...snippets];

    // Filter by category if selected from dropdown
    if (selectedCategoryId) {
      result = result.filter((s) => s.categoryId === selectedCategoryId);
    } else {
      // Filter by tab
      if (activeFilter === 'favorites') {
        result = result.filter((s) => s.isFavorite);
      } else if (activeFilter === 'recent') {
        result = [...result].sort((a, b) => {
          const aTime = a.lastUsedAt ?? a.createdAt;
          const bTime = b.lastUsedAt ?? b.createdAt;
          return bTime - aTime;
        });
      }
    }

    // Apply search query if present with canonical priority ranking: Title > Content > Category
    if (debouncedQuery.trim().length > 0) {
      result = filterAndRankSnippets(
        result,
        debouncedQuery,
        categoriesMap,
        preferences.searchFields
      );
    }

    setFilteredSnippets(result);

    // Keep first item selected by default if none selected or current is filtered out
    if (result.length > 0) {
      setSelectedSnippetId((current) => {
        if (current && result.some((s) => s.id === current)) {
          return current;
        }
        return result[0].id;
      });
    } else {
      setSelectedSnippetId(null);
    }
  }, [snippets, activeFilter, selectedCategoryId, debouncedQuery, categoriesMap, preferences]);

  const handleCopy = async (snippet: Snippet) => {
    const ok = await copySnippet(snippet);
    if (ok) {
      setCopiedSnippetId(snippet.id);
      setTimeout(() => {
        setCopiedSnippetId((curr) => (curr === snippet.id ? null : curr));
      }, 1500);
      const updated = await getAllSnippets();
      setSnippets(updated);
    }
    showCopyToast(ok ? 'Copied successfully' : 'Failed to copy snippet', ok ? 'success' : 'error');
  };

  // MOTION-01: copy-feedback toast lifecycle — success/error reflects the actual
  // clipboard outcome; visible ~1.8s (readable), then a 160ms fade-out before
  // unmount. Repeated copies restart the timer and replay the entrance.
  const showCopyToast = (message: string, type: 'success' | 'error') => {
    if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
    if (copyToastExitTimerRef.current) clearTimeout(copyToastExitTimerRef.current);
    setCopyToast({ message, type, key: Date.now(), leaving: false });
    copyToastTimerRef.current = setTimeout(() => {
      setCopyToast((curr) => (curr ? { ...curr, leaving: true } : curr));
      copyToastExitTimerRef.current = setTimeout(() => setCopyToast(null), 170);
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      if (copyToastExitTimerRef.current) clearTimeout(copyToastExitTimerRef.current);
    };
  }, []);

  // POPUP-REFRESH-01: the header-of-search Refresh button. Composes the two
  // EXISTING refresh paths — loadData() (snippets/categories/preferences
  // re-read from IndexedDB) and the silent Drive probe — through the tested
  // createPopupRefresh orchestrator (single-flight, always-recovering state).
  // Drive safety: Refresh NEVER touches the persisted `gdriveUserDisconnected`
  // intent (only the probe reads it), NEVER triggers an interactive OAuth
  // flow (probe is non-interactive by construction — pinned by the connection
  // suite), and NEVER creates/deletes/restores/uploads snapshots.
  const popupRefreshRef = useRef<ReturnType<typeof createPopupRefresh> | null>(null);
  const getPopupRefresh = () => {
    if (!popupRefreshRef.current) {
      popupRefreshRef.current = createPopupRefresh({
        loadData,
        probe: runPopupProbe,
        onBegin: () => setIsRefreshing(true),
        onEnd: () => setIsRefreshing(false),
        onError: () => showCopyToast('Refresh failed — showing the last loaded data', 'error'),
      });
    }
    return popupRefreshRef.current;
  };
  const handleRefreshClick = () => {
    void getPopupRefresh().refresh();
  };

  // Keyboard interaction for the snippet list (SNIPPET-KBD-01, revised SNIPPET-KBD-02).
  //
  // Contexts:
  //  - The focus-search binding (default Ctrl+Shift+S) is matched before the
  //    typing guard, so it works anywhere in the popup UI and focuses/selects
  //    the search input for immediate typing.
  //  - SEARCH: the search input is focused. Normal typing is never intercepted
  //    (Shift still produces uppercase/symbols, Space still types a space,
  //    Backspace still deletes a single character). ArrowDown / Enter hands
  //    interaction to the list by blurring the input.
  //  - LIST (listNavActive): ArrowUp/ArrowDown are the fixed navigation
  //    bindings (not rebindable), the copy binding (default Enter) copies the
  //    active snippet directly, and the clear-search binding (default
  //    Backspace) clears the query. Escape returns interaction to search.
  //
  // The removed SNIPPET-KBD-01 handlers are gone: Shift / Ctrl+Shift are never
  // hijacked for navigation, Space behaves normally (typing/scroll), and Enter
  // copies instead of opening Quick View — Quick View remains in the snippet
  // card's three-dot menu. Escape modal handling (preview/editor/settings,
  // category menu, editor more-menu) is untouched.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an open modal
      if (previewSnippetId || editorState.isOpen || isSettingsOpen) {
        return;
      }

      const bindings = preferences?.uiShortcuts ?? DEFAULT_UI_SHORTCUTS;

      // SNIPPET-KBD-02: focus-search works everywhere in the popup UI.
      if (!e.repeat && matchShortcut(e, parseShortcut(bindings.focusSearch))) {
        e.preventDefault();
        setListNavActive(false);
        const input = document.querySelector<HTMLInputElement>('input[data-search-input]');
        if (input) {
          input.focus();
          input.select();
        }
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const typing = isEditableTarget(active);
      const inSearchInput = active?.hasAttribute('data-search-input') === true;

      if (typing) {
        // Hand interaction from the search field to the snippet list. The input is
        // also blurred so the list handlers (not the typing guard) receive the
        // following keys.
        if (
          inSearchInput &&
          !e.repeat &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          (e.key === 'ArrowDown' || e.key === 'Enter')
        ) {
          e.preventDefault();
          active?.blur();
          setListNavActive(true);
        }
        // Never intercept anything else while typing (search, forms, composition).
        return;
      }

      if (e.key === 'Escape' && listNavActive) {
        e.preventDefault();
        setListNavActive(false);
        document.querySelector<HTMLInputElement>('input[data-search-input]')?.focus();
        return;
      }

      const moveSelection = (delta: number) => {
        if (filteredSnippets.length === 0) return false;
        const currentIndex = filteredSnippets.findIndex((s) => s.id === selectedSnippetId);
        const nextIndex =
          (currentIndex + delta + filteredSnippets.length) % filteredSnippets.length;
        setSelectedSnippetId(filteredSnippets[nextIndex].id);
        return true;
      };

      // SNIPPET-KBD-02: arrow keys are THE navigation mechanism (fixed, safe at
      // first/last item via the modulo wrap; respects filteredSnippets only).
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setListNavActive(true);
        moveSelection(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }

      if (!e.repeat && matchShortcut(e, parseShortcut(bindings.copy))) {
        // Copy the active snippet directly — no preview, no navigation.
        e.preventDefault();
        const activeSnippet = filteredSnippets.find((s) => s.id === selectedSnippetId);
        if (activeSnippet) {
          handleCopy(activeSnippet);
        }
        return;
      }

      if (!e.repeat && matchShortcut(e, parseShortcut(bindings.clearSearch))) {
        // Clear the query only from the list context; inside the input Backspace
        // keeps its normal single-character editing behavior (typing guard).
        if (searchQuery) {
          e.preventDefault();
          setSearchQuery('');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredSnippets, selectedSnippetId, previewSnippetId, editorState, isSettingsOpen, listNavActive, preferences, searchQuery, handleCopy]);

  // SNIPPET-KBD-01: keep the active card visible when the selection moves.
  useEffect(() => {
    if (!selectedSnippetId) return;
    document
      .querySelector<HTMLElement>(`[data-snippet-id="${selectedSnippetId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedSnippetId]);

  // SNIPPET-KBD-01: any open modal suspends list keyboard interaction.
  useEffect(() => {
    if (previewSnippetId || editorState.isOpen || isSettingsOpen) {
      setListNavActive(false);
    }
  }, [previewSnippetId, editorState.isOpen, isSettingsOpen]);

  // Handlers
  const handleToggleFavorite = async (snippetId: string, current: boolean) => {
    if (preferences.favoriteConfirmationEnabled) {
      const action = current ? 'remove this snippet from favorites' : 'add this snippet to favorites';
      if (!confirm(`Are you sure you want to ${action}?`)) {
        return;
      }
    }
    await toggleFavorite(snippetId, !current);
    const updated = await getAllSnippets();
    setSnippets(updated);
  };

  const handleDelete = async (snippetId: string) => {
    await deleteSnippet(snippetId);
    const updated = await getAllSnippets();
    setSnippets(updated);
  };

  // BULK-DEL-01: selection-mode helpers. The single authoritative selection is
  // the bulkSelectedIds set; "all selected" is derived from the ACTIVE list.
  const enterSelectionMode = () => {
    setBulkSelectedIds(new Set());
    setIsSelectionMode(true);
  };
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setBulkSelectedIds(new Set());
  };
  const toggleBulkSelect = (snippetId: string) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(snippetId)) {
        next.delete(snippetId);
      } else {
        next.add(snippetId);
      }
      return next;
    });
  };
  const allShownSelected =
    filteredSnippets.length > 0 && filteredSnippets.every((s) => bulkSelectedIds.has(s.id));
  const toggleSelectAll = () => {
    setBulkSelectedIds(
      allShownSelected ? new Set<string>() : new Set(filteredSnippets.map((s) => s.id))
    );
  };
  // Reuses the EXISTING deletion pathway (db.deleteSnippet soft-deletes to Trash
  // with its 3-day recovery window) — one refresh after the loop instead of one
  // per item. No permanent deletion, no bypassed safeguards; identical to what
  // the per-card menu "Move to trash" action does, just batched.
  const handleBulkDelete = async () => {
    if (bulkSelectedIds.size === 0) return;
    for (const id of bulkSelectedIds) {
      await deleteSnippet(id);
    }
    const updated = await getAllSnippets();
    setSnippets(updated);
    setBulkSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleSaveSnippet = async (data: {
    title: string;
    content: string;
    categoryId: string;
    isFavorite: boolean;
    isDuplicate?: boolean;
  }) => {
    if (!data.isDuplicate && editorState.mode === 'edit' && editorState.snippetId) {
      await updateSnippet(editorState.snippetId, {
        title: data.title,
        content: data.content,
        categoryId: data.categoryId,
        isFavorite: data.isFavorite,
      });
    } else {
      await createSnippet({
        title: data.title,
        content: data.content,
        categoryId: data.categoryId,
        isFavorite: data.isFavorite,
      });
    }
    setEditorState({ isOpen: false, mode: 'new', snippetId: null });
    const updated = await getAllSnippets();
    setSnippets(updated);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleTogglePin = async () => {
    if (onTogglePin) {
      onTogglePin();
      return;
    }

    const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;
    if (chromeApi?.runtime?.sendMessage) {
      if (internalPinned) {
        chromeApi.runtime.sendMessage({ type: 'UNPIN_FLOATING_WINDOW' }, () => {
          if (typeof window !== 'undefined' && window.close) window.close();
        });
      } else {
        chromeApi.runtime.sendMessage({ type: 'OPEN_FLOATING_WINDOW' }, (res: any) => {
          if (res?.ok && typeof window !== 'undefined' && window.close) {
            window.close();
          }
        });
      }
      return;
    }

    setInternalPinned((prev) => !prev);
  };

  const previewSnippet = snippets.find((s) => s.id === previewSnippetId) || null;

  return (
    <div
      className="glass-clay-surface relative w-[430px] h-[550px] p-5 flex flex-col font-sans transition-all duration-200"
    >
      {/* SETTINGS-ISO-01 + SNIPPET-FORM-01 + SNIPPET-PREVIEW-01: the main popup content
          is display:none while Settings, the New/Edit Snippet page, OR the Snippet
          Details preview is open, so nothing ghosts through any of them — the visible
          hierarchy is exactly: app glass-app-bg background → the one glass-clay-surface
          → the active page/dialog. display:contents when visible keeps this wrapper
          box-free, so the flex layout of the surface is byte-identical to the
          pre-isolation structure; the content stays mounted, preserving search text,
          selection and scroll. */}
      <div className={isSettingsOpen || editorState.isOpen || Boolean(previewSnippetId) ? 'hidden' : 'contents'}>
        {/* 1. Header: Brand + Pin + 1. Plus, 2. Settings, 3. Close */}
        <Header
          onNewSnippet={() => setEditorState({ isOpen: true, mode: 'new', snippetId: null })}
          onOpenSettings={handleOpenSettings}
          onClose={onClose}
          isPinned={internalPinned}
          onTogglePin={handleTogglePin}
        />

      {/* 2. Search Field and Filter Row with Golden Star for Favorites */}
      <SearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        focusSearchLabel={(preferences?.uiShortcuts ?? DEFAULT_UI_SHORTCUTS)
          .focusSearch.split('+')
          .map((part) => part.trim())
          .join(' + ')}
        onEnterSelectionMode={enterSelectionMode}
        onRefreshClick={handleRefreshClick}
        isRefreshing={isRefreshing}
      />

      {/* BULK-DEL-01: selection-mode toolbar — Select All / Unselect All (toggle
          derived from the ACTIVE list), Delete for exactly the selected ids
          (disabled when none), Cancel to exit without deleting. Rendered above
          the list, outside its scroll region, so it never scrolls away. */}
      {isSelectionMode && (
        <div className="flex items-center gap-2 pb-2 shrink-0" role="toolbar" aria-label="Bulk selection">
          <button
            type="button"
            onClick={toggleSelectAll}
            className={`nm-press h-8 px-3.5 text-[13px] font-medium rounded-xl cursor-pointer select-none ${
              allShownSelected && filteredSnippets.length > 0
                ? 'nm-primary-inset text-white'
                : 'nm-raised text-slate-700 hover:text-slate-900'
            }`}
          >
            {allShownSelected && filteredSnippets.length > 0 ? 'Unselect All' : 'Select All'}
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkSelectedIds.size === 0}
            aria-disabled={bulkSelectedIds.size === 0}
            className={`nm-press h-8 px-3.5 text-[13px] font-medium rounded-xl ${
              bulkSelectedIds.size === 0
                ? 'text-slate-400 cursor-not-allowed'
                : 'nm-raised text-rose-600 hover:text-rose-700 cursor-pointer select-none'
            }`}
          >
            Delete ({bulkSelectedIds.size})
          </button>
          <button
            type="button"
            onClick={exitSelectionMode}
            className="nm-press ml-auto h-8 px-3.5 text-[13px] font-medium rounded-xl cursor-pointer select-none nm-raised text-slate-700 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 3. Snippet Cards List — the ONLY scrollable region: flex-1 + min-h-0 keeps the
          list confined to the space left by header/search/footer, so the footer stays
          pinned at the bottom edge of the fixed 480 x 600 viewport (UI-WINDOW-LOCK-01/02/03). */}
      {/* POPUP-REFRESH-01: while a refresh runs, the content region gets a very
          subtle opacity fade (opacity-only — no layout shift, no flicker, list
          stays visible, scroll position and search/filter state untouched) and
          exposes aria-busy for assistive tech. The transition (and any spin)
          is neutralized by the global prefers-reduced-motion rule. */}
      <div
        ref={listRef}
        className={`nm-scrollbar flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5 transition-opacity duration-200 ease-out ${
          isRefreshing ? 'opacity-60' : 'opacity-100'
        }`}
        role="region"
        aria-label="Snippets list"
        aria-busy={isRefreshing}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading snippets...</span>
            </div>
          </div>
        ) : filteredSnippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <p className="text-sm font-medium text-slate-500">
              {searchQuery.trim().length > 0
                ? 'No snippets match your search.'
                : activeFilter === 'favorites'
                ? 'No favorites yet.'
                : 'No snippets found.'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click the + icon in the header to create one.
            </p>
          </div>
        ) : (
          filteredSnippets.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              category={categories.find((c) => c.id === snippet.categoryId)}
              isSelected={snippet.id === selectedSnippetId}
              onSelect={() => setSelectedSnippetId(snippet.id)}
              onOpen={() => setPreviewSnippetId(snippet.id)}
              onEdit={() =>
                setEditorState({ isOpen: true, mode: 'edit', snippetId: snippet.id })
              }
              onToggleFavorite={() =>
                handleToggleFavorite(snippet.id, snippet.isFavorite)
              }
              onCopy={() => handleCopy(snippet)}
              onDelete={() => handleDelete(snippet.id)}
              isCopied={copiedSnippetId === snippet.id}
              selectionMode={isSelectionMode}
              isBulkSelected={bulkSelectedIds.has(snippet.id)}
              onToggleBulkSelect={() => toggleBulkSelect(snippet.id)}
            />
          ))
        )}
      </div>

      {/* NOTE: The obsolete bottom "+ New Snippet" button has been completely REMOVED.
          The header plus icon is now the primary entry point. */}

      {/* MOTION-01: copy feedback toast — fixed overlay (zero layout impact),
          bottom-center in a stable area above the footer; one message at a time.
          role="status" + aria-live announce the result without relying on motion. */}
      {copyToast && (
        <div className="fixed inset-x-0 bottom-12 z-[70] flex justify-center pointer-events-none">
          <div
            key={copyToast.key}
            role="status"
            aria-live="polite"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border shadow-lg text-xs font-medium select-none ${
              copyToast.type === 'success'
                ? 'border-emerald-200/80 text-slate-700'
                : 'border-rose-200/80 text-slate-700'
            } ${
              copyToast.leaving
                ? 'nm-toast-out'
                : 'animate-in fade-in slide-in-from-top-2 duration-200 ease-out'
            }`}
          >
            {copyToast.type === 'success' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" aria-hidden="true" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
            )}
            <span>{copyToast.message}</span>
          </div>
        </div>
      )}

      {/* 4. Footer: developer attribution + PR-1 REAL Drive connection status.
          GD-07 removed the fabricated "Synced / Last synced" claims — no
          synchronization exists (GD-06 blocked) and none is claimed here. The
          status line is driven ONLY by the silent startup probe in
          src/gdrive/connection.ts: "connected" requires a working silent token
          AND a successful Drive about.get; anything else shows "not connected". */}
      <Footer developerName="AKASH" driveStatus={popupDriveStatus} />
      </div>

      {/* Modals */}
      <SnippetPreviewModal
        snippet={previewSnippet}
        category={categories.find((c) => c.id === previewSnippet?.categoryId)}
        isOpen={Boolean(previewSnippetId)}
        onClose={() => setPreviewSnippetId(null)}
        onEdit={(id) => {
          setPreviewSnippetId(null);
          setEditorState({ isOpen: true, mode: 'edit', snippetId: id });
        }}
        onCopy={handleCopy}
        onToggleFavorite={handleToggleFavorite}
        /* SNIPPET-DUP-01: persist the duplicate via the existing db.duplicateSnippet
           workflow, refresh the list, then open the editor for the NEW duplicate only
           after persistence succeeds (resolves false without navigating on failure). */
        onDuplicate={async (snippetId) => {
          try {
            const duplicate = await duplicateSnippet(snippetId);
            await loadData();
            setPreviewSnippetId(null);
            setEditorState({ isOpen: true, mode: 'edit', snippetId: duplicate.id });
            return true;
          } catch {
            return false;
          }
        }}
      />

      <SnippetEditorModal
        isOpen={editorState.isOpen}
        mode={editorState.mode}
        snippetId={editorState.snippetId}
        snippets={snippets}
        categories={categories}
        onClose={() => setEditorState({ isOpen: false, mode: 'new', snippetId: null })}
        onSave={handleSaveSnippet}
        onDelete={handleDelete}
        onCreateCategory={async (name, color) => {
          const cat = await createCategory(name, color);
          const cats = await getCategories();
          setCategories(cats);
          return cat;
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        preferences={preferences}
        onClose={() => {
          setIsSettingsOpen(false);
          loadData();
        }}
        onDataChange={loadData}
        onUpdatePreferences={async (patch) => {
          const updated = await savePreferences(patch);
          setPreferences(updated);
        }}
      />
    </div>
  );
};
