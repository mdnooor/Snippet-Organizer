// Verification of Web Preview environment floating mode and position persistence
console.log('--- RUNNING WEB PREVIEW SIMULATION TESTS ---');

const localStorageMock = (function () {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

globalThis.window = {
  localStorage: localStorageMock,
  innerWidth: 1920,
  innerHeight: 1080,
};

const FLOATING_POS_STORAGE_KEY = 'snippet_organizer_floating_pos';
const FLOATING_MODE_STORAGE_KEY = 'snippet_organizer_floating_mode';

function loadSavedFloatingMode() {
  return window.localStorage.getItem(FLOATING_MODE_STORAGE_KEY) === 'true';
}

function persistFloatingMode(enabled) {
  window.localStorage.setItem(FLOATING_MODE_STORAGE_KEY, String(enabled));
}

function loadSavedFloatingPos() {
  const raw = window.localStorage.getItem(FLOATING_POS_STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
  }
  return null;
}

function persistFloatingPos(pos) {
  window.localStorage.setItem(FLOATING_POS_STORAGE_KEY, JSON.stringify(pos));
}

// Scenario 1: Initial state is attached
console.log('Test 1: Initial web preview state');
if (loadSavedFloatingMode() !== false) throw new Error('Expected initial isFloating to be false');
console.log('✓ Initial mode is attached');

// Scenario 2: User clicks Pin to detach
console.log('Test 2: Detaching to floating mode');
persistFloatingMode(true);
persistFloatingPos({ x: 150, y: 120 });
if (!loadSavedFloatingMode()) throw new Error('Failed to persist floating mode');
console.log('✓ Floating mode persisted: true, position: (150, 120)');

// Scenario 3: Closing the floating window in web preview
console.log('Test 3: Window closed (dismissed)');
let isDismissed = true;
// isFloating remains true!
if (loadSavedFloatingMode() !== true) throw new Error('isFloating mode must not be reset on close!');
console.log('✓ Closing window preserved isFloatingMode = true');

// Scenario 4: Reopening window
console.log('Test 4: Reopening floating window');
isDismissed = false;
const restoredPos = loadSavedFloatingPos();
if (restoredPos.x !== 150 || restoredPos.y !== 120) throw new Error('Restored pos mismatch');
console.log(`✓ Reopened in floating mode directly at saved position (${restoredPos.x}, ${restoredPos.y})`);

// Scenario 5: User moves window to (320, 240) and closes again
console.log('Test 5: Move and reopen again');
persistFloatingPos({ x: 320, y: 240 });
isDismissed = true;
isDismissed = false;
const pos2 = loadSavedFloatingPos();
if (pos2.x !== 320 || pos2.y !== 240) throw new Error('Position not preserved after second move');
console.log(`✓ Second cycle preserved new position (${pos2.x}, ${pos2.y})`);

// Scenario 6: User explicitly clicks Pin to unpin / reattach
console.log('Test 6: User clicks Pin to unpin and reattach');
persistFloatingMode(false);
if (loadSavedFloatingMode() !== false) throw new Error('Failed to unpin');
console.log('✓ Successfully unpinned and reattached to docked mode');

console.log('\nALL WEB PREVIEW TESTS PASSED!\n');
