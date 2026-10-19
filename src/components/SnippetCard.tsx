import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, Copy, Check, MoreVertical, Pencil, Eye, Trash2 } from 'lucide-react';
import { Snippet, Category } from '../types';
import { stripHtml } from '../db';

interface SnippetCardProps {
  snippet: Snippet;
  category?: Category;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
  onDelete: () => void;
  isCopied: boolean;
  /** BULK-DEL-01: Bulk Selection Mode — shows the left selection checkbox and
   *  re-points card-body clicks at selection toggling instead of copy. */
  selectionMode?: boolean;
  isBulkSelected?: boolean;
  onToggleBulkSelect?: () => void;
}

export const SnippetCard: React.FC<SnippetCardProps> = ({
  snippet,
  category,
  isSelected,
  onSelect,
  onOpen,
  onEdit,
  onToggleFavorite,
  onCopy,
  onDelete,
  isCopied,
  selectionMode = false,
  isBulkSelected = false,
  onToggleBulkSelect,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // SNIPPET-DROPDOWN-02: the menu renders through a portal on document.body with
  // fixed positioning computed from the trigger button. The old absolute menu lived
  // inside the snippet list's overflow-y-auto container, so it was always clipped by
  // that container — flipping it upward (UI-BUGFIX-MENU) merely moved the clip point
  // to the list's top edge, under the category tabs. A portal escapes every ancestor
  // overflow, and z-40 at body level paints it above the popup surface's stacking
  // context, i.e. above the tabs, neighboring cards and everything else in the popup.
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside the trigger button or the portaled menu panel.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep the fixed menu anchored to the trigger while the snippet list scrolls or
  // the window resizes (capture-phase scroll listener also catches the list's own
  // non-bubbling scroll events).
  useEffect(() => {
    if (!isMenuOpen) return;
    const reposition = () => {
      const pos = computeMenuPos();
      if (pos) setMenuPos(pos);
    };
    document.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMenuOpen]);

  const previewText = stripHtml(snippet.content);

  // Positioning rule (same pattern as the editor's More-formatting menu,
  // SNIPPET-FORM-01): open downward below the button when the measured window has
  // room for the full menu (5 items + divider ≈ 170px), otherwise anchor it above
  // the button. Viewport coordinates only — no scroll-container math is needed
  // because the portal is immune to ancestor clipping.
  const MENU_EST_HEIGHT = 170;
  const computeMenuPos = (): { top?: number; bottom?: number; right: number } | null => {
    const wrapper = triggerRef.current;
    if (!wrapper) return null;
    const rect = wrapper.getBoundingClientRect();
    const right = Math.max(12, window.innerWidth - rect.right);
    if (rect.bottom + 6 + MENU_EST_HEIGHT <= window.innerHeight) {
      return { top: rect.bottom + 6, right };
    }
    return { bottom: window.innerHeight - rect.top + 6, right };
  };

  const handleToggleMenu = () => {
    if (!isMenuOpen) {
      setMenuPos(computeMenuPos());
      setIsMenuOpen(true);
    } else {
      setIsMenuOpen(false);
    }
  };

  // Category badge color styles
  const getCategoryBadgeStyles = () => {
    if (!category) {
      return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
    const name = category.name.toLowerCase();
    if (name.includes('default')) {
      return { bg: 'bg-[#e0e7ff]', text: 'text-[#4f46e5]' };
    }
    if (name.includes('shipping')) {
      return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
    if (name.includes('billing')) {
      return { bg: 'bg-[#ffedd5]', text: 'text-[#d97706]' };
    }
    if (name.includes('account')) {
      return { bg: 'bg-[#ccfbf1]', text: 'text-[#0d9488]' };
    }
    return { bg: 'bg-blue-50', text: 'text-blue-700' };
  };

  const badgeStyle = getCategoryBadgeStyles();

  return (
    <div
      data-snippet-id={snippet.id}
      onClick={onSelect}
      className={`nm-press-sm group relative flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer select-none transition-all duration-150 ${
        isSelected
          ? 'nm-static-inset-card-selected'
          : 'nm-static-inset-card'
      } ${isMenuOpen ? 'z-20' : ''}`}
    >
      {/* Static Golden Favorite Indicator: rendered in the top-right corner above actions only for favorited snippets */}
      {snippet.isFavorite && (
        <div
          data-favorite-indicator="true"
          className="absolute top-2.5 right-3 flex items-center justify-center text-amber-400 pointer-events-none select-none"
          title="Favorite"
          aria-label="Favorite"
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 drop-shadow-2xs" />
        </div>
      )}

      {/* BULK-DEL-01: individual selection control on the LEFT side, visible only
          in Bulk Selection Mode. stopPropagation keeps the toggle from also hitting
          the card's onSelect; the card itself is untouched outside selection mode. */}
      {selectionMode && (
        <button
          type="button"
          aria-label={isBulkSelected ? 'Deselect snippet' : 'Select snippet'}
          aria-pressed={isBulkSelected}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBulkSelect?.();
          }}
          className={`shrink-0 self-center flex items-center justify-center w-5 h-5 rounded-md cursor-pointer transition-colors ${
            isBulkSelected
              ? 'nm-primary-inset'
              : 'border-2 border-slate-300/80 bg-white/40 hover:border-slate-400'
          }`}
        >
          {isBulkSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
        </button>
      )}

      {/* Main Snippet Information: Title, Category Badge, Preview.
          2026-10-17 locked task: a left-click on the card body COPIES the snippet
          (existing onCopy handler — same handler as the copy button/menu item, so
          the copied-check feedback fires); View Snippet stays in the three-dot
          menu, whose portal and stopPropagation keep its clicks out of here.
          BULK-DEL-01: in Bulk Selection Mode the body click toggles selection
          instead of copying, so no bulk action can accidentally copy. */}
      <div className="flex-1 min-w-0" onClick={selectionMode ? onToggleBulkSelect : onCopy}>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[14.5px] font-bold text-slate-800 tracking-tight truncate">
            {snippet.title}
          </h2>
          <span
            className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeStyle.bg} ${badgeStyle.text}`}
          >
            {category?.name ?? 'Default'}
          </span>
        </div>

        <p className="mt-1 text-[12.5px] text-slate-500 leading-relaxed line-clamp-2">
          {previewText}
        </p>
      </div>

      {/* Right Actions: Copy Button & Three-dot Menu */}
      <div className="flex items-center gap-1.5 self-center" onClick={(e) => e.stopPropagation()}>
        {/* Copy button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}
          title={isCopied ? 'Copied!' : 'Copy snippet'}
          className={`nm-press relative flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer ${
            isCopied
              ? 'nm-success-inset'
              : 'nm-icon-btn text-slate-600 hover:text-slate-800'
          }`}
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
          ) : (
            <Copy className="w-[15px] h-[15px]" strokeWidth={2} />
          )}
        </button>

        {/* Three-dot menu button */}
        <div className="relative" ref={triggerRef}>
          <button
            type="button"
            aria-label={`More options for ${snippet.title}`}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            onClick={handleToggleMenu}
            className={`nm-press flex items-center justify-center w-8 h-8 rounded-xl cursor-pointer ${
              isMenuOpen
                ? 'nm-icon-btn-inset text-[#9f0409]'
                : 'nm-icon-btn text-[#9f0409]/80 hover:text-[#7f1d1d]'
            }`}
          >
            <MoreVertical className="w-4 h-4" strokeWidth={2.4} />
          </button>

          {/* Overflow Menu Popover — SNIPPET-DROPDOWN-02: portaled to document.body
              with fixed trigger-anchored positioning, so the snippet list's scroll
              container cannot clip it and it paints above the category tabs and
              neighboring cards (body-level z-40 beats the popup surface's stacking
              context). Opening flips upward when the window lacks room below. */}
          {isMenuOpen && menuPos && createPortal(
            <div
              ref={menuRef}
              style={{
                ...(menuPos.top !== undefined ? { top: `${menuPos.top}px` } : {}),
                ...(menuPos.bottom !== undefined ? { bottom: `${menuPos.bottom}px` } : {}),
                right: `${menuPos.right}px`,
              }}
              className="fixed z-40 w-40 nm-dropdown-panel rounded-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
            >
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpen();
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected rounded-xl cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>View snippet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onEdit();
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected rounded-xl cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit snippet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onCopy();
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected rounded-xl cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy snippet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onToggleFavorite();
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected rounded-xl cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>{snippet.isFavorite ? 'Remove favorite' : 'Add favorite'}</span>
              </button>

              <div className="my-1 border-t border-slate-200/60" />

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDelete();
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Move to trash</span>
              </button>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
};
