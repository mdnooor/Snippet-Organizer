# Integrations & APIs — Snippet Organizer

**Snapshot Date: 2026-10-14** `[SOURCE-VERIFIED]`

This document describes the external APIs, Chrome extension interfaces, web capabilities, permissions, and fallback mechanisms utilized in Snippet Organizer.

---

## 1. Extension Manifest & Permissions

The extension is declared under **Chrome Manifest V3** (`manifest.json`) `[SOURCE-VERIFIED]`.

```json
{
  "manifest_version": 3,
  "name": "Snippet Organizer",
  "version": "0.1.0",
  "description": "Personal snippet and productivity organizer.",
  "action": {
    "default_title": "Snippet Organizer",
    "default_popup": "popup.html"
  },
  "options_ui": {
    "page": "settings.html",
    "open_in_tab": true
  },
  "permissions": ["storage", "identity"],
  "commands": {
    "_execute_action": {
      "description": "Open the Snippet Organizer popup"
    }
  },
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  }
}
```

### Permissions Analysis `[SOURCE-VERIFIED]`

| Permission | Declared In Manifest | Actually Utilized In Code | Purpose |
|---|---|---|---|
| `storage` | YES | YES | Allows `chrome.storage.local` to store `floatingWindowId` and mirror user preferences |
| `identity` | YES | NOT USED CURRENTLY | Declared in base manifest; no active OAuth or identity API calls exist in the codebase `[SOURCE-VERIFIED]` |
| Host Permissions | NONE | NONE | Zero host permissions requested; extension makes no external HTTP network requests |

---

## 2. Chrome Extension APIs

### A. Window Management (`chrome.windows`)
- **Usage**: Used exclusively in `service-worker.js` to create and control the detached floating popup window.
- **Methods**:
  - `chrome.windows.create({ url, type: 'popup', width, height, focused: true })` with `width/height = compensatedOuterSize()` — the fixed 480 × 600 content viewport (shared with docked mode; ADR-002 Amendment 3, UI-WINDOW-LOCK-01/02/03/04) PLUS the calibrated frame delta, because `chrome.windows` sizes are outer dimensions including the browser frame
  - `chrome.windows.update(windowId, { width, height })` — two uses: (1) fixed-size enforcement from the `onBoundsChanged` listener whenever the floating window's reported outer size deviates from the compensated target (480 × 600 + frame delta) in either direction (soft lock; `chrome.windows` has no `resizable` option or content-size API); (2) one-time resize from the `CALIBRATE_FLOATING_FRAME` handler when the floating page reports a new frame delta
  - `chrome.windows.get(windowId, callback)`
  - `chrome.windows.update(windowId, { focused: true }, callback)`
  - `chrome.windows.remove(windowId, callback)`
  - `chrome.windows.onRemoved.addListener(callback)`: Clears stale `floatingWindowId` when closed by native OS controls.

### B. Storage API (`chrome.storage.local`)
- **Usage**:
  - Storing active `floatingWindowId` to prevent duplicate floating windows.
  - Write-through mirror of `user_preferences` from IndexedDB.
- **Methods**:
  - `chrome.storage.local.get(keys, callback)`
  - `chrome.storage.local.set(items, callback)`
  - `chrome.storage.local.remove(keys, callback)`

### C. Runtime Messaging (`chrome.runtime`)
- **Usage**: Communicates between UI components (`MainPopup.tsx`) and the background service worker (`service-worker.js`).
- **Methods**:
  - `chrome.runtime.sendMessage({ type: 'OPEN_FLOATING_WINDOW' })`
  - `chrome.runtime.sendMessage({ type: 'CLOSE_FLOATING_WINDOW' })`
  - `chrome.runtime.sendMessage({ type: 'GET_FLOATING_STATUS' })`
  - `chrome.runtime.getURL('popup.html?mode=floating')`

---

## 3. Web Platform APIs

### A. IndexedDB API
- **Database**: `snippet-organizer` (version `1`)
- **Object Stores**: `snippets`, `categories`, `preferences`
- **Driver**: Pure native browser IndexedDB implementation in `src/db.ts` without heavy external ORM dependencies.
- **Transactions**: Read-write transactions are scoped strictly to the accessed stores and committed safely.

### B. Async Clipboard API
- **Function**: `copySnippet(snippet: Snippet)` in `src/db.ts`
- **Behavior**:
  - Attempts `navigator.clipboard.write([new ClipboardItem({ 'text/html': ..., 'text/plain': ... })])` for rich text paste support.
  - Gracefully falls back to `navigator.clipboard.writeText(plainText)` if HTML MIME typing is unsupported or blocked.
  - Automatically updates `snippet.lastUsedAt` upon successful copy.

### C. DOMParser & HTML Sanitation
- **Function**: `cleanHtmlFormatting(html: string)` in `src/components/SnippetEditorModal.tsx`
- **Behavior**: Converts pasted headings, blockquotes, and complex inline styles to clean standard paragraphs while strictly preserving hyperlinks (`<a>` tags) with valid destination URLs.

---

## 4. Fallback Behavior in Web Preview Environments

When running outside a Chrome Extension runtime (e.g. in the standard Vite dev server or web container):
1. `globalThis.chrome?.runtime?.sendMessage` is guarded; calls will not crash.
2. In `src/App.tsx`, clicking the pin button activates an in-memory draggable floating window simulation with mouse/touch drag handlers.
3. IndexedDB operates identically in both web and extension environments, ensuring local testing is 100% faithful to the packaged extension.
