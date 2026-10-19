import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Star, ChevronDown, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { Category, FilterType } from '../types';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  /** SNIPPET-KBD-02 / SEARCH-CLEAR-01: the active focus-search binding, shown in the
   *  input's placeholder so the displayed hint always matches the real binding. */
  focusSearchLabel?: string;
  /** BULK-DEL-01: entering Bulk Selection Mode from the delete icon at the
   *  far right of this tab row. */
  onEnterSelectionMode?: () => void;
  /** POPUP-REFRESH-01: refresh popup data + connection state (search-row button). */
  onRefreshClick?: () => void;
  /** True while the refresh orchestrator is running — spinner + single-flight. */
  isRefreshing?: boolean;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  categories,
  selectedCategoryId,
  onSelectCategory,
  focusSearchLabel = 'Ctrl + Shift + S',
  onEnterSelectionMode,
  onRefreshClick,
  isRefreshing = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  // SNIPPET-KBD-01: when the extension surface opens (docked popup or floating
  // window = fresh mount), place the cursor in the search field so typing can
  // start immediately. Re-renders while already open do not steal focus.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Calculate and update dropdown overlay position relative to trigger button
  const updatePosition = useCallback(() => {
    if (!triggerBtnRef.current) return;
    const rect = triggerBtnRef.current.getBoundingClientRect();
    const dropdownWidth = 176; // matches w-44 (11rem)

    // Open directly beneath the trigger, aligned with its left edge
    let left = rect.left;

    // If aligning left would overflow beyond the right edge of viewport
    if (left + dropdownWidth > window.innerWidth - 10) {
      // Right-align with trigger button's right edge
      const rightAlignedLeft = rect.right - dropdownWidth;
      if (rightAlignedLeft >= 10) {
        left = rightAlignedLeft;
      } else {
        left = Math.max(10, window.innerWidth - dropdownWidth - 10);
      }
    }

    // Ensure it doesn't overflow the left edge
    if (left < 10) {
      left = 10;
    }

    // Calculate maximum available height below the button
    const availableHeightBelow = Math.max(120, window.innerHeight - rect.bottom - 16);
    const maxHeight = Math.min(260, availableHeightBelow);

    setDropdownPos({
      top: Math.round(rect.bottom + 6),
      left: Math.round(left),
      maxHeight: Math.round(maxHeight),
    });
  }, []);

  const handleToggleCategoryMenu = () => {
    if (!isCategoryMenuOpen) {
      updatePosition();
      setIsCategoryMenuOpen(true);
    } else {
      setIsCategoryMenuOpen(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!isCategoryMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(target) &&
        triggerBtnRef.current &&
        !triggerBtnRef.current.contains(target)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryMenuOpen]);

  // Keep dropdown anchored to trigger on scroll or resize
  useEffect(() => {
    if (!isCategoryMenuOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isCategoryMenuOpen, updatePosition]);

  // SNIPPET-KBD-02: Escape closes the category dropdown. Focus-search
  // (Ctrl+Shift+S by default) and clear-search (Backspace from the list
  // context) are handled by MainPopup's single keyboard handler from the
  // preferences bindings — the old hardcoded Ctrl+K and Escape-clears-search
  // listeners were removed so no duplicate handlers remain.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCategoryMenuOpen) {
        e.preventDefault();
        setIsCategoryMenuOpen(false);
        triggerBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCategoryMenuOpen]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="space-y-3 pb-3">
      {/* Feature 1: Static Inset Neumorphic Search Field + POPUP-REFRESH-01 Refresh
          button. The row is flex; the field keeps flex-1 (≈87% of its former full
          width inside the 430px popup) and the compact square button sits on the
          same horizontal row, immediately to the right, vertically aligned. */}
      <div className="flex items-center gap-2">
        <div className="relative group flex-1 min-w-0">
          <div className="relative flex items-center h-11 w-full nm-static-inset-field transition-all duration-150 overflow-hidden">
            {/* Search Icon inside the recessed well */}
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 z-10 transition-colors group-focus-within:text-[#9f0409]">
              <Search className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </div>

            {/* Search input field — SEARCH-CLEAR-01: the focus-search hint lives
                in the placeholder (subtle, disappears while typing) instead of the
                former solid kbd badge; pr-10 keeps typed text clear of the × */}
            <input
              ref={inputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search snippets   ·   ${focusSearchLabel}`}
              aria-label="Search snippets"
              /* SNIPPET-KBD-01: hook used by the keyboard handler to hand focus
                 from search results to the snippet list (ArrowDown / Enter) */
              data-search-input="true"
              className="w-full h-full pl-10 pr-10 bg-transparent text-[14px] font-medium text-slate-800 placeholder-slate-400/55 outline-none z-10"
            />

            {/* SEARCH-CLEAR-01: inline clear (×) — visible only while the query is
                non-empty. mousedown is prevented so the input keeps focus; click
                clears the whole query through the existing onSearchChange path and
                re-focuses the field for immediate retyping. */}
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSearchChange('');
                  inputRef.current?.focus();
                }}
                className="nm-press absolute right-3 flex items-center justify-center w-6 h-6 rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/70 cursor-pointer z-20 transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* POPUP-REFRESH-01: single Refresh button for the whole popup — data
            (snippets/categories/preferences via loadData) + silent Drive
            connection probe. It NEVER touches the persisted disconnect intent,
            never prompts for OAuth, and never mutates Drive snapshots. Spins
            while the refresh runs; single-flight via the orchestrator; the
            global prefers-reduced-motion rule (index.css) already disables the
            spin for reduced-motion users. */}
        {onRefreshClick && (
          <button
            type="button"
            aria-label="Refresh popup"
            title="Refresh popup"
            onClick={onRefreshClick}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            className={`nm-press shrink-0 flex items-center justify-center w-11 h-11 rounded-xl nm-icon-btn text-slate-600 hover:text-[#9f0409] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#9f0409]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-white/60 disabled:cursor-wait disabled:opacity-70 ${
              isRefreshing ? 'cursor-wait' : ''
            }`}
          >
            <RefreshCw
              /* While refreshing: smooth rotation, icon tinted the brand accent
                 (#9f0409). Under prefers-reduced-motion the global rule freezes
                 the animation — the static red icon + disabled button + faded,
                 aria-busy content region remain as the non-animated indicator. */
              className={`w-[18px] h-[18px] ${
                isRefreshing ? 'animate-spin motion-reduce:animate-none text-[#9f0409]' : ''
              }`}
              strokeWidth={2.2}
            />
          </button>
        )}
      </div>

      {/* Filter Row matching reference image. THIN-SCROLL-01 (turn 17): the
          horizontal scroll container for All / Favorites / All Categories /
          category tabs uses the shared `.nm-scrollbar`. (The pre-turn-17
          markup carried a `no-scrollbar` class that was never defined in CSS —
          a no-op — so the row actually showed the browser's classic
          scrollbar.) Shared definition, no duplicate CSS; tab
          selection/hover/active behavior untouched. */}
      <div
        className="nm-scrollbar flex items-center gap-2 overflow-x-auto py-0.5"
        role="tablist"
        aria-label="Library filters"
      >
        {/* 1. All Filter */}
        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'all' && !selectedCategoryId}
          onClick={() => {
            onSelectCategory(null);
            onFilterChange('all');
          }}
          className={`nm-press flex items-center justify-center h-8 px-4 text-[13px] font-medium rounded-xl cursor-pointer select-none ${
            activeFilter === 'all' && !selectedCategoryId
              ? 'nm-primary-inset'
              : 'nm-raised text-slate-700 hover:text-slate-900'
          }`}
        >
          All
        </button>

        {/* 2. Favorites Filter — with VISIBLY GOLD / YELLOW STAR! */}
        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'favorites'}
          onClick={() => {
            onSelectCategory(null);
            onFilterChange('favorites');
          }}
          className={`nm-press flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-medium rounded-xl cursor-pointer select-none ${
            activeFilter === 'favorites'
              ? 'nm-primary-inset'
              : 'nm-raised text-slate-700 hover:text-slate-900'
          }`}
        >
          {/* Star icon is visibly gold/yellow matching reference image */}
          <Star
            className={`w-[14px] h-[14px] fill-amber-400 text-amber-500 drop-shadow-2xs ${
              activeFilter === 'favorites' ? 'fill-amber-300 text-amber-200' : ''
            }`}
            strokeWidth={2}
          />
          <span>Favorites</span>
        </button>

        {/* 3. All Categories Filter trigger */}
        <button
          ref={triggerBtnRef}
          type="button"
          role="tab"
          aria-haspopup="true"
          aria-expanded={isCategoryMenuOpen}
          onClick={handleToggleCategoryMenu}
          className={`nm-press shrink-0 flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-medium rounded-xl cursor-pointer select-none ${
            selectedCategoryId
              ? 'nm-primary-inset'
              : isCategoryMenuOpen
              ? 'nm-inset text-slate-800'
              : 'nm-raised text-slate-700 hover:text-slate-900'
          }`}
        >
          <span>{selectedCategory ? selectedCategory.name : 'All Categories'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isCategoryMenuOpen ? 'rotate-180' : ''
            } ${selectedCategoryId ? 'text-white' : 'text-slate-500'}`}
            strokeWidth={2.2}
          />
        </button>

        {/* BULK-DEL-01: delete icon at the FAR RIGHT of the All / Favorites /
            All-Categories row — icon only, no text label. Clicking it enters
            Bulk Selection Mode; it never deletes anything by itself. */}
        {onEnterSelectionMode && (
          <button
            type="button"
            aria-label="Select snippets to delete"
            title="Select snippets to delete"
            onClick={onEnterSelectionMode}
            className="nm-press ml-auto shrink-0 flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer nm-icon-btn text-slate-600 hover:text-rose-600"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Category Dropdown Floating Overlay Rendered via Portal */}
      {isCategoryMenuOpen &&
        dropdownPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownMenuRef}
            style={{
              position: 'fixed',
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: '176px',
              maxHeight: `${dropdownPos.maxHeight}px`,
            }}
            className="fixed z-[90] nm-dropdown-panel nm-scrollbar rounded-2xl p-1.5 py-2 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 select-none"
            role="menu"
            aria-label="Filter by category"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onSelectCategory(null);
                setIsCategoryMenuOpen(false);
              }}
              className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-xl cursor-pointer ${
                selectedCategoryId === null
                  ? 'nm-menu-item-selected text-[#9f0409] font-semibold'
                  : 'nm-menu-item-unselected text-slate-700 hover:text-slate-900 font-medium'
              }`}
            >
              <span>All Categories</span>
              {selectedCategoryId === null && (
                <Check className="w-3.5 h-3.5 text-[#9f0409] shrink-0 ml-1.5" />
              )}
            </button>
            {categories.length > 0 && <div className="my-1 border-t border-slate-200/60" />}
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  // CATEGORY-SEL-01: selection must be mutually exclusive — picking
                  // a category also resets the tab filter to 'all', otherwise a
                  // stale activeFilter of 'favorites' kept the Favorites tab
                  // visually selected alongside the category (filtering itself was
                  // unaffected because selectedCategoryId wins in MainPopup).
                  onSelectCategory(cat.id);
                  onFilterChange('all');
                  setIsCategoryMenuOpen(false);
                }}
                className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded-xl cursor-pointer ${
                  selectedCategoryId === cat.id
                    ? 'nm-menu-item-selected text-[#9f0409] font-semibold'
                    : 'nm-menu-item-unselected text-slate-700 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || '#3b82f6' }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
                {selectedCategoryId === cat.id && (
                  <Check className="w-3.5 h-3.5 text-[#9f0409] shrink-0 ml-1.5" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};
