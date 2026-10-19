// Position validation helper
function isValidPosition(left, top) {
  return (
    typeof left === 'number' &&
    typeof top === 'number' &&
    !isNaN(left) &&
    !isNaN(top) &&
    left >= -2000 &&
    left <= 30000 &&
    top >= -2000 &&
    top <= 30000
  );
}

// --- Fixed floating-window size (UI-WINDOW-LOCK-01/02/03/04) ---
// One fixed application viewport for both modes: 480 x 600 px of CONTENT viewport
// (the raised popup sits inset on an exact 25 px flat-background ring).
// IMPORTANT (UI-WINDOW-LOCK-04): chrome.windows.create/update width/height — and the
// width/height reported by onBoundsChanged — are the OUTER window size INCLUDING the
// browser frame (caption bar + borders), not the content viewport. A window created at
// exactly 480 x 600 outer therefore shows less than 480 x 600 of content and clips the
// fixed layout (footer). The floating page reports its measured frame delta
// (window.outerWidth/Height − window.innerWidth/Height) once on load
// (CALIBRATE_FLOATING_FRAME); the outer window is then sized to layout + delta and the
// soft lock below enforces the compensated outer size. chrome.windows exposes no API to
// set the content size directly and no `resizable` option for extension popup windows
// (that is the separate Chrome-Apps app.window API), so this runtime calibration is the
// closest supported behavior; the delta magnitude is platform/theme dependent.
const FIXED_WINDOW_WIDTH = 480;
const FIXED_WINDOW_HEIGHT = 600;

// Calibrated frame delta (outer − content viewport) for the floating window; zero
// until the floating page reports its first calibration. Best-effort persisted in
// storage.session so a restarted service worker keeps enforcing the same outer size.
let floatingFrameDelta = { width: 0, height: 0 };
chrome.storage?.session?.get?.(['floatingFrameDelta'], (data) => {
  const d = data?.floatingFrameDelta;
  if (
    d &&
    Number.isFinite(d.width) &&
    Number.isFinite(d.height) &&
    d.width >= 0 &&
    d.height >= 0
  ) {
    floatingFrameDelta = { width: d.width, height: d.height };
  }
});

// Outer window size that yields the fixed 480 x 600 content viewport.
function compensatedOuterSize() {
  return {
    width: FIXED_WINDOW_WIDTH + floatingFrameDelta.width,
    height: FIXED_WINDOW_HEIGHT + floatingFrameDelta.height,
  };
}

let boundsDebounceTimer = null;

// Synchronize Chrome action popup state based on persisted isFloatingMode
function syncActionPopup() {
  chrome.storage?.local?.get(['isFloatingMode'], (data) => {
    if (data?.isFloatingMode) {
      // In floating mode, clicking the toolbar action fires chrome.action.onClicked
      chrome.action?.setPopup?.({ popup: '' });
    } else {
      // In attached mode, clicking the toolbar action opens popup.html docked
      chrome.action?.setPopup?.({ popup: 'popup.html' });
    }
  });
}

chrome.runtime.onInstalled?.addListener((details) => {
  console.info('[Snippet Organizer] Service worker installed:', details?.reason);
  syncActionPopup();
});

chrome.runtime.onStartup?.addListener(() => {
  console.info('[Snippet Organizer] Service worker startup');
  // Clean up any stale floating window id on browser startup (preserve saved position and mode)
  chrome.storage?.local?.remove('floatingWindowId');
  syncActionPopup();
});

// Run sync immediately on worker module load
syncActionPopup();

// When extension action icon is clicked and popup is empty (floating mode active)
chrome.action?.onClicked?.addListener(() => {
  chrome.storage?.local?.get(
    ['isFloatingMode', 'floatingWindowId', 'floatingWindowPosition'],
    (data) => {
      if (data?.isFloatingMode) {
        const existingId = data?.floatingWindowId;
        if (existingId) {
          chrome.windows.get(existingId, (win) => {
            if (!chrome.runtime.lastError && win) {
              chrome.windows.update(existingId, { focused: true });
              return;
            }
            createNewFloatingWindow(null, data?.floatingWindowPosition);
          });
        } else {
          createNewFloatingWindow(null, data?.floatingWindowPosition);
        }
      } else {
        chrome.action?.setPopup?.({ popup: 'popup.html' });
      }
    }
  );
});

// Also handle keyboard shortcut command _execute_action when popup is empty
chrome.commands?.onCommand?.addListener((command) => {
  if (command === '_execute_action') {
    chrome.storage?.local?.get(
      ['isFloatingMode', 'floatingWindowId', 'floatingWindowPosition'],
      (data) => {
        if (data?.isFloatingMode) {
          const existingId = data?.floatingWindowId;
          if (existingId) {
            chrome.windows.get(existingId, (win) => {
              if (!chrome.runtime.lastError && win) {
                chrome.windows.update(existingId, { focused: true });
                return;
              }
              createNewFloatingWindow(null, data?.floatingWindowPosition);
            });
          } else {
            createNewFloatingWindow(null, data?.floatingWindowPosition);
          }
        }
      }
    );
    return;
  }

  // SNIPPET-KBD-01: toggle-organizer (suggested Ctrl+Shift+Z, user-changeable at
  // chrome://extensions/shortcuts). Toggle semantics rely on the extension-owned
  // floating window lifecycle: if the window exists, close it (position preserved
  // by the SAVE_FLOATING_POSITION-style read below / onRemoved cleanup); otherwise
  // open it. A DOCKED action popup cannot be closed programmatically by Chrome, so
  // in docked mode this command can only OPEN it, and only where
  // chrome.action.openPopup() exists (Chrome 127+); that limitation is documented
  // in Settings → Shortcuts rather than worked around with polling or hidden windows.
  if (command === 'toggle-organizer') {
    chrome.storage?.local?.get(
      ['isFloatingMode', 'floatingWindowId', 'floatingWindowPosition'],
      (data) => {
        const existingId = data?.floatingWindowId;
        if (existingId) {
          chrome.windows.get(existingId, (win) => {
            if (!chrome.runtime.lastError && win) {
              // Window is open → toggle CLOSED (save position first, same as CLOSE_FLOATING_WINDOW)
              if (win.state === 'normal' && isValidPosition(win.left, win.top)) {
                chrome.storage.local.set({
                  floatingWindowPosition: {
                    left: Math.round(win.left),
                    top: Math.round(win.top),
                  },
                });
              }
              chrome.storage.local.remove('floatingWindowId', () => {
                chrome.windows.remove(existingId, () => {
                  void chrome.runtime.lastError;
                });
              });
              return;
            }
            // Stale id → treat as closed and open
            createNewFloatingWindow(null, data?.floatingWindowPosition);
          });
          return;
        }
        if (data?.isFloatingMode) {
          createNewFloatingWindow(null, data?.floatingWindowPosition);
          return;
        }
        // Docked mode: programmatic open only (Chrome closes docked popups on blur;
        // there is no API to close one).
        if (typeof chrome.action?.openPopup === 'function') {
          try {
            chrome.action.openPopup(() => void chrome.runtime.lastError);
          } catch {
            // openPopup unavailable/failed → documented limitation, no-op
          }
        }
      }
    );
  }
});

// Coordinate floating window management
chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  if (message?.type === 'ping') {
    sendResponse({ ok: true, type: 'pong' });
    return false;
  }

  if (message?.type === 'OPEN_FLOATING_WINDOW') {
    chrome.storage.local.set({ isFloatingMode: true });
    chrome.action?.setPopup?.({ popup: '' });

    chrome.storage.local.get(['floatingWindowId', 'floatingWindowPosition'], (data) => {
      const existingId = data?.floatingWindowId;
      if (existingId) {
        chrome.windows.get(existingId, (win) => {
          if (!chrome.runtime.lastError && win) {
            // Already open — focus existing window to prevent duplicates
            chrome.windows.update(existingId, { focused: true }, () => {
              sendResponse({ ok: true, action: 'focused', windowId: existingId });
            });
            return;
          }
          // Window was closed externally, create fresh window with saved position
          createNewFloatingWindow(sendResponse, data?.floatingWindowPosition);
        });
      } else {
        createNewFloatingWindow(sendResponse, data?.floatingWindowPosition);
      }
    });
    return true; // Keep message channel open for async response
  }

  // Explicit unpin / reattach back to docked popup mode
  if (message?.type === 'UNPIN_FLOATING_WINDOW') {
    chrome.storage.local.set({ isFloatingMode: false });
    chrome.action?.setPopup?.({ popup: 'popup.html' });

    chrome.storage.local.get(['floatingWindowId'], (data) => {
      const winId = message.windowId || data?.floatingWindowId;
      if (winId) {
        chrome.storage.local.remove('floatingWindowId', () => {
          chrome.windows.remove(winId, () => {
            if (typeof sendResponse === 'function') {
              sendResponse({ ok: true, action: 'unpinned' });
            }
          });
        });
      } else {
        chrome.storage.local.remove('floatingWindowId', () => {
          if (typeof sendResponse === 'function') {
            sendResponse({ ok: true, action: 'unpinned' });
          }
        });
      }
    });
    return true;
  }

  if (message?.type === 'CLOSE_FLOATING_WINDOW') {
    if (message.reattach) {
      chrome.storage.local.set({ isFloatingMode: false });
      chrome.action?.setPopup?.({ popup: 'popup.html' });
    }
    chrome.storage.local.get(['floatingWindowId'], (data) => {
      const winId = message.windowId || data?.floatingWindowId;
      if (winId) {
        // Record latest window position before closing
        chrome.windows.get(winId, (win) => {
          if (!chrome.runtime.lastError && win && win.state === 'normal') {
            if (isValidPosition(win.left, win.top)) {
              chrome.storage.local.set({
                floatingWindowPosition: {
                  left: Math.round(win.left),
                  top: Math.round(win.top),
                },
              });
            }
          }
          chrome.storage.local.remove('floatingWindowId', () => {
            chrome.windows.remove(winId, () => {
              if (typeof sendResponse === 'function') {
                sendResponse({ ok: true, action: 'closed' });
              }
            });
          });
        });
      } else {
        chrome.storage.local.remove('floatingWindowId', () => {
          if (typeof sendResponse === 'function') {
            sendResponse({ ok: true, action: 'closed' });
          }
        });
      }
    });
    return true;
  }

  if (message?.type === 'SAVE_FLOATING_POSITION' && message.position) {
    const { left, top } = message.position;
    if (isValidPosition(left, top)) {
      chrome.storage.local.set(
        {
          floatingWindowPosition: {
            left: Math.round(left),
            top: Math.round(top),
          },
        },
        () => {
          sendResponse({ ok: true });
        }
      );
    } else {
      sendResponse({ ok: false, error: 'Invalid coordinates' });
    }
    return true;
  }

  if (message?.type === 'GET_FLOATING_STATUS') {
    chrome.storage.local.get(['floatingWindowId', 'floatingWindowPosition', 'isFloatingMode'], (data) => {
      const isFloatingMode = Boolean(data?.isFloatingMode);
      const existingId = data?.floatingWindowId;
      if (existingId) {
        chrome.windows.get(existingId, (win) => {
          if (!chrome.runtime.lastError && win) {
            sendResponse({
              isFloating: true,
              isFloatingMode,
              windowId: existingId,
              position: data.floatingWindowPosition || null,
            });
          } else {
            chrome.storage.local.remove('floatingWindowId');
            sendResponse({
              isFloating: false,
              isFloatingMode,
              windowId: null,
              position: data.floatingWindowPosition || null,
            });
          }
        });
      } else {
        sendResponse({
          isFloating: false,
          isFloatingMode,
          windowId: null,
          position: data?.floatingWindowPosition || null,
        });
      }
    });
    return true;
  }

  // UI-WINDOW-LOCK-04: the floating page reports its measured frame delta
  // (outer − content viewport) so the outer window can be sized to layout + delta.
  if (message?.type === 'CALIBRATE_FLOATING_FRAME' && message.delta) {
    const width = Math.round(Number(message.delta.width));
    const height = Math.round(Number(message.delta.height));
    // Sanity bounds: browser frame chrome is small; reject absurd values.
    const valid =
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width >= 0 &&
      height >= 0 &&
      width <= 200 &&
      height <= 200;
    if (!valid) {
      sendResponse({ ok: false, error: 'Invalid frame delta' });
      return true;
    }
    floatingFrameDelta = { width, height };
    chrome.storage?.session?.set?.({ floatingFrameDelta }, () => {
      void chrome.runtime.lastError; // best-effort only
    });
    const outer = compensatedOuterSize();
    chrome.storage.local.get(['floatingWindowId'], (data) => {
      const winId = data?.floatingWindowId || sender?.tab?.windowId;
      if (winId) {
        chrome.windows.get(winId, (win) => {
          if (!chrome.runtime.lastError && win && win.state === 'normal') {
            if (win.width !== outer.width || win.height !== outer.height) {
              chrome.windows.update(
                winId,
                { width: outer.width, height: outer.height },
                () => {
                  void chrome.runtime.lastError; // window may be gone; delta stays cached
                  sendResponse({ ok: true, applied: true, outer });
                }
              );
              return;
            }
          }
          sendResponse({ ok: true, applied: false, outer });
        });
      } else {
        sendResponse({ ok: true, applied: false, outer });
      }
    });
    return true;
  }

  return false;
});

function createNewFloatingWindow(sendResponse, savedPosition) {
  const url = chrome.runtime.getURL('popup.html?mode=floating');
  // UI-WINDOW-LOCK-04: create at layout + calibrated frame delta so the CONTENT
  // viewport is the fixed 480 x 600. On the very first open (delta not yet known)
  // this is the raw 480 x 600 outer size; the page's calibration report then sizes
  // the window once more (a one-time snap, same soft-lock feel as resizing).
  const outer = compensatedOuterSize();
  const createData = {
    url,
    type: 'popup',
    width: outer.width,
    height: outer.height,
    focused: true,
  };

  // Restore saved position if valid
  if (savedPosition && isValidPosition(savedPosition.left, savedPosition.top)) {
    createData.left = Math.max(0, Math.round(savedPosition.left));
    createData.top = Math.max(0, Math.round(savedPosition.top));
  }

  chrome.windows.create(createData, (newWin) => {
    if (newWin?.id) {
      chrome.storage.local.set({
        floatingWindowId: newWin.id,
        isFloatingMode: true,
      });
      chrome.action?.setPopup?.({ popup: '' });
      if (typeof sendResponse === 'function') {
        sendResponse({ ok: true, action: 'created', windowId: newWin.id });
      }
    } else {
      if (typeof sendResponse === 'function') {
        sendResponse({ ok: false, error: 'Failed to create floating window' });
      }
    }
  });
}

// Track user-selected position when window is dragged/moved, and hold the window at
// its fixed size: any resize attempt (larger or smaller) snaps back immediately
// (UI-WINDOW-LOCK-01/02/03). chrome.windows has no `resizable` option for extension
// popup windows, so this is a soft lock — the closest supported behavior short of a
// different window architecture. The enforced target is the fixed 480 x 600 content
// viewport PLUS the calibrated frame delta (UI-WINDOW-LOCK-04), because onBoundsChanged
// reports OUTER bounds; clamping to the raw layout numbers would re-clip the content.
chrome.windows?.onBoundsChanged?.addListener((win) => {
  chrome.storage?.local?.get(['floatingWindowId'], (data) => {
    if (data?.floatingWindowId === win.id && win.state === 'normal') {
      // Fixed-size enforcement: restore the exact compensated outer size whenever the
      // reported size deviates (applied immediately, not debounced).
      const outer = compensatedOuterSize();
      if (win.width !== outer.width || win.height !== outer.height) {
        chrome.windows?.update?.(win.id, {
          width: outer.width,
          height: outer.height,
        });
      }
      if (isValidPosition(win.left, win.top)) {
        if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer);
        boundsDebounceTimer = setTimeout(() => {
          chrome.storage.local.set({
            floatingWindowPosition: {
              left: Math.round(win.left),
              top: Math.round(win.top),
            },
          });
        }, 200);
      }
    }
  });
});

// Clear active window ID when window is closed via OS controls,
// while PRESERVING isFloatingMode and saved floatingWindowPosition.
chrome.windows?.onRemoved?.addListener((windowId) => {
  chrome.storage?.local?.get(['floatingWindowId'], (data) => {
    if (data?.floatingWindowId === windowId) {
      chrome.storage.local.remove('floatingWindowId');
    }
  });
});
