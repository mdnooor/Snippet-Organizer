# Interaction Flows — Snippet Organizer

**Snapshot Date: 2026-10-14** `[SOURCE-VERIFIED]`

This document illustrates the primary user interaction flows, state transitions, and background events in Snippet Organizer using Mermaid sequence and state diagrams.

---

## 1. Search & Priority Ranking Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as SearchAndFilters Component
    participant Hook as MainPopup Debounce (150ms)
    participant Engine as filterAndRankSnippets (db.ts)
    participant DB as IndexedDB (snippets & categories)
    participant List as Snippet List View

    User->>UI: Types query in search bar (or presses Ctrl+K)
    UI->>Hook: Triggers setSearchQuery(value)
    Note over Hook: Wait 150ms debounce window
    Hook->>Engine: filterAndRankSnippets(snippets, query, categoriesMap, searchFields)
    Note over Engine: Partition candidates into tiers:<br/>1. Title matches (Scores 10, 11, 12)<br/>2. Content matches (Scores 20, 21, 22)<br/>3. Category matches (Scores 30, 31, 32)<br/>Tie-breaker: original library order
    Engine-->>Hook: Returns sorted Snippet[] array
    Hook->>List: setFilteredSnippets(rankedList)
    List-->>User: Renders ranked snippet cards with Title matches on top
```

---

## 2. Snippet Creation, Editing & Persistence Flow

```mermaid
sequenceDiagram
    actor User
    participant Header as Header (+) Button
    participant Modal as SnippetEditorModal
    participant DB as IndexedDB (snippets store)
    participant Main as MainPopup State

    User->>Header: Clicks (+) New Snippet
    Header->>Main: setEditorState({ isOpen: true, mode: 'new' })
    Main->>Modal: Opens with clean form and default category
    User->>Modal: Enters title, edits rich text with toolbar
    User->>Modal: Clicks "Save Snippet"
    Modal->>DB: createSnippet({ title, content, categoryId, isFavorite })
    DB-->>Main: Persists new record with unique ID and timestamps
    Main->>DB: getAllSnippets()
    DB-->>Main: Returns updated snippet library
    Main-->>User: Closes modal and highlights new snippet
```

---

## 3. One-Click Copy & Usage Tracking Flow

```mermaid
sequenceDiagram
    actor User
    participant Card as SnippetCard (Copy Button)
    participant DB as copySnippet() in db.ts
    participant Clip as Navigator Clipboard API
    participant Store as IndexedDB (snippets store)

    User->>Card: Clicks Copy icon
    Card->>DB: copySnippet(snippet)
    DB->>Clip: Attempts write([text/html, text/plain])
    alt HTML MIME Supported
        Clip-->>DB: Success
    else Fallback Needed
        DB->>Clip: writeText(plainText)
        Clip-->>DB: Success
    end
    DB->>Store: recordUsage(snippet.id) -> updates lastUsedAt
    DB-->>Card: Returns true
    Card-->>User: Transitions icon to emerald Checkmark for 1.5s
```

---

## 4. Move to Trash, 3-Day Retention & Restore Flow

```mermaid
stateDiagram-v2
    [*] --> ActiveLibrary: Snippet Created

    ActiveLibrary --> Trash: User clicks "Move to Trash" (deletedAt = Date.now())

    state Trash {
        [*] --> RetentionWindow: 3-Day (72h) Countdown Active
        RetentionWindow --> UserRestored: User clicks "Restore"
        RetentionWindow --> UserPermanentDelete: User clicks "Delete Forever" / "Empty Trash"
        RetentionWindow --> AutoPurge: Time > 72 hours (purgeExpiredTrash)
    }

    UserRestored --> ActiveLibrary: Restored with original or fallback category
    UserPermanentDelete --> [*]: Deleted permanently from IndexedDB
    AutoPurge --> [*]: Automatically deleted forever from IndexedDB
```

---

## 5. Docked to Floating Window Transition Flow

```mermaid
sequenceDiagram
    actor User
    participant Header as Header Pin Button
    participant Popup as MainPopup / popup.tsx
    participant SW as service-worker.js
    participant Storage as chrome.storage.local
    participant Win as Chrome Windows API

    User->>Header: Clicks Pin button
    Header->>Popup: Triggers handleTogglePin()
    Popup->>SW: chrome.runtime.sendMessage({ type: 'OPEN_FLOATING_WINDOW' })
    SW->>Storage: get(['floatingWindowId', 'floatingWindowPosition'])
    Storage-->>SW: Returns saved position { left, top } (or null on first use)
    SW->>Win: chrome.windows.create({ url, width: 480, height: 600, left, top })
    Win-->>SW: Creates window with windowId
    SW->>Storage: set({ floatingWindowId: newWin.id })
    SW-->>Popup: Returns { ok: true, action: 'created' }
    Popup->>Popup: window.close() (closes docked toolbar popup)
    Win-->>User: Renders detached window at last user-selected position

    opt User Moves Floating Window
        User->>Win: Drags window to new screen coordinates
        Win->>SW: onBoundsChanged(win)
        SW->>Storage: set({ floatingWindowPosition: { left, top } }) [debounced 200ms]
    end

    opt User Closes Floating Window
        User->>Win: Clicks OS Close or Header X
        Win->>SW: onRemoved(windowId)
        SW->>Storage: remove('floatingWindowId') (isFloatingMode remains true)
    end

    opt User Reopens Extension
        User->>SW: Clicks Chrome toolbar action (popup is empty)
        SW->>SW: chrome.action.onClicked()
        SW->>Storage: get(['floatingWindowPosition', 'isFloatingMode'])
        SW->>Win: chrome.windows.create({ left, top, width: 480, height: 600 })
        Win-->>User: Directly reopens at saved position without reattaching
    end

    opt User Explicitly Unpins Window
        User->>Header: Clicks Pin button inside floating window
        Header->>Popup: Triggers handleTogglePin()
        Popup->>SW: chrome.runtime.sendMessage({ type: 'UNPIN_FLOATING_WINDOW' })
        SW->>Storage: set({ isFloatingMode: false })
        SW->>SW: chrome.action.setPopup({ popup: 'popup.html' })
        SW->>Win: chrome.windows.remove(winId)
        Win-->>User: Window closes, attached toolbar mode restored
    end
```

---

## 6. Backup JSON Export & Import Flow

```mermaid
sequenceDiagram
    actor User
    participant Settings as SettingsView (Backup & Data Tab)
    participant DB as db.ts (exportAllData / importData)
    participant Store as IndexedDB

    rect rgb(240, 248, 255)
        Note over User,Store: Export Backup Flow
        User->>Settings: Clicks "Export JSON"
        Settings->>DB: exportAllData()
        DB->>Store: Reads snippets, categories, preferences
        Store-->>DB: Returns all data objects
        DB-->>Settings: Constructs BackupData envelope
        Settings-->>User: Triggers browser download of snippet-organizer-backup-[date].json
    end

    rect rgb(255, 248, 240)
        Note over User,Store: Import Backup Flow
        User->>Settings: Selects backup JSON file via file input
        Settings->>DB: importData(parsedJson)
        DB->>DB: Validates schema and version
        DB->>Store: Clears existing stores and bulk-inserts backup data
        Store-->>DB: Success
        DB-->>Settings: Triggers reload of snippets and categories
        Settings-->>User: Displays success notification and updates library
    end
```
