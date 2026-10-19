import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Pencil, Star, X } from 'lucide-react';
import { Snippet, Category } from '../types';

interface SnippetPreviewModalProps {
  snippet: Snippet | null;
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (snippetId: string) => void;
  onCopy: (snippet: Snippet) => void;
  onToggleFavorite: (snippetId: string, current: boolean) => void;
  /** SNIPPET-DUP-01: duplicates via the existing db.duplicateSnippet workflow and
      opens the editor for the new duplicate. Resolves true only when duplication
      succeeded; the modal stays open on failure. */
  onDuplicate?: (snippetId: string) => Promise<boolean>;
}

export const SnippetPreviewModal: React.FC<SnippetPreviewModalProps> = ({
  snippet,
  category,
  isOpen,
  onClose,
  onEdit,
  onCopy,
  onToggleFavorite,
  onDuplicate,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateFailed, setDuplicateFailed] = useState(false);

  if (!isOpen || !snippet) return null;

  const handleCopy = () => {
    onCopy(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // SNIPPET-DUP-01: guard against repeated rapid clicks while the duplicate
  // is being created and persisted.
  const handleDuplicate = async () => {
    if (!onDuplicate || isDuplicating) return;
    setIsDuplicating(true);
    setDuplicateFailed(false);
    let ok = false;
    try {
      ok = await onDuplicate(snippet.id);
    } catch {
      ok = false;
    }
    setIsDuplicating(false);
    if (!ok) setDuplicateFailed(true);
  };

  const createdDate = new Date(snippet.createdAt).toLocaleDateString();
  const updatedDate = new Date(snippet.updatedAt).toLocaleDateString();

  return (
    /* SNIPPET-PREVIEW-01: the gray cast came from this overlay's slate-900/40 dim +
       backdrop blur compositing under the glass card. Replaced with the approved flat
       red gradient (glass-app-bg — the same class the Main Window uses, no new palette)
       and the established isolation behavior: the popup content is display:none while
       the preview is open (MainPopup wrapper), so nothing ghosts through the gradient's
       lower alpha. rounded-[26px] + overflow-hidden clip the overlay to the popup
       surface's rounded silhouette (the surface has no overflow-hidden of its own),
       preventing square-corner fragments; fixed inset-0 resolves against the surface,
       so the backdrop covers exactly the 430 x 550 working area. */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-app-bg overflow-hidden rounded-[26px] animate-in fade-in duration-150">
      <div className="glass-clay-surface w-full max-w-[420px] p-5 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 nm-raised px-2.5 py-1.5 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleFavorite(snippet.id, snippet.isFavorite)}
              className={`p-1.5 rounded-xl cursor-pointer ${
                snippet.isFavorite
                  ? 'nm-icon-btn-inset text-amber-500'
                  : 'nm-icon-btn text-slate-400 hover:text-amber-500'
              }`}
              title={snippet.isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Star
                className={`w-4 h-4 ${
                  snippet.isFavorite ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-slate-400'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => onEdit(snippet.id)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 nm-raised px-2.5 py-1.5 rounded-xl cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            {/* SNIPPET-DUP-01: duplicate the displayed snippet without opening the editor
                first; same nm-raised styling as the neighboring actions. */}
            {onDuplicate && (
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isDuplicating}
                className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 nm-raised px-2.5 py-1.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-default"
                aria-label="Duplicate"
                title={isDuplicating ? 'Creating duplicate...' : 'Duplicate snippet'}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isDuplicating ? 'Duplicating...' : 'Duplicate'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl nm-icon-btn text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="nm-scrollbar flex-1 overflow-y-auto py-3.5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-800">{snippet.title}</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {category?.name ?? 'Default'}
            </span>
          </div>

          <div className="text-xs text-slate-600">
            Created {createdDate} · Updated {updatedDate}
          </div>

          <div
            className="text-sm text-slate-700 leading-relaxed glass-inset p-3.5 font-sans"
            dangerouslySetInnerHTML={{ __html: snippet.content }}
          />
        </div>

        {/* Bottom actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className={`text-[11px] ${duplicateFailed ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
            {duplicateFailed ? 'Duplicate failed — snippet not found.' : 'Esc to close'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl cursor-pointer ${
              copied ? 'nm-success-inset' : 'nm-primary-raised'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy to clipboard</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
