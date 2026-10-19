import React from 'react';
import { Plus, Settings, X, Pin } from 'lucide-react';

interface HeaderProps {
  onNewSnippet: () => void;
  onOpenSettings: () => void;
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewSnippet,
  onOpenSettings,
  onClose,
  isPinned = false,
  onTogglePin,
}) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (typeof window !== 'undefined' && window.close) {
      window.close();
    }
  };

  return (
    <header className="flex items-center justify-between pb-4 pt-1 select-none gap-2">
      {/* Left side: Brand Logo + Pin/Unpin control immediately beside the logo */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Static brand logo container — LOGO-GLOW-01: renders the approved
            primary logo artwork (canonical pack master) inside the existing
            theme-matched plinth; .nm-logo-glow adds the soft coral silhouette
            glow. Container size/radius unchanged (no layout shift). */}
        <div
          className="nm-logo-glow relative flex items-center justify-center w-10 h-10 rounded-[26%] bg-[rgb(240,85,88)] shadow-sm shadow-red-500/30 overflow-hidden select-none"
          title="Snippet Organizer"
        >
          <img
            src="icons/icon-master-1024.png"
            alt="Snippet Organizer logo"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Feature 2: Header Pin/Unpin control immediately beside the logo */}
        <button
          type="button"
          onClick={onTogglePin}
          className={`flex items-center justify-center w-9 h-9 rounded-2xl cursor-pointer ${
            isPinned
              ? 'nm-icon-btn-inset text-[#9f0409]'
              : 'nm-icon-btn text-slate-600 hover:text-slate-900'
          }`}
          aria-label={
            isPinned
              ? 'Unpin window (return to attached mode)'
              : 'Pin to floating window'
          }
          title={
            isPinned
              ? 'Unpin window (return to attached mode)'
              : 'Pin to floating window'
          }
        >
          <Pin
            className={`w-[17px] h-[17px] transition-transform duration-150 ${
              isPinned
                ? 'fill-[rgb(240,85,88)] text-[rgb(240,85,88)] -rotate-45'
                : 'rotate-0 hover:rotate-12'
            }`}
            strokeWidth={2.2}
          />
        </button>
      </div>

      {/* Centered, visually balanced title in remaining header space */}
      <div className="flex-1 min-w-0 text-center px-1">
        <h1 className="text-[16px] font-bold tracking-tight text-slate-800 truncate">
          Snippet Organizer
        </h1>
      </div>

      {/* Right side: 1. Plus, 2. Settings, 3. Close in exact order */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 1. Plus (+) button */}
        <button
          type="button"
          onClick={onNewSnippet}
          className="flex items-center justify-center w-9 h-9 rounded-2xl nm-icon-btn text-slate-700 hover:text-slate-900 cursor-pointer"
          aria-label="Add new snippet"
          title="New snippet"
        >
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.4} />
        </button>

        {/* 2. Settings (gear) button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center justify-center w-9 h-9 rounded-2xl nm-icon-btn text-slate-700 hover:text-slate-900 cursor-pointer"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="w-[18px] h-[18px]" strokeWidth={2.2} />
        </button>

        {/* 3. Close (X) button */}
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center justify-center w-9 h-9 rounded-2xl nm-icon-btn text-slate-700 hover:text-slate-900 cursor-pointer"
          aria-label="Close popup"
          title="Close"
        >
          <X className="w-[18px] h-[18px]" strokeWidth={2.4} />
        </button>
      </div>
    </header>
  );
};
