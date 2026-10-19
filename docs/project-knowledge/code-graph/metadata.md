# Code Graph Metadata & Dependency Analysis — Snippet Organizer

**Snapshot Date: 2026-10-14** `[SOURCE-VERIFIED]`

---

## 1. Tooling Status & Environment Availability

| Tool | Status | Details |
|---|---|---|
| **Graphify** | UNAVAILABLE `[COMMAND-VERIFIED]` | Runtime binary not installed in the Google AI Studio container environment. |
| **GitNexus** | UNAVAILABLE `[COMMAND-VERIFIED]` | Runtime binary not installed; workspace is an untracked subdirectory within parent repo. |
| **Static Import Analyzer** | AVAILABLE & FRESH `[SOURCE-VERIFIED]` | Generated via static AST / import dependency analysis of all TypeScript modules in `src/`. |

---

## 2. Static Dependency Analysis Map `[SOURCE-VERIFIED]`

### Module Dependency Matrix

```
src/popup.tsx
├── src/components/MainPopup.tsx
└── src/index.css

src/settings.tsx
├── src/components/SettingsView.tsx
└── src/index.css

src/main.tsx
├── src/App.tsx
└── src/index.css

src/components/MainPopup.tsx
├── src/types.ts
├── src/db.ts
├── src/components/Header.tsx
├── src/components/SearchAndFilters.tsx
├── src/components/SnippetCard.tsx
├── src/components/Footer.tsx
├── src/components/SnippetPreviewModal.tsx
├── src/components/SnippetEditorModal.tsx
└── src/components/SettingsModal.tsx
    └── src/components/SettingsView.tsx

src/components/SnippetCard.tsx
├── src/types.ts
└── src/db.ts (stripHtml)

src/components/SearchAndFilters.tsx
└── src/types.ts

src/components/SnippetPreviewModal.tsx
└── src/types.ts

src/components/SnippetEditorModal.tsx
├── src/types.ts
└── lucide-react

src/components/SettingsView.tsx
├── src/types.ts
├── src/db.ts
└── lucide-react

src/db.ts
└── src/types.ts
```

### External Library Dependency Graph

- **`react` & `react-dom`**: Root framework, hooks (`useState`, `useEffect`, `useRef`, `useCallback`), `createPortal`.
- **`lucide-react`**: UI icon set used across all components.
- **`@tailwindcss/vite` & `tailwindcss`**: Global utility styling via `@import "tailwindcss";` in `src/index.css`.
- **`uuid`** / Web Crypto API: Unique ID generation.

---

## 3. Maintenance & Refresh Rules

- **Freshness Status**: `FRESH` as of 2026-10-14.
- **Trigger Conditions**: Update this dependency map whenever new components are added, existing files are moved/deleted, or new package dependencies are introduced in `package.json`.
