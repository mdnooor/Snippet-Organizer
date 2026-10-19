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

  return false;
});

function createNewFloatingWindow(sendResponse, savedPosition) {
  const url = chrome.runtime.getURL('popup.html?mode=floating');
  const createData = {
    url,
    type: 'popup',
    width: 712,
    height: 512,
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

// Track user-selected position when window is dragged/moved
chrome.windows?.onBoundsChanged?.addListener((win) => {
  chrome.storage?.local?.get(['floatingWindowId'], (data) => {
    if (data?.floatingWindowId === win.id && win.state === 'normal') {
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
