export interface Snippet {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  deletedAt: number | null;
  version: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface CategoryWithCount extends Category {
  snippetCount: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UIShortcutBindings {
  /** Focus the search input (extension-UI only). SNIPPET-KBD-02 */
  focusSearch: string;
  /** Copy the active snippet (extension-UI only). SNIPPET-KBD-02 */
  copy: string;
  /** Clear the search query from the list context (extension-UI only). SNIPPET-KBD-02 */
  clearSearch: string;
  // SNIPPET-KBD-02: navigation is fixed to Arrow Up / Arrow Down (not rebindable);
  // the SNIPPET-KBD-01 navigateDown/navigateUp (Shift / Ctrl+Shift) keys and the
  // Space-copy default were removed. The global toggle is not stored here (it
  // lives in Chrome's own commands configuration).
}

export interface Preferences {
  theme?: ThemeMode;
  favoriteConfirmationEnabled: boolean;
  searchFields: {
    title: boolean;
    content: boolean;
    category: boolean;
  };
  autoSyncEnabled: boolean;
  quickCopyOnClick?: boolean;
  showCopyNotification?: boolean;
  defaultCategoryId?: string;
  defaultFilter?: FilterType;
  customShortcut?: string;
  /** SNIPPET-KBD-01: user-configurable in-UI snippet-list shortcut bindings */
  uiShortcuts?: UIShortcutBindings;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  appName: string;
  snippets: Snippet[];
  categories: Category[];
  preferences: Preferences;
}

export type FilterType = 'all' | 'favorites' | 'recent' | string;
