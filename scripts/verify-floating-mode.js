// Automated verification test for floating window persistence and re-attachment prevention
import fs from 'fs';
import vm from 'vm';

console.log('--- RUNNING FLOATING MODE RUNTIME VERIFICATION SUITE ---');

// Mock chrome environment
class MockChrome {
  constructor() {
    this.storageData = {};
    this.windows = new Map();
    this.nextWindowId = 100;
    this.actionPopup = 'popup.html';
    this.listeners = {
      message: [],
      actionClicked: [],
      windowsRemoved: [],
      windowsBoundsChanged: [],
      command: [],
      installed: [],
      startup: [],
    };

    this.runtime = {
      getURL: (path) => `chrome-extension://dummy-id/${path}`,
      onInstalled: { addListener: (cb) => this.listeners.installed.push(cb) },
      onStartup: { addListener: (cb) => this.listeners.startup.push(cb) },
      onMessage: { addListener: (cb) => this.listeners.message.push(cb) },
      lastError: null,
    };

    this.action = {
      setPopup: (details, cb) => {
        this.actionPopup = details.popup;
        if (cb) cb();
      },
      getPopup: (details, cb) => cb(this.actionPopup),
      onClicked: { addListener: (cb) => this.listeners.actionClicked.push(cb) },
    };

    this.commands = {
      onCommand: { addListener: (cb) => this.listeners.command.push(cb) },
    };

    this.storage = {
      local: {
        get: (keys, cb) => {
          const res = {};
          if (Array.isArray(keys)) {
            keys.forEach((k) => { res[k] = this.storageData[k]; });
          } else if (typeof keys === 'string') {
            res[keys] = this.storageData[keys];
          } else {
            Object.assign(res, this.storageData);
          }
          cb(res);
        },
        set: (items, cb) => {
          Object.assign(this.storageData, items);
          if (cb) cb();
        },
        remove: (keys, cb) => {
          const arr = Array.isArray(keys) ? keys : [keys];
          arr.forEach((k) => delete this.storageData[k]);
          if (cb) cb();
        },
      },
    };

    this.windows = {
      create: (data, cb) => {
        const id = ++this.nextWindowId;
        const win = {
          id,
          left: data.left !== undefined ? data.left : 100,
          top: data.top !== undefined ? data.top : 100,
          width: data.width || 712,
          height: data.height || 512,
          state: 'normal',
        };
        this.windowsMap.set(id, win);
        if (cb) cb(win);
      },
      get: (id, cb) => {
        const win = this.windowsMap.get(id);
        if (!win) {
          this.runtime.lastError = { message: 'Window not found' };
          cb(null);
          this.runtime.lastError = null;
        } else {
          cb(win);
        }
      },
      update: (id, updateInfo, cb) => {
        const win = this.windowsMap.get(id);
        if (win) {
          Object.assign(win, updateInfo);
          if (cb) cb(win);
        } else {
          this.runtime.lastError = { message: 'Window not found' };
          if (cb) cb(null);
          this.runtime.lastError = null;
        }
      },
      remove: (id, cb) => {
        this.windowsMap.delete(id);
        this.listeners.windowsRemoved.forEach((fn) => fn(id));
        if (cb) cb();
      },
      onBoundsChanged: { addListener: (cb) => this.listeners.windowsBoundsChanged.push(cb) },
      onRemoved: { addListener: (cb) => this.listeners.windowsRemoved.push(cb) },
    };
    this.windowsMap = new Map();
  }

  sendMessage(message) {
    return new Promise((resolve) => {
      let responded = false;
      for (const listener of this.listeners.message) {
        const keepOpen = listener(message, {}, (res) => {
          responded = true;
          resolve(res);
        });
        if (!keepOpen && !responded) {
          // Synchronous or not handled
        }
      }
      if (!responded) {
        setTimeout(() => resolve(null), 10);
      }
    });
  }

  clickExtensionAction() {
    this.listeners.actionClicked.forEach((fn) => fn({ id: 1 }));
  }

  moveWindow(id, left, top) {
    const win = this.windowsMap.get(id);
    if (win) {
      win.left = left;
      win.top = top;
      this.listeners.windowsBoundsChanged.forEach((fn) => fn(win));
    }
  }
}

// Load service worker code into mock context
const swCode = fs.readFileSync('service-worker.js', 'utf8');
const mockChrome = new MockChrome();
const sandbox = {
  chrome: mockChrome,
  console,
  setTimeout,
  clearTimeout,
};

vm.createContext(sandbox);
vm.runInContext(swCode, sandbox);

async function runTests() {
  console.log('Test 1: Initial state');
  // Initially, action popup is popup.html (attached)
  if (mockChrome.actionPopup !== 'popup.html') {
    throw new Error(`Expected initial popup to be 'popup.html', got '${mockChrome.actionPopup}'`);
  }
  console.log('✓ Initial actionPopup is popup.html');

  console.log('Test 2: Detaching popup by clicking Pin');
  const openRes = await mockChrome.sendMessage({ type: 'OPEN_FLOATING_WINDOW' });
  if (!openRes?.ok || openRes.action !== 'created') {
    throw new Error(`Failed to open floating window: ${JSON.stringify(openRes)}`);
  }
  const win1Id = openRes.windowId;
  if (!mockChrome.storageData.isFloatingMode) {
    throw new Error('isFloatingMode should be true in storage');
  }
  if (mockChrome.actionPopup !== '') {
    throw new Error(`actionPopup should be '' in floating mode, got '${mockChrome.actionPopup}'`);
  }
  console.log(`✓ Floating window ${win1Id} created, isFloatingMode = true, actionPopup = ''`);

  console.log('Test 3: Moving floating window to (420, 260)');
  mockChrome.moveWindow(win1Id, 420, 260);
  // Wait 250ms for debounce timer in onBoundsChanged
  await new Promise((r) => setTimeout(r, 250));
  if (
    mockChrome.storageData.floatingWindowPosition?.left !== 420 ||
    mockChrome.storageData.floatingWindowPosition?.top !== 260
  ) {
    throw new Error(`Saved position mismatch: ${JSON.stringify(mockChrome.storageData.floatingWindowPosition)}`);
  }
  console.log('✓ Position (420, 260) saved in storage');

  console.log('Test 4: Closing the floating window using OS/Close button');
  // Simulating closing the window
  await new Promise((resolve) => {
    mockChrome.windows.remove(win1Id, resolve);
  });
  if (mockChrome.storageData.floatingWindowId) {
    throw new Error('floatingWindowId should be cleaned up on close');
  }
  if (!mockChrome.storageData.isFloatingMode) {
    throw new Error('CORE INVARIANT VIOLATION: isFloatingMode MUST NOT be reset to false on window close!');
  }
  if (mockChrome.actionPopup !== '') {
    throw new Error('CORE INVARIANT VIOLATION: actionPopup must remain empty so clicking toolbar action triggers onClicked!');
  }
  console.log('✓ Closed window: floatingWindowId removed, but isFloatingMode and actionPopup maintained!');

  console.log('Test 5: Reopening extension by clicking Chrome action icon');
  mockChrome.clickExtensionAction();
  // Wait a tick for async window creation
  await new Promise((r) => setTimeout(r, 50));
  const newWinId = mockChrome.storageData.floatingWindowId;
  if (!newWinId) {
    throw new Error('Expected floatingWindowId to be populated with new window');
  }
  const newWin = mockChrome.windowsMap.get(newWinId);
  if (!newWin) {
    throw new Error('Floating window was not created in mock Chrome');
  }
  if (newWin.left !== 420 || newWin.top !== 260) {
    throw new Error(`Expected window to reopen at (420, 260), but got (${newWin.left}, ${newWin.top})`);
  }
  if (newWin.width !== 712 || newWin.height !== 512) {
    throw new Error(`Expected dimensions 712x512, got ${newWin.width}x${newWin.height}`);
  }
  console.log(`✓ Reopened directly as floating window ${newWinId} at saved position (420, 260) and 712x512!`);

  console.log('Test 6: Repeated close/reopen cycle with new position (650, 310)');
  mockChrome.moveWindow(newWinId, 650, 310);
  await new Promise((r) => setTimeout(r, 250));
  // Close again
  await new Promise((resolve) => mockChrome.windows.remove(newWinId, resolve));
  // Click action again
  mockChrome.clickExtensionAction();
  await new Promise((r) => setTimeout(r, 50));
  const win3Id = mockChrome.storageData.floatingWindowId;
  const win3 = mockChrome.windowsMap.get(win3Id);
  if (win3.left !== 650 || win3.top !== 310) {
    throw new Error(`Expected window to reopen at (650, 310), got (${win3.left}, ${win3.top})`);
  }
  console.log(`✓ Repeated cycle verified: reopened at new position (650, 310)`);

  console.log('Test 7: Explicit unpin action (user clicks pin control to reattach)');
  const unpinRes = await mockChrome.sendMessage({ type: 'UNPIN_FLOATING_WINDOW' });
  if (!unpinRes?.ok || unpinRes.action !== 'unpinned') {
    throw new Error(`Expected unpinned response, got ${JSON.stringify(unpinRes)}`);
  }
  if (mockChrome.storageData.isFloatingMode) {
    throw new Error('isFloatingMode should be false after unpin');
  }
  if (mockChrome.actionPopup !== 'popup.html') {
    throw new Error(`actionPopup should be restored to 'popup.html', got '${mockChrome.actionPopup}'`);
  }
  if (mockChrome.windowsMap.has(win3Id)) {
    throw new Error('Floating window should be closed on unpin');
  }
  console.log('✓ Successfully unpinned: isFloatingMode = false, actionPopup = "popup.html", window closed');

  console.log('\nALL 7 RUNTIME VERIFICATION TESTS PASSED PERFECTLY!\n');
}

runTests().catch((e) => {
  console.error('VERIFICATION FAILED:', e);
  process.exit(1);
});
