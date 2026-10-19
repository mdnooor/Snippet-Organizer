import React from 'react';
import { createRoot } from 'react-dom/client';
import { MainPopup } from './components/MainPopup';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const isFloating =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mode') === 'floating';

  const chromeApi = (globalThis as unknown as { chrome?: any }).chrome;

  // Defensive check: if popup.html is somehow opened while floating mode is active,
  // ensure the action popup is detached, trigger the floating window, and close this docked popup.
  if (!isFloating && chromeApi?.storage?.local?.get) {
    chromeApi.storage.local.get(['isFloatingMode'], (data: any) => {
      if (data?.isFloatingMode) {
        chromeApi.action?.setPopup?.({ popup: '' });
        chromeApi.runtime?.sendMessage?.({ type: 'OPEN_FLOATING_WINDOW' });
        if (typeof window !== 'undefined' && window.close) {
          window.close();
        }
      }
    });
  }

  if (isFloating && typeof window !== 'undefined') {
    // UI-WINDOW-LOCK-04: chrome.windows.create/update interpret width/height as the
    // OUTER window size INCLUDING the browser frame (caption bar + borders), while this
    // page requires a 480 x 600 CONTENT viewport. Report the measured frame delta
    // (window.outerWidth/Height − window.innerWidth/Height) once on load so the
    // service worker can compensate the outer window size; without it the fixed canvas
    // is clipped by the caption-bar height. No-ops outside the extension (web demo).
    if (chromeApi?.runtime?.sendMessage) {
      chromeApi.runtime
        .sendMessage({
          type: 'CALIBRATE_FLOATING_FRAME',
          delta: {
            width: Math.max(0, Math.round(window.outerWidth - window.innerWidth)),
            height: Math.max(0, Math.round(window.outerHeight - window.innerHeight)),
          },
        })
        ?.catch?.(() => {});
    }

    const reportFloatingPosition = () => {
      const left = window.screenLeft ?? window.screenX;
      const top = window.screenTop ?? window.screenY;
      if (
        typeof left === 'number' &&
        typeof top === 'number' &&
        !isNaN(left) &&
        !isNaN(top)
      ) {
        if (chromeApi?.runtime?.sendMessage) {
          chromeApi.runtime.sendMessage({
            type: 'SAVE_FLOATING_POSITION',
            position: { left, top },
          });
        }
      }
    };
    window.addEventListener('beforeunload', reportFloatingPosition);
    window.addEventListener('pagehide', reportFloatingPosition);
  }

  if (typeof document !== 'undefined') {
    // UI-WINDOW-LOCK-01/02/03: one fixed application viewport for both modes — docked
    // action popup and floating window — at exactly 480 x 600 px. No responsive
    // sizing; the floating window's size is enforced by the service worker
    // (chrome.windows), not by CSS.
    document.documentElement.style.width = '480px';
    document.documentElement.style.height = '600px';
    if (document.body) {
      document.body.style.width = '480px';
      document.body.style.height = '600px';
    }
  }

  createRoot(rootEl).render(
    <React.StrictMode>
      {/* Outer flat background: the fixed 480 x 600 application viewport. The p-[25px]
          outer padding keeps the flat background visible as an exact 25 px ring on all
          four sides around the raised popup (430 x 550), restoring the layered 3D look
          (UI-WINDOW-LOCK-03) without increasing the window size. */}
      <div className="glass-app-bg w-[480px] h-[600px] p-[25px] overflow-hidden select-none">
        <MainPopup isStandalone={true} isFloating={isFloating} />
      </div>
    </React.StrictMode>
  );
}
