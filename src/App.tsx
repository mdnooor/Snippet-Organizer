/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { MainPopup } from './components/MainPopup';
import {
  Sparkles,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Download,
  HelpCircle,
  X,
  FolderArchive,
  Layers,
  Pin,
  Move,
  RotateCcw,
} from 'lucide-react';

const FLOATING_POS_STORAGE_KEY = 'snippet_organizer_floating_pos';
const FLOATING_MODE_STORAGE_KEY = 'snippet_organizer_floating_mode';

function loadSavedFloatingMode(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(FLOATING_MODE_STORAGE_KEY) === 'true';
    }
  } catch (e) {
    console.error('Failed to load saved floating mode', e);
  }
  return false;
}

function persistFloatingMode(enabled: boolean) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(FLOATING_MODE_STORAGE_KEY, String(enabled));
    }
  } catch (e) {
    console.error('Failed to persist floating mode', e);
  }
}

function loadSavedFloatingPos(): { x: number; y: number } | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(FLOATING_POS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.x === 'number' &&
          typeof parsed.y === 'number' &&
          !isNaN(parsed.x) &&
          !isNaN(parsed.y)
        ) {
          // Boundary safety: ensure window cannot be positioned completely off screen
          const maxX = Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1024) - 100);
          const maxY = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 768) - 100);
          return {
            x: Math.max(-500, Math.min(maxX, Math.round(parsed.x))),
            y: Math.max(-300, Math.min(maxY, Math.round(parsed.y))),
          };
        }
      }
    }
  } catch (e) {
    console.error('Failed to load saved floating position', e);
  }
  return null;
}

function persistFloatingPos(pos: { x: number; y: number }) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(FLOATING_POS_STORAGE_KEY, JSON.stringify(pos));
    }
  } catch (e) {
    console.error('Failed to persist floating position', e);
  }
}

export default function App() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [fitMode, setFitMode] = useState<'mockup' | 'compact'>('mockup');
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Floating window state
  const [isFloating, setIsFloating] = useState<boolean>(() => loadSavedFloatingMode());
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number }>(() => {
    return loadSavedFloatingPos() || { x: 30, y: 30 };
  });
  const currentFloatingPosRef = useRef(floatingPos);
  currentFloatingPosRef.current = floatingPos;

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const handleDownloadZip = () => {
    const link = document.createElement('a');
    link.href = '/snippet-organizer-extension.zip';
    link.download = 'snippet-organizer-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTogglePin = () => {
    // If in extension environment, chrome.windows takes care of it
    const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;
    if (chromeApi?.runtime?.sendMessage) {
      chromeApi.runtime.sendMessage({ type: isFloating ? 'UNPIN_FLOATING_WINDOW' : 'OPEN_FLOATING_WINDOW' }, () => {
        setIsFloating((prev) => {
          const next = !prev;
          persistFloatingMode(next);
          return next;
        });
      });
      return;
    }

    // In web preview environment: toggle draggable floating window
    setIsFloating((prev) => {
      const next = !prev;
      persistFloatingMode(next);
      if (next) {
        // Restore last user-selected position if one exists, otherwise default to initial offset
        const saved = loadSavedFloatingPos();
        if (saved) {
          setFloatingPos(saved);
        } else {
          setFloatingPos({ x: 30, y: 30 });
        }
      }
      return next;
    });
    setIsDismissed(false);
  };

  // Dragging logic for floating window in web preview
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFloating) return;
    // Don't drag if clicking buttons or inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.closest('input')
    ) {
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: floatingPos.x,
      initY: floatingPos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    const newPos = {
      x: dragStartRef.current.initX + deltaX,
      y: dragStartRef.current.initY + deltaY,
    };
    currentFloatingPosRef.current = newPos;
    setFloatingPos(newPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      // Persist the latest valid position immediately when movement ends
      persistFloatingPos(currentFloatingPosRef.current);
    }
  };

  return (
    <div className="glass-app-bg relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden select-none p-4 sm:p-8">
      {/* Decorative ambient background accents matching the red glass theme */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-rose-300/30 via-red-200/20 to-transparent blur-3xl" />
        <div className="absolute top-[20%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-bl from-rose-400/25 via-red-200/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-[15%] left-[15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-red-300/30 via-rose-200/20 to-transparent blur-3xl" />
      </div>

      {/* Top Floating Bar with Download Button and Controls */}
      <header className="relative z-20 mb-6 flex items-center flex-wrap justify-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/90 shadow-md text-xs text-slate-700 max-w-2xl">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <div className="w-5 h-5 rounded-lg bg-[rgb(240,85,88)] flex items-center justify-center text-white">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span>Snippet Organizer</span>
        </div>

        <span className="text-slate-300 hidden sm:inline">|</span>

        {/* Pin status badge / quick toggle */}
        <button
          type="button"
          onClick={handleTogglePin}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isFloating
              ? 'bg-[rgba(208,2,5,0.15)] text-[#9f0409] border border-[rgba(208,2,5,0.3)] shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title={isFloating ? 'Click to dock back to attached mode' : 'Click to detach as floating window'}
        >
          <Pin className={`w-3.5 h-3.5 ${isFloating ? 'fill-[rgb(240,85,88)] -rotate-45' : 'rotate-0'}`} />
          <span>{isFloating ? 'Floating Mode Active' : 'Attached Mode'}</span>
        </button>

        <span className="text-slate-300 hidden sm:inline">|</span>

        {/* Download Extension (.zip) button */}
        <button
          type="button"
          onClick={handleDownloadZip}
          className="flex items-center gap-1.5 px-3 py-1.5 nm-primary-raised text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
          title="Download Chrome Extension ZIP file"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Download Extension (.zip)</span>
        </button>

        {/* Install Guide Button */}
        <button
          type="button"
          onClick={() => setShowInstallGuide(true)}
          className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium px-2.5 py-1.5 nm-raised rounded-xl transition-all cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How to Install</span>
        </button>
      </header>

      {/* Floating Mode Guidance Banner (Visible only in floating mode) */}
      {isFloating && (
        <div className="relative z-20 mb-4 flex items-center gap-3 bg-blue-50/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-blue-200/80 shadow-xs text-xs text-blue-800 animate-in fade-in duration-150">
          <Move className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Detached Floating Window:</strong> Click and drag anywhere around the window to reposition it. Click the pin icon in the header to dock it back.
          </span>
          <button
            type="button"
            onClick={() => {
              const defaultPos = { x: 30, y: 30 };
              setFloatingPos(defaultPos);
              currentFloatingPosRef.current = defaultPos;
              persistFloatingPos(defaultPos);
            }}
            className="flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 nm-raised px-2.5 py-1 rounded-xl ml-auto shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Position</span>
          </button>
        </div>
      )}

      {/* Main Popup Container */}
      <main className="relative z-10 w-full flex items-center justify-center">
        {isDismissed ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-white/80 shadow-xl text-center max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-10 h-10 text-blue-600 mb-3" />
            <h2 className="text-base font-bold text-slate-800 mb-1">
              {isFloating ? 'Floating Window Closed' : 'Popup Closed'}
            </h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {isFloating
                ? 'The floating window was closed. Opening the extension will restore it directly at its saved position.'
                : 'In Chrome, clicking the header close button dismisses the popup window (window.close()).'}
            </p>
            <button
              type="button"
              onClick={() => setIsDismissed(false)}
              className="px-4 py-2 text-xs font-semibold text-white nm-primary-raised rounded-xl transition-all cursor-pointer"
            >
              {isFloating ? 'Reopen Floating Window' : 'Reopen Popup'}
            </button>
          </div>
        ) : (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={
              isFloating
                ? {
                    transform: `translate3d(${floatingPos.x}px, ${floatingPos.y}px, 0)`,
                    cursor: isDragging ? 'grabbing' : 'default',
                    touchAction: 'none',
                  }
                : undefined
            }
            className={`transition-shadow duration-150 ${
              isFloating
                ? 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] ring-2 ring-blue-500/30 rounded-[28px]'
                : ''
            }`}
          >
            <MainPopup
              onClose={() => setIsDismissed(true)}
              isStandalone={fitMode === 'compact'}
              isFloating={isFloating}
              onTogglePin={handleTogglePin}
            />
          </div>
        )}
      </main>

      {/* Subtle Bottom Note */}
      <footer className="relative z-10 mt-6 text-center text-[11px] text-slate-500 flex items-center gap-2">
        <span>Snippet Organizer Chrome Extension</span>
        <span>·</span>
        <button
          type="button"
          onClick={() => setShowInstallGuide(true)}
          className="text-[#b91c1c] hover:underline font-medium cursor-pointer"
        >
          View browser installation instructions
        </button>
      </footer>

      {/* Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg glass-clay-surface p-6 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-[#9f0409]" />
                <h3 className="text-base font-bold text-slate-800">
                  How to Install in Google Chrome
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto text-xs text-slate-600 leading-relaxed">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(208,2,5,0.12)] text-[#9f0409] font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Download and extract the extension ZIP</p>
                  <p className="text-slate-500 mt-0.5">
                    Click the <strong>"Download Extension (.zip)"</strong> button above or download{' '}
                    <a
                      href="/snippet-organizer-extension.zip"
                      download="snippet-organizer-extension.zip"
                      className="text-blue-600 underline font-medium"
                    >
                      snippet-organizer-extension.zip
                    </a>
                    . Unzip / extract it to a convenient folder on your computer.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(208,2,5,0.12)] text-[#9f0409] font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Open the Extensions page in Chrome</p>
                  <p className="text-slate-500 mt-0.5">
                    In Google Chrome (or Edge, Brave, Opera, Arc), type{' '}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">
                      chrome://extensions
                    </code>{' '}
                    in your address bar and press Enter.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(208,2,5,0.12)] text-[#9f0409] font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Turn on "Developer mode"</p>
                  <p className="text-slate-500 mt-0.5">
                    Toggle the <strong>Developer mode</strong> switch in the upper-right corner of the Extensions page.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgba(208,2,5,0.12)] text-[#9f0409] font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Click "Load unpacked"</p>
                  <p className="text-slate-500 mt-0.5">
                    Click the <strong>Load unpacked</strong> button in the top-left toolbar, then select the extracted extension folder (the folder containing <code className="bg-slate-100 px-1 py-0.5 rounded">manifest.json</code>).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Done! Pin Snippet Organizer & Use Floating Mode</p>
                  <p className="text-slate-500 mt-0.5">
                    Click the puzzle piece icon in Chrome, pin <strong>Snippet Organizer</strong>, and click it to open. Click the <strong>Pin icon</strong> beside the logo anytime to detach it into an independent floating window!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDownloadZip}
                className="flex items-center gap-1.5 px-4 py-2 bg-[rgba(208,2,5,0.6)] hover:bg-[rgba(208,2,5,0.45)] text-white font-semibold rounded-xl text-xs shadow-sm shadow-red-500/30 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Download Extension (.zip)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
