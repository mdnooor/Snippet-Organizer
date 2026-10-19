import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  X,
  Folder,
  ChevronDown,
  Plus,
  Check,
  Star,
  Copy,
  Trash2,
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  MoreHorizontal,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { Snippet, Category } from '../types';

interface SnippetEditorModalProps {
  isOpen: boolean;
  mode: 'new' | 'edit';
  snippetId: string | null;
  snippets: Snippet[];
  categories: Category[];
  onClose: () => void;
  onSave: (data: {
    title: string;
    content: string;
    categoryId: string;
    isFavorite: boolean;
    isDuplicate?: boolean;
  }) => void | Promise<void>;
  onDelete?: (snippetId: string) => void;
  onDuplicate?: (snippetId: string) => Promise<void> | void;
  onCreateCategory?: (name: string, color: string) => Promise<Category>;
}

// 8 Palette colors matching the reference image
const CATEGORY_COLORS = [
  '#3b66f5', // Royal Blue (default active)
  '#60a5fa', // Sky Blue
  '#34d399', // Mint Green
  '#fbbf24', // Pastel Amber
  '#fb923c', // Warm Orange
  '#f87171', // Coral Red
  '#a78bfa', // Lavender Violet
  '#94a3b8', // Slate Gray
];

/**
 * Strips supported inline marks and converts block formatting (headings, blockquotes, lists)
 * back to standard paragraphs while preserving plain text and valid hyperlinks with destinations.
 */
export function cleanHtmlFormatting(html: string): string {
  if (!html || !html.trim()) return html;

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const body = doc.body;

    function processNode(node: Node): Node | Node[] {
      if (node.nodeType === Node.TEXT_NODE) {
        return node;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return node;
      }

      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      const childNodes = Array.from(el.childNodes);
      const processedChildren: Node[] = [];
      for (const child of childNodes) {
        const res = processNode(child);
        if (Array.isArray(res)) {
          processedChildren.push(...res);
        } else {
          processedChildren.push(res);
        }
      }

      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
      for (const child of processedChildren) {
        el.appendChild(child);
      }

      // 1. Preserve links (strip any inline style, preserve href and attributes)
      if (tagName === 'a') {
        el.removeAttribute('style');
        return el;
      }

      // 2. Convert lists (ul, ol) by unwrapping li elements as <p> paragraphs
      if (tagName === 'ul' || tagName === 'ol') {
        const paragraphs: HTMLElement[] = [];
        for (const child of Array.from(el.children)) {
          const cTag = child.tagName.toLowerCase();
          if (cTag === 'li') {
            const p = doc.createElement('p');
            while (child.firstChild) {
              p.appendChild(child.firstChild);
            }
            paragraphs.push(p);
          } else if (cTag === 'p') {
            paragraphs.push(child as HTMLElement);
          }
        }
        return paragraphs.length > 0 ? paragraphs : processedChildren;
      }

      if (tagName === 'li') {
        const p = doc.createElement('p');
        while (el.firstChild) {
          p.appendChild(el.firstChild);
        }
        return p;
      }

      // 3. Convert headings and blockquotes to paragraph <p>
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tagName)) {
        const p = doc.createElement('p');
        while (el.firstChild) {
          p.appendChild(el.firstChild);
        }
        return p;
      }

      // 4. Unwrap inline formatting marks (bold, italic, underline, strike, font, etc.)
      if (['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'font', 'mark'].includes(tagName)) {
        return Array.from(el.childNodes);
      }

      // 5. Unwrap spans (e.g. style="color: ...; background-color: ...")
      if (tagName === 'span') {
        return Array.from(el.childNodes);
      }

      // 6. Normal paragraphs and divs: remove styling attributes
      if (tagName === 'p' || tagName === 'div') {
        el.removeAttribute('style');
        return el;
      }

      return el;
    }

    const childNodes = Array.from(body.childNodes);
    const finalNodes: Node[] = [];
    for (const child of childNodes) {
      const res = processNode(child);
      if (Array.isArray(res)) {
        finalNodes.push(...res);
      } else {
        finalNodes.push(res);
      }
    }

    while (body.firstChild) {
      body.removeChild(body.firstChild);
    }
    for (const n of finalNodes) {
      body.appendChild(n);
    }

    return body.innerHTML;
  }

  // Fallback regex cleaner
  return html
    .replace(/<\/?(?:b|strong|i|em|u|s|strike|del|font|mark)(?:\s+[^>]*)?>/gi, '')
    .replace(/<span(?:\s+[^>]*)?>(.*?)<\/span>/gi, '$1')
    .replace(/<h[1-6](?:\s+[^>]*)?>(.*?)<\/h[1-6]>/gi, '<p>$1</p>')
    .replace(/<blockquote(?:\s+[^>]*)?>(.*?)<\/blockquote>/gi, '<p>$1</p>')
    .replace(/<li(?:\s+[^>]*)?>(.*?)<\/li>/gi, '<p>$1</p>')
    .replace(/<\/?(?:ul|ol)(?:\s+[^>]*)?>/gi, '')
    .replace(/(<a\s+[^>]*?)\s+style="[^"]*"/gi, '$1')
    .replace(/<(?:p|div)\s+[^>]*>/gi, '<p>');
}

export const SnippetEditorModal: React.FC<SnippetEditorModalProps> = ({
  isOpen,
  mode,
  snippetId,
  snippets,
  categories,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  onCreateCategory,
}) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('default');
  const [selectedColor, setSelectedColor] = useState('#3b66f5');
  const [isFavorite, setIsFavorite] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Duplicate draft state
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDuplicateDraft, setIsDuplicateDraft] = useState(false);
  const [duplicateFeedback, setDuplicateFeedback] = useState<string | null>(null);

  // Dropdown states
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showNewCategoryPrompt, setShowNewCategoryPrompt] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b66f5');
  const [textColor, setTextColor] = useState('#e11d48');

  const editorRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const savedSelectionRangeRef = useRef<Range | null>(null);
  const [moreMenuPos, setMoreMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // SNIPPET-FORM-01: the toolbar sits lower now that the form is a full page, so the
  // More-formatting menu (measured ~227px tall) can overflow the fixed 600px window
  // when opened downward. Same upward-flip rule as the snippet-card menus
  // (UI-MENU-STACK-01): anchor below the button when it fits, otherwise anchor above it.
  const MORE_MENU_EST_HEIGHT = 240;
  const computeMoreMenuPos = () => {
    if (!moreBtnRef.current) return null;
    const rect = moreBtnRef.current.getBoundingClientRect();
    const right = Math.max(16, window.innerWidth - rect.right);
    if (rect.bottom + 6 + MORE_MENU_EST_HEIGHT <= window.innerHeight) {
      return { top: rect.bottom + 6, right };
    }
    return { bottom: window.innerHeight - rect.top + 6, right };
  };

  const handleToggleMoreMenu = () => {
    if (!isMoreMenuOpen) {
      setMoreMenuPos(computeMoreMenuPos());
      setIsMoreMenuOpen(true);
    } else {
      setIsMoreMenuOpen(false);
    }
  };

  // Close more menu on click outside or escape
  useEffect(() => {
    if (!isMoreMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node) &&
        moreBtnRef.current &&
        !moreBtnRef.current.contains(e.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      const pos = computeMoreMenuPos();
      if (pos) setMoreMenuPos(pos);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isMoreMenuOpen]);

  // Initialize data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setIsDuplicating(false);
    setIsDuplicateDraft(false);
    setDuplicateFeedback(null);

    if (mode === 'edit' && snippetId) {
      const existing = snippets.find((s) => s.id === snippetId);
      if (existing) {
        setTitle(existing.title);
        setCategoryId(existing.categoryId);
        setIsFavorite(existing.isFavorite);
        const cat = categories.find((c) => c.id === existing.categoryId);
        if (cat?.color) {
          setSelectedColor(cat.color);
        }
        if (editorRef.current) {
          editorRef.current.innerHTML = existing.content;
          updateCharCount();
        }
      }
    } else {
      setTitle('');
      setCategoryId(categories[0]?.id || 'default');
      setSelectedColor(CATEGORY_COLORS[0]);
      setIsFavorite(false);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        setCharCount(0);
      }
    }
    setError(null);
    setIsCategoryMenuOpen(false);
    setShowNewCategoryPrompt(false);
  }, [isOpen, mode, snippetId, snippets, categories]);

  // Close category dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(e.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateCharCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || '';
      setCharCount(text.replace(/\s+/g, ' ').trim().length);
    }
  };

  const currentCategory = categories.find((c) => c.id === categoryId);

  const isMac =
    typeof navigator !== 'undefined' &&
    Boolean(
      (navigator as any).userAgentData?.platform?.toLowerCase().includes('mac') ||
      navigator.platform?.toLowerCase().includes('mac') ||
      navigator.userAgent?.toLowerCase().includes('mac')
    );
  const modKey = isMac ? 'Cmd' : 'Ctrl';
  const altKey = isMac ? 'Option' : 'Alt';

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRangeRef.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedSelectionRangeRef.current && sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRangeRef.current);
      } catch {
        // ignore
      }
    }
  };

  // Rich Text Editor Commands
  const formatDoc = (cmd: string, val: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, val);
    updateCharCount();
  };

  const formatBlockDoc = (tag: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('styleWithCSS', false, 'true');
    const cleanTag = tag.replace(/[<>]/g, '').toLowerCase();
    const ok = document.execCommand('formatBlock', false, `<${cleanTag}>`);
    if (!ok) {
      document.execCommand('formatBlock', false, cleanTag);
    }
    updateCharCount();
  };

  const handleClearFormatting = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const activeSel = window.getSelection();
    if (!activeSel || activeSel.rangeCount === 0) return;
    const range = activeSel.getRangeAt(0);

    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    // Detect if within list, heading, or blockquote block
    let node: Node | null = range.commonAncestorContainer;
    let inUl = false;
    let inOl = false;
    let inHeadingOrQuote = false;

    let curr: HTMLElement | null =
      node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    while (curr && curr !== editorRef.current) {
      const tag = curr.tagName.toLowerCase();
      if (tag === 'ul') inUl = true;
      if (tag === 'ol') inOl = true;
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tag)) {
        inHeadingOrQuote = true;
      }
      curr = curr.parentElement;
    }

    if (inUl || document.queryCommandState('insertUnorderedList')) {
      document.execCommand('insertUnorderedList', false);
    }
    if (inOl || document.queryCommandState('insertOrderedList')) {
      document.execCommand('insertOrderedList', false);
    }
    if (inHeadingOrQuote) {
      formatBlockDoc('p');
    }

    // Clear inline marks
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('removeFormat', false);

    // If selection has styled spans/marks that removeFormat missed, clean and replace via insertHTML
    if (!activeSel.isCollapsed) {
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(range.cloneContents());

      let hasStyledAncestor = false;
      let a: HTMLElement | null =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? (range.commonAncestorContainer as HTMLElement)
          : range.commonAncestorContainer.parentElement;
      while (a && a !== editorRef.current) {
        const tag = a.tagName.toLowerCase();
        if (tag === 'span' || tag === 'font' || a.hasAttribute('style')) {
          hasStyledAncestor = true;
          if (a.textContent === activeSel.toString() || activeSel.toString().length >= a.textContent.length) {
            a.removeAttribute('style');
          }
          break;
        }
        a = a.parentElement;
      }

      if (
        hasStyledAncestor ||
        tempDiv.querySelector(
          'span[style], font[color], b, strong, i, em, u, s, strike, h1, h2, h3, blockquote, ul, ol, li'
        )
      ) {
        const cleaned = cleanHtmlFormatting(tempDiv.innerHTML);
        document.execCommand('insertHTML', false, cleaned);
      }
    } else {
      let a: HTMLElement | null =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? (range.commonAncestorContainer as HTMLElement)
          : range.commonAncestorContainer.parentElement;
      while (a && a !== editorRef.current) {
        const tag = a.tagName.toLowerCase();
        if (tag === 'span' || tag === 'font') {
          a.removeAttribute('style');
        }
        a = a.parentElement;
      }
    }

    updateCharCount();
  };

  const handleInsertLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const activeSel = window.getSelection();
    const hasSelection =
      Boolean(activeSel && !activeSel.isCollapsed && activeSel.toString().trim().length > 0);

    const rawUrl = prompt('Enter URL (https://...):', 'https://');
    if (!rawUrl || !rawUrl.trim()) return;

    let cleanUrl = rawUrl.trim();
    const lower = cleanUrl.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
      alert('Invalid or unsafe URL protocol.');
      return;
    }

    if (!/^([a-z0-9+.-]+:|\/\/|\/)/i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    if (hasSelection) {
      formatDoc('createLink', cleanUrl);
    } else {
      const text = prompt('Enter visible link text (optional):', cleanUrl);
      const cleanText = text && text.trim().length > 0 ? text.trim() : cleanUrl;
      const html = `<a href="${cleanUrl}">${cleanText}</a>`;
      formatDoc('insertHTML', html);
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      // Prevent accidental navigation away from the editor
      e.preventDefault();
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMod = isMac ? e.metaKey : e.ctrlKey;
    if (!isMod) return;

    const key = e.key.toLowerCase();

    // 1. Insert Link: Ctrl+L / Cmd+L
    if (key === 'l' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      handleInsertLink();
      return;
    }

    // 2. Bulleted List: Ctrl+Shift+8 / Cmd+Shift+8
    if (e.shiftKey && (e.key === '8' || e.key === '*')) {
      e.preventDefault();
      e.stopPropagation();
      formatDoc('insertUnorderedList');
      return;
    }

    // 3. Numbered List: Ctrl+Shift+7 / Cmd+Shift+7
    if (e.shiftKey && (e.key === '7' || e.key === '&')) {
      e.preventDefault();
      e.stopPropagation();
      formatDoc('insertOrderedList');
      return;
    }

    // 4. Headings: Ctrl+Alt+1/2/3 / Cmd+Option+1/2/3
    if (e.altKey && !e.shiftKey) {
      if (e.key === '1') {
        e.preventDefault();
        e.stopPropagation();
        formatBlockDoc('h1');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        e.stopPropagation();
        formatBlockDoc('h2');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        e.stopPropagation();
        formatBlockDoc('h3');
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        formatBlockDoc('p');
        return;
      }
    }

    // 5. Clear formatting: Ctrl+\ / Cmd+\
    if (e.key === '\\') {
      e.preventDefault();
      e.stopPropagation();
      handleClearFormatting();
      return;
    }

    // 6. Bold: Ctrl+B / Cmd+B
    if (key === 'b' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      formatDoc('bold');
      return;
    }

    // 7. Italic: Ctrl+I / Cmd+I
    if (key === 'i' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      formatDoc('italic');
      return;
    }

    // 8. Underline: Ctrl+U / Cmd+U
    if (key === 'u' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      formatDoc('underline');
      return;
    }

    // 9. Redo: Ctrl+Y on Windows / Linux, or Ctrl+Shift+Z / Cmd+Shift+Z
    if (
      (key === 'y' && !isMac && !e.shiftKey && !e.altKey) ||
      (key === 'z' && e.shiftKey && !e.altKey)
    ) {
      e.preventDefault();
      e.stopPropagation();
      formatDoc('redo');
      return;
    }

    // 10. Strikethrough: Ctrl+Shift+X / Cmd+Shift+X
    if (key === 'x' && e.shiftKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      formatDoc('strikeThrough');
      return;
    }
  };

  const handleInsertImage = () => {
    const url = prompt('Enter Image URL (https://...):', 'https://');
    if (url && url.trim().length > 0) {
      formatDoc('insertImage', url.trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    const htmlContent = editorRef.current?.innerHTML || '<p></p>';
    onSave({
      title: title.trim(),
      content: htmlContent,
      categoryId,
      isFavorite,
      isDuplicate: isDuplicateDraft,
    });
  };

  const handleCreateNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (onCreateCategory) {
      const created = await onCreateCategory(newCategoryName.trim(), newCategoryColor);
      setCategoryId(created.id);
      setSelectedColor(created.color);
    }
    setNewCategoryName('');
    setShowNewCategoryPrompt(false);
  };

  const handleDuplicate = async () => {
    if (isDuplicating || isDuplicateDraft || mode === 'new') return;
    setIsDuplicating(true);
    setError(null);

    // Provide a brief processing period so visual state is clearly experienced and repeated clicks are prevented
    await new Promise((resolve) => setTimeout(resolve, 300));

    const currentTitle = title.trim();
    setTitle(currentTitle ? `${currentTitle} (Copy)` : 'Untitled Snippet (Copy)');
    setIsDuplicateDraft(true);
    setIsDuplicating(false);
    setDuplicateFeedback('Duplicate created — edit and save to add it to your snippets.');
  };

  const handleDelete = () => {
    if (isDuplicateDraft) {
      onClose();
      return;
    }
    if (snippetId && onDelete) {
      if (confirm('Move this snippet to Trash?')) {
        onDelete(snippetId);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    /* SNIPPET-FORM-01: same background-isolation architecture as the Settings page
       (SETTINGS-ISO-01) — a transparent full-surface clipper with NO own background and
       NO own clay surface. The app root glass-app-bg is the single flat gradient and
       MainPopup's glass-clay-surface is the single raised surface (the popup content is
       display:none while this page is open, so nothing ghosts through). fixed inset-0
       resolves against the surface → the page fills exactly 430 x 550 with the app's
       25px ring visible; rounded-[26px] + overflow-hidden give the same corner clipping
       the old floating card provided, and p-5 matches the popup's content inset. The
       old floating 391x755 card (Save button below the viewport) is replaced by a
       pinned header + the form's own scroll region + pinned actions. */
    <div className="fixed inset-0 z-50 overflow-hidden rounded-[26px] animate-in fade-in duration-150 select-none flex flex-col p-5 font-sans">
        {/* 1. Header: Back Arrow, "Snippet Organizer — Edit/New Snippet", Close (X) */}
        <div className="flex items-center justify-between pb-4 shrink-0 select-none">
          {/* Back button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-2xl nm-icon-btn text-slate-700 hover:text-slate-900 cursor-pointer"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2.4} />
          </button>

          {/* Header Title */}
          <h2 className="text-[15px] font-bold tracking-tight text-slate-800 text-center truncate px-2">
            Snippet Organizer — {isDuplicateDraft ? 'Duplicate Snippet' : mode === 'edit' ? 'Edit Snippet' : 'New Snippet'}
          </h2>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-2xl nm-icon-btn text-slate-700 hover:text-slate-900 cursor-pointer"
            aria-label="Close"
            title="Close"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
          </button>
        </div>

        {/* 2. Main Form Fields — the form is the flexible column; its field region
            scrolls in its own region (same content-scrolling pattern as the Settings
            content column) while the header above and the validation + action buttons
            below stay pinned and always visible. */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="nm-scrollbar flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
          {/* Duplicate feedback message banner */}
          {duplicateFeedback && (
            <div className="px-3.5 py-2.5 rounded-2xl bg-blue-50/90 border border-blue-200/90 text-blue-700 text-xs font-medium flex items-center gap-2.5 shadow-2xs select-none animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                <Copy className="w-3 h-3" strokeWidth={2.4} />
              </div>
              <span className="flex-1 font-medium leading-relaxed">{duplicateFeedback}</span>
            </div>
          )}
          {/* Field 1: Title * (Static Inset Neumorphic Field) */}
          <div>
            <label className="block text-[13px] font-bold text-slate-800 mb-1.5 select-none">
              Title <span className="text-rose-500 font-bold">*</span>
            </label>
            <div
              className="relative flex items-center h-11 w-full nm-static-inset-field transition-all duration-150 overflow-hidden"
            >
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Refund Approved"
                className="w-full h-full px-4 bg-transparent text-[14px] font-medium text-slate-800 placeholder-slate-500 outline-none z-10"
              />
            </div>
          </div>

          {/* Field 2: Category * and + New category */}
          <div>
            <label className="block text-[13px] font-bold text-slate-800 mb-1.5 select-none">
              Category <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="flex items-center gap-2.5">
              {/* Category selector button */}
              <div className="relative flex-1" ref={categoryMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                  className={`w-full h-11 px-3.5 rounded-2xl flex items-center justify-between text-slate-800 cursor-pointer select-none ${
                    isCategoryMenuOpen ? 'nm-inset' : 'nm-raised'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-[18px] h-[18px] text-slate-500 shrink-0" strokeWidth={2} />
                    <span className="text-[14px] font-medium truncate">
                      {currentCategory?.name || 'Default'}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                      isCategoryMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Category Dropdown Menu */}
                {isCategoryMenuOpen && (
                  <div className="absolute left-0 top-12 z-30 w-full nm-dropdown-panel rounded-2xl p-1.5 py-2 animate-in fade-in zoom-in-95 duration-100">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(cat.id);
                          if (cat.color) setSelectedColor(cat.color);
                          setIsCategoryMenuOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer ${
                          categoryId === cat.id
                            ? 'nm-menu-item-selected text-[#9f0409]'
                            : 'nm-menu-item-unselected text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color || '#3b82f6' }}
                          />
                          <span>{cat.name}</span>
                        </div>
                        {categoryId === cat.id && (
                          <Check className="w-3.5 h-3.5 text-[#9f0409] stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* + New category button */}
              <button
                type="button"
                onClick={() => setShowNewCategoryPrompt(true)}
                className="h-11 px-3.5 rounded-2xl nm-raised flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-semibold text-[13px] cursor-pointer select-none shrink-0"
              >
                <Plus className="w-4 h-4" strokeWidth={2.4} />
                <span>New category</span>
              </button>
            </div>

            {/* Inline New Category Creation Modal */}
            {showNewCategoryPrompt && (
              <div className="mt-2.5 p-3 rounded-2xl nm-dropdown-panel space-y-2 animate-in fade-in duration-100">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white/50 border border-white/60 rounded-xl outline-none focus:ring-1 focus:ring-[rgba(208,2,5,0.35)]"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {CATEGORY_COLORS.slice(0, 4).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCategoryColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-md cursor-pointer ${
                          newCategoryColor === c
                            ? 'nm-color-swatch-selected ring-2 ring-slate-700/60'
                            : 'nm-color-swatch'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryPrompt(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 nm-raised rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-1 text-xs font-semibold text-white nm-primary-raised rounded-lg cursor-pointer"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Field 3: Category Color Row */}
          <div>
            <label className="block text-[13px] font-bold text-slate-800 mb-2 select-none">
              Category Color
            </label>
            <div className="flex items-center gap-2.5 overflow-x-auto py-0.5 no-scrollbar">
              {CATEGORY_COLORS.map((col) => {
                const isSelected = selectedColor === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    style={{ backgroundColor: col }}
                    className={`relative w-8 h-8 rounded-xl cursor-pointer flex items-center justify-center transition-all duration-150 ${
                      isSelected
                        ? 'nm-color-swatch-selected ring-2 ring-slate-700/50 ring-offset-2 scale-105'
                        : 'nm-color-swatch hover:scale-105'
                    }`}
                    aria-label={`Select color ${col}`}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 4: Content * (Rich Text Editor Container) */}
          <div>
            <label className="block text-[13px] font-bold text-slate-800 mb-1.5 select-none">
              Content <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="rounded-2xl border border-white/60 bg-white/35 backdrop-blur-sm overflow-hidden">
              {/* Top Formatting Toolbar */}
              <div
                className="h-10 bg-white/30 border-b border-white/50 px-2.5 flex items-center gap-1 select-none overflow-x-auto no-scrollbar"
                role="toolbar"
                aria-label="Formatting tools"
              >
                {/* Bold */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={() => formatDoc('bold')}
                  className="w-7 h-7 rounded-lg nm-icon-btn flex items-center justify-center text-slate-700 cursor-pointer"
                  title={`Bold (${modKey}+B)`}
                  aria-label={`Bold (${modKey}+B)`}
                >
                  <Bold className="w-4 h-4" strokeWidth={2.8} />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={() => formatDoc('italic')}
                  className="w-7 h-7 rounded-lg nm-icon-btn flex items-center justify-center text-slate-700 cursor-pointer"
                  title={`Italic (${modKey}+I)`}
                  aria-label={`Italic (${modKey}+I)`}
                >
                  <Italic className="w-4 h-4" strokeWidth={2.4} />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={() => formatDoc('underline')}
                  className="w-7 h-7 rounded-lg nm-icon-btn flex items-center justify-center text-slate-700 cursor-pointer"
                  title={`Underline (${modKey}+U)`}
                  aria-label={`Underline (${modKey}+U)`}
                >
                  <Underline className="w-4 h-4" strokeWidth={2.4} />
                </button>

                {/* Text Color A▾ with active red bar */}
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSelection();
                    }}
                    onClick={() => colorPickerRef.current?.click()}
                    className="flex items-center gap-0.5 px-1.5 h-7 rounded-lg nm-raised text-slate-700 font-bold text-xs cursor-pointer"
                    title="Text Color"
                    aria-label="Text Color"
                  >
                    <span className="relative font-bold text-[14px]">
                      A
                      <span
                        className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full"
                        style={{ backgroundColor: textColor }}
                      />
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                  <input
                    ref={colorPickerRef}
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      formatDoc('foreColor', e.target.value);
                    }}
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                  />
                </div>

                <div className="h-4 w-px bg-slate-300/80 mx-0.5" />

                {/* Link */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={handleInsertLink}
                  className="w-7 h-7 rounded-lg nm-icon-btn flex items-center justify-center text-slate-700 cursor-pointer"
                  title={`Insert Link (${modKey}+L)`}
                  aria-label={`Insert Link (${modKey}+L)`}
                >
                  <Link2 className="w-4 h-4" strokeWidth={2.2} />
                </button>

                {/* Numbered List */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={() => formatDoc('insertOrderedList')}
                  className="w-7 h-7 rounded-lg nm-icon-btn flex items-center justify-center text-slate-700 cursor-pointer"
                  title={`Numbered List (${modKey}+Shift+7)`}
                  aria-label={`Numbered List (${modKey}+Shift+7)`}
                >
                  <ListOrdered className="w-4 h-4" strokeWidth={2.2} />
                </button>

                {/* Bullet List */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={() => formatDoc('insertUnorderedList')}
                  className="w-7 h-7 rounded-lg nm-icon-btn flex items-center justify-center text-slate-700 cursor-pointer"
                  title={`Bulleted List (${modKey}+Shift+8)`}
                  aria-label={`Bulleted List (${modKey}+Shift+8)`}
                >
                  <List className="w-4 h-4" strokeWidth={2.2} />
                </button>

                {/* Align Left */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={() => formatDoc('justifyLeft')}
                  className="w-7 h-7 rounded-lg nm-icon-btn flex items-center justify-center text-slate-700 cursor-pointer"
                  title="Align Left"
                  aria-label="Align Left"
                >
                  <AlignLeft className="w-4 h-4" strokeWidth={2.2} />
                </button>

                {/* Align Center */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={() => formatDoc('justifyCenter')}
                  className="w-7 h-7 rounded-lg nm-icon-btn flex items-center justify-center text-slate-700 cursor-pointer"
                  title="Align Center"
                  aria-label="Align Center"
                >
                  <AlignCenter className="w-4 h-4" strokeWidth={2.2} />
                </button>

                {/* More ⋯ */}
                <button
                  ref={moreBtnRef}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveSelection();
                  }}
                  onClick={handleToggleMoreMenu}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer ${
                    isMoreMenuOpen
                      ? 'nm-icon-btn-inset text-[#9f0409]'
                      : 'nm-icon-btn text-slate-700'
                  }`}
                  title="More Formatting"
                  aria-label="More Formatting"
                  aria-haspopup="menu"
                  aria-expanded={isMoreMenuOpen}
                >
                  <MoreHorizontal className="w-4 h-4" strokeWidth={2.2} />
                </button>
              </div>

              {/* Task 2: Static Inset Neumorphic Editable Content Surface */}
              <div className="relative group">
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={updateCharCount}
                  onSelect={saveSelection}
                  onKeyUp={saveSelection}
                  onMouseUp={saveSelection}
                  onKeyDown={handleEditorKeyDown}
                  onClick={handleEditorClick}
                  className="rich-editor-content nm-scrollbar nm-static-inset-editor min-h-[150px] max-h-[230px] overflow-y-auto p-4 text-[14px] font-normal text-slate-800 leading-relaxed outline-none font-sans"
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Snippet content"
                  data-testid="editor-surface"
                />
              </div>

              {/* Bottom Meta & Action Toolbar */}
              <div className="h-11 bg-white/30 border-t border-white/50 px-3 flex items-center justify-between select-none">
                <div className="flex items-center gap-1.5">
                  {/* Image action */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSelection();
                    }}
                    onClick={handleInsertImage}
                    className="w-8 h-8 rounded-xl nm-icon-btn flex items-center justify-center text-slate-600 hover:text-slate-800 cursor-pointer"
                    title="Insert Image"
                    aria-label="Insert Image"
                  >
                    <ImageIcon className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </button>

                  {/* Divider */}
                  <div className="h-4 w-px bg-slate-300 mx-1" />

                  {/* Undo */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSelection();
                    }}
                    onClick={() => formatDoc('undo')}
                    className="w-8 h-8 rounded-xl nm-icon-btn flex items-center justify-center text-slate-600 hover:text-slate-800 cursor-pointer"
                    title={`Undo (${modKey}+Z)`}
                    aria-label={`Undo (${modKey}+Z)`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </button>

                  {/* Redo */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSelection();
                    }}
                    onClick={() => formatDoc('redo')}
                    className="w-8 h-8 rounded-xl nm-icon-btn flex items-center justify-center text-slate-600 hover:text-slate-800 cursor-pointer"
                    title={`Redo (${isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y'})`}
                    aria-label={`Redo (${isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y'})`}
                  >
                    <RotateCw className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </button>
                </div>

                {/* Character Count */}
                <div className="text-[12px] font-medium text-slate-600 tabular-nums">
                  Characters: {charCount}
                </div>
              </div>
            </div>
          </div>

          {/* Field 5: Snippet Actions Row */}
          <div>
            <label className="block text-[13px] font-bold text-slate-800 mb-2 select-none">
              Snippet Actions
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {/* 1. Favorite button */}
              <button
                type="button"
                onClick={() => setIsFavorite((p) => !p)}
                className={`h-9 px-3.5 rounded-xl text-[12.5px] font-semibold flex items-center gap-1.5 cursor-pointer select-none ${
                  isFavorite
                    ? 'nm-inset text-amber-700'
                    : 'nm-raised text-slate-700 hover:text-slate-900'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    isFavorite
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-amber-500 fill-amber-400'
                  }`}
                />
                <span>Favorite</span>
              </button>

              {/* 2. Duplicate button */}
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isDuplicating || isDuplicateDraft || mode === 'new'}
                className={`h-9 px-3.5 rounded-xl text-[12.5px] font-semibold flex items-center gap-1.5 select-none ${
                  isDuplicating || isDuplicateDraft || mode === 'new'
                    ? 'nm-raised text-slate-500 cursor-not-allowed'
                    : 'nm-raised text-slate-700 hover:text-slate-900 cursor-pointer'
                }`}
                aria-label="Duplicate"
                title={
                  mode === 'new'
                    ? 'Cannot duplicate unsaved snippet'
                    : isDuplicateDraft
                    ? 'Duplicate draft already created'
                    : 'Duplicate snippet'
                }
              >
                {isDuplicating ? (
                  <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" strokeWidth={2.2} />
                )}
                <span>{isDuplicating ? 'Duplicating...' : 'Duplicate'}</span>
              </button>


              {/* 4. Delete button */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDuplicateDraft || mode === 'new'}
                className={`h-9 px-3.5 rounded-xl text-[12.5px] font-semibold flex items-center gap-1.5 select-none ml-auto ${
                  isDuplicateDraft || mode === 'new'
                    ? 'nm-raised text-slate-500 cursor-not-allowed'
                    : 'nm-danger-raised cursor-pointer'
                }`}
                aria-label="Delete"
                title={
                  isDuplicateDraft
                    ? 'Cannot delete an unsaved draft'
                    : mode === 'new'
                    ? 'Cannot delete an unsaved snippet'
                    : 'Delete snippet'
                }
              >
                <Trash2
                  className={`w-3.5 h-3.5 ${
                    isDuplicateDraft || mode === 'new' ? 'text-slate-400' : 'text-rose-500'
                  }`}
                  strokeWidth={2.2}
                />
                <span>Delete</span>
              </button>
            </div>
          </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-medium shrink-0 pt-1">{error}</p>}

          {/* 6. Bottom Action Buttons: Cancel + Save Snippet — pinned outside the scroll
              region so they are never clipped at the bottom of the fixed 480 x 600
              viewport (SNIPPET-FORM-01; baseline had Save at y=724, below the fold). */}
          <div className="flex items-center gap-3 pt-2 shrink-0 select-none">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl nm-raised text-slate-700 hover:text-slate-900 font-semibold text-[14px] cursor-pointer"
            >
              Cancel
            </button>

            {/* Save Snippet Button */}
            <button
              type="submit"
              className="flex-[1.5] h-12 rounded-2xl nm-primary-raised text-white font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Snippet</span>
            </button>
          </div>
        </form>

        {/* Task 1: Floating More Options Popup Overlay */}
        {isMoreMenuOpen && moreMenuPos && (
          <div
            ref={moreMenuRef}
            style={{
              ...(moreMenuPos.top !== undefined ? { top: `${moreMenuPos.top}px` } : {}),
              ...(moreMenuPos.bottom !== undefined ? { bottom: `${moreMenuPos.bottom}px` } : {}),
              right: `${moreMenuPos.right}px`,
            }}
            className="fixed z-[100] w-52 nm-dropdown-panel rounded-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
            role="menu"
            aria-label="More formatting options"
          >
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                formatBlockDoc('p');
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-xl font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected cursor-pointer"
            >
              <span className="font-semibold text-slate-700 w-4 text-[13px]">¶</span>
              <span>Normal text</span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">{modKey}+{altKey}+0</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                formatBlockDoc('h1');
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-xl font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected cursor-pointer"
            >
              <span className="font-bold text-slate-900 w-4 text-[13px]">H1</span>
              <span>Heading 1</span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">{modKey}+{altKey}+1</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                formatBlockDoc('h2');
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-xl font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected cursor-pointer"
            >
              <span className="font-bold text-slate-900 w-4 text-[13px]">H2</span>
              <span>Heading 2</span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">{modKey}+{altKey}+2</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                formatBlockDoc('h3');
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-xl font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected cursor-pointer"
            >
              <span className="font-bold text-slate-900 w-4 text-[13px]">H3</span>
              <span>Heading 3</span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">{modKey}+{altKey}+3</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                formatBlockDoc('blockquote');
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-xl font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected cursor-pointer"
            >
              <span className="font-serif font-bold text-slate-900 w-4 text-[14px]">❝</span>
              <span>Blockquote</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                formatDoc('strikeThrough');
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-xl font-medium text-slate-700 hover:text-slate-900 nm-menu-item-unselected cursor-pointer"
            >
              <span className="line-through font-bold text-slate-900 w-4">S</span>
              <span>Strikethrough</span>
              <span className="ml-auto text-[10px] text-slate-400 font-mono">{modKey}+Shift+X</span>
            </button>
            <div className="my-1 border-t border-slate-200/60" />
            <button
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                handleClearFormatting();
                setIsMoreMenuOpen(false);
              }}
              className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-xl font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 nm-menu-item-unselected cursor-pointer"
            >
              <span className="w-4 font-bold">✕</span>
              <span>Clear formatting</span>
              <span className="ml-auto text-[10px] text-rose-400 font-mono">{modKey}+\</span>
            </button>
          </div>
        )}
    </div>
  );
};
