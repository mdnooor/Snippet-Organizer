import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Palette,
  FolderTree,
  Keyboard,
  HardDrive,
  Info,
  Check,
  Plus,
  Trash2,
  Pencil,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  AlertCircle,
  ExternalLink,
  Layers,
  Search,
  Sparkles,
  CheckCircle2,
  X,
  Clock,
  Github,
  Mail,
  User,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import {
  Preferences,
  Category,
  CategoryWithCount,
  ThemeMode,
  FilterType,
  BackupData,
  Snippet,
  UIShortcutBindings,
} from '../types';
import {
  DEFAULT_UI_SHORTCUTS,
  formatShortcut,
  normalizeEventKey,
  parseShortcut,
  validateShortcut,
} from '../shortcutUtils';
import {
  getPreferences,
  savePreferences,
  resetPreferences,
  getCategoriesWithCount,
  createCategory,
  updateCategory,
  deleteCategory,
  exportAllData,
  importData,
  resetToDefaultData,
  getTrashedSnippets,
  restoreSnippet,
  restoreAllTrashedSnippets,
  permanentlyDeleteSnippet,
  emptyTrash,
  getAllSnippets,
  getAllSnippetsIncludingTrash,
  getCategories,
  readAllLocalStateForRestore,
  applyRestoreWritePlan,
  updateSnippet,
  deleteSnippet,
  stripHtml,
  TRASH_RETENTION_MS,
} from '../db';
import { createDriveService, type SnapshotBrowserEntry } from '../gdrive/snapshotStore';
import { createAuthController, type AuthController } from '../gdrive/auth';
import { createCloudBackup } from '../gdrive/backup';
import { DRIVE_RATE_LIMIT_403_REASONS } from '../gdrive/driveClient';
import {
  createConnectionProbe,
  createChromeConnectionIntentStore,
  USER_DISCONNECTED_DRIVE_MESSAGE,
  type DriveAccountIdentity,
  type DriveConnectionState,
} from '../gdrive/connection';
import {
  buildMergePlan,
  buildReplacePlan,
  buildRestoreCheckpoint,
  executeRestore,
  planRestoreExpectations,
  previewRestoreFromParsed,
  type RestoreCheckpoint,
  type RestoreMode,
} from '../gdrive/restore';
import type { ConflictResolutionChoice, RestorePreviewConflict, RestorePreview } from '../gdrive/conflict';
import type { CloudSnapshotEnvelope } from '../gdrive/types';

interface SettingsViewProps {
  onClose?: () => void;
  isModal?: boolean;
  onDataChange?: () => void;
}

type TabKey = 'general' | 'categories' | 'shortcuts' | 'data' | 'trash' | 'about';

const PRESET_COLORS = [
  '#4f46e5', // indigo
  '#0d9488', // teal
  '#d97706', // amber
  '#64748b', // slate
  '#e11d48', // rose
  '#059669', // emerald
  '#7c3aed', // violet
  '#0284c7', // sky
  '#ea580c', // orange
  '#475569', // cool gray
];

/** GD-04: local-time display of a snapshot instant; tolerates missing/invalid values. */
const formatDriveTimestamp = (iso: string | null): string => {
  if (!iso) return 'Unknown time';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
};

/** GD-04: human-readable size for snapshot rows. */
const formatDriveSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// GD-05 — cloud restore flow state. The preview stage is read-only: canceling or
// leaving it can never mutate local data; writes happen only in executeRestore.
type RestoreFlowStage = 'preview' | 'applying';

interface RestoreFlowState {
  entry: SnapshotBrowserEntry;
  stage: RestoreFlowStage;
  envelope: CloudSnapshotEnvelope;
  preview: RestorePreview;
  checkpoint: RestoreCheckpoint;
  mode: RestoreMode;
  choices: Record<string, ConflictResolutionChoice>;
  applyPreferences: boolean;
  replaceConfirmed: boolean;
  resultMessage: string | null;
}

const RESTORE_CHOICE_LABELS: Record<ConflictResolutionChoice, string> = {
  'keep-local': 'Keep local',
  'take-incoming': 'Use backup',
  'keep-both': 'Keep both',
};

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose, isModal = false, onDataChange }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Status toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  // MOTION-01: toast exit — a short fade-out runs before unmount so dismissal
  // feels smooth; repeated toasts restart cleanly (no overlap possible, the
  // banner is a single element re-keyed by its message).
  const [toastLeaving, setToastLeaving] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastExitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismissToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastLeaving(true);
    if (toastExitTimeoutRef.current) clearTimeout(toastExitTimeoutRef.current);
    toastExitTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastLeaving(false);
    }, 170);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (toastExitTimeoutRef.current) clearTimeout(toastExitTimeoutRef.current);
    setToastLeaving(false);
    setToastMessage(message);
    setToastType(type);
    toastTimeoutRef.current = setTimeout(() => {
      dismissToast();
    }, 3000);
  };

  // SNIPPET-KBD-01: the actual browser-global binding (from chrome.commands, may be
  // user-customized at chrome://extensions/shortcuts); falls back to the declared default.
  const [globalCommandShortcut, setGlobalCommandShortcut] = useState<string | null>(null);
  useEffect(() => {
    try {
      const chromeApi = (
        globalThis as unknown as {
          chrome?: { commands?: { getAll?: (cb: (cmds: Array<{ name: string; shortcut?: string }>) => void) => void } };
        }
      ).chrome;
      chromeApi?.commands?.getAll?.((cmds) => {
        const toggle = cmds?.find((c) => c.name === 'toggle-organizer');
        if (toggle?.shortcut) setGlobalCommandShortcut(toggle.shortcut);
      });
    } catch {
      // Non-extension environment (dev server): keep the declared default.
    }
  }, []);

  // SNIPPET-KBD-02: in-extension capture flow for the customizable bindings.
  // Modifiers accumulate; capture completes on the first non-modifier key. Any
  // rejected attempt (plain letter, standalone Shift, modifier-only release,
  // Escape-reserved, conflict) either shows a toast and keeps capturing or
  // cancels quietly on release without saving. Ctrl/Alt/Meta alone never
  // complete on keydown so combos like Ctrl+J can be captured.
  const [capturingAction, setCapturingAction] = useState<keyof UIShortcutBindings | null>(null);
  const captureModsRef = useRef({ ctrl: false, alt: false, shift: false, meta: false });
  useEffect(() => {
    if (!capturingAction) return;
    captureModsRef.current = { ctrl: false, alt: false, shift: false, meta: false };
    const MOD_KEYS = ['Control', 'Alt', 'Shift', 'Meta'];
    const current = () => preferences?.uiShortcuts ?? DEFAULT_UI_SHORTCUTS;
    const othersFor = (action: keyof UIShortcutBindings) =>
      (Object.keys(current()) as Array<keyof UIShortcutBindings>)
        .filter((k) => k !== action)
        .map((k) => current()[k]);
    const modsToString = (m: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }) =>
      `${m.ctrl ? 'Ctrl+' : ''}${m.alt ? 'Alt+' : ''}${m.meta ? 'Meta+' : ''}${m.shift ? 'Shift+' : ''}`.replace(/\+$/, '');
    const tryComplete = (binding: string, cancelOnFail: boolean) => {
      const result = validateShortcut(binding, capturingAction, othersFor(capturingAction));
      if (!result.ok || !result.normalized) {
        if (cancelOnFail) setCapturingAction(null);
        else showToast(result.error ?? 'Unsupported shortcut', 'error'); // keep capturing
        return;
      }
      void handleUpdatePreferences({
        uiShortcuts: { ...current(), [capturingAction]: result.normalized },
      });
      setCapturingAction(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setCapturingAction(null);
        return;
      }
      if (!MOD_KEYS.includes(e.key)) {
        tryComplete(
          `${modsToString(captureModsRef.current)}+${normalizeEventKey(e.key)}`.replace(/^\+/, ''),
          false
        );
        return;
      }
      // Modifier keydown: accumulate. (A standalone Shift attempt fails
      // validation with a toast — Shift is reserved for typing.)
      captureModsRef.current = {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
      };
    };
    const onKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!MOD_KEYS.includes(e.key)) return;
      if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return; // still holding others
      const mods = captureModsRef.current;
      if (mods.ctrl || mods.alt || mods.shift || mods.meta) {
        tryComplete(modsToString(mods), true);
      } else {
        setCapturingAction(null); // nothing captured — cancel quietly
      }
    };
    // Capture phase so no other window handler can steal the captured keys.
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturingAction, preferences]);

  const handleResetUiShortcuts = async () => {
    await handleUpdatePreferences({ uiShortcuts: { ...DEFAULT_UI_SHORTCUTS } });
    showToast('Snippet shortcuts reset to defaults');
  };

  // Trash state
  const [trashedSnippets, setTrashedSnippets] = useState<Snippet[]>([]);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [isRestoringAll, setIsRestoringAll] = useState(false);

  // Category editing state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#4f46e5');

  // New Category state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#4f46e5');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Import state
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // CAT-DEL-MODAL-01: category-deletion decision modal. The modal stores the
  // target category plus the user's chosen behavior; `null` = closed.
  const [categoryDeleteModal, setCategoryDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [categoryDeleteChoice, setCategoryDeleteChoice] = useState<'keep-snippets' | 'delete-snippets'>('keep-snippets');
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Load initial preferences, categories, and trashed snippets
  const loadData = async () => {
    try {
      const [prefs, cats, trashed] = await Promise.all([
        getPreferences(),
        getCategoriesWithCount(),
        getTrashedSnippets(),
      ]);
      setPreferences(prefs);
      setCategories(cats);
      setTrashedSnippets(trashed);
    } catch (err) {
      console.error('Failed to load settings data', err);
      showToast('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (toastExitTimeoutRef.current) clearTimeout(toastExitTimeoutRef.current);
    };
  }, []);

  // Reload trash snippets when user switches to trash tab
  useEffect(() => {
    if (activeTab === 'trash') {
      getTrashedSnippets().then(setTrashedSnippets).catch(console.error);
    }
  }, [activeTab]);

  const handleRestoreSnippet = async (snippet: Snippet) => {
    try {
      const restored = await restoreSnippet(snippet.id);
      const updatedTrashed = await getTrashedSnippets();
      setTrashedSnippets(updatedTrashed);
      const updatedCats = await getCategoriesWithCount();
      setCategories(updatedCats);
      showToast(`Restored "${restored.title}" to library`);
      onDataChange?.();
    } catch {
      showToast('Failed to restore snippet', 'error');
    }
  };

  const handlePermanentDeleteSnippet = async (snippet: Snippet) => {
    if (!confirm(`Permanently delete "${snippet.title}"?\n\nThis cannot be undone.`)) {
      return;
    }
    try {
      await permanentlyDeleteSnippet(snippet.id);
      const updatedTrashed = await getTrashedSnippets();
      setTrashedSnippets(updatedTrashed);
      showToast(`Permanently deleted "${snippet.title}"`);
      onDataChange?.();
    } catch {
      showToast('Failed to delete snippet', 'error');
    }
  };

  const handleEmptyTrash = async () => {
    if (trashedSnippets.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete all ${trashedSnippets.length} snippet(s) in Trash?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }
    setIsEmptyingTrash(true);
    try {
      const count = await emptyTrash();
      const updatedTrashed = await getTrashedSnippets();
      setTrashedSnippets(updatedTrashed);
      showToast(`Emptied trash (${count} snippet${count === 1 ? '' : 's'} permanently removed)`);
      onDataChange?.();
    } catch {
      showToast('Failed to empty trash', 'error');
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  const handleRestoreAll = async () => {
    if (trashedSnippets.length === 0) return;
    setIsRestoringAll(true);
    try {
      const count = await restoreAllTrashedSnippets();
      const updatedTrashed = await getTrashedSnippets();
      setTrashedSnippets(updatedTrashed);
      const updatedCats = await getCategoriesWithCount();
      setCategories(updatedCats);
      showToast(`Restored all ${count} snippet${count === 1 ? '' : 's'}`);
      onDataChange?.();
    } catch {
      showToast('Failed to restore snippets', 'error');
    } finally {
      setIsRestoringAll(false);
    }
  };

  const handleUpdatePreferences = async (patch: Partial<Preferences>) => {
    if (!preferences) return;
    try {
      const updated = await savePreferences(patch);
      setPreferences(updated);
      showToast('Settings saved automatically');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  // Category handlers
  const handleSaveNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await createCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setIsCreatingCategory(false);
      const updatedCats = await getCategoriesWithCount();
      setCategories(updatedCats);
      showToast('Category created successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to create category', 'error');
    }
  };

  const handleStartEditCategory = (cat: CategoryWithCount) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategoryColor(cat.color);
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategoryId || !editCategoryName.trim()) return;
    try {
      await updateCategory(editingCategoryId, {
        name: editCategoryName.trim(),
        color: editCategoryColor,
      });
      setEditingCategoryId(null);
      const updatedCats = await getCategoriesWithCount();
      setCategories(updatedCats);
      showToast('Category updated');
    } catch {
      showToast('Failed to update category', 'error');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (id === 'default') {
      showToast('The Default category cannot be deleted', 'error');
      return;
    }
    // CAT-DEL-MODAL-01: opening the decision modal replaces the old
    // window.confirm. Nothing is deleted here — the actual deletion happens in
    // handleConfirmCategoryDelete after the user picks one of the two options.
    setCategoryDeleteChoice('keep-snippets');
    setCategoryDeleteModal({ id, name });
  };

  // CAT-DEL-MODAL-01: executes the option chosen in the decision modal.
  // 'keep-snippets' preserves the existing behavior exactly: deleteCategory
  // reassigns the category's snippets to Default. 'delete-snippets' soft-deletes
  // each associated snippet through the EXISTING snippet-deletion pathway
  // (updateSnippet to re-point the record at Default so a later restore never
  // references a deleted category, then deleteSnippet → Trash with its 3-day
  // recovery window) before the category itself is removed — no active snippet
  // is migrated to Default and nothing is permanently deleted.
  const handleConfirmCategoryDelete = async () => {
    if (!categoryDeleteModal || isDeletingCategory) return;
    const { id, name } = categoryDeleteModal;
    setIsDeletingCategory(true);
    try {
      if (categoryDeleteChoice === 'delete-snippets') {
        const affected = (await getAllSnippets()).filter((s) => s.categoryId === id);
        for (const snip of affected) {
          await updateSnippet(snip.id, { categoryId: 'default' });
          await deleteSnippet(snip.id);
        }
      }
      await deleteCategory(id, 'default');
      const updatedCats = await getCategoriesWithCount();
      setCategories(updatedCats);
      showToast(
        categoryDeleteChoice === 'delete-snippets'
          ? `Category "${name}" deleted with its snippets (moved to Trash)`
          : `Category "${name}" deleted — snippets moved to Default`
      );
      setCategoryDeleteModal(null);
    } catch {
      // Modal stays open on failure so the user can retry or cancel.
      showToast('Failed to delete category', 'error');
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Export handler
  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `snippet-organizer-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported ${data.snippets.length} snippets`);
    } catch (err) {
      console.error(err);
      showToast('Export failed', 'error');
    }
  };

  // Import handler — MOTION-01: the File trigger flips to an in-progress state
  // for the duration of the real import (parse + DB write + reload); no fake
  // progress, controls re-enable in `finally` whatever the outcome.
  const [isImporting, setIsImporting] = useState(false);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed: BackupData = JSON.parse(text);

      if (!parsed.snippets || !Array.isArray(parsed.snippets)) {
        throw new Error('Invalid file format: missing snippets array.');
      }

      const result = await importData(parsed, importMode);
      await loadData();
      showToast(`Imported ${result.snippetsCount} snippets successfully`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Import failed. Check file format.', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Reset handler
  const handleResetDefaults = async () => {
    try {
      await resetToDefaultData();
      await loadData();
      setShowResetConfirm(false);
      showToast('Database reset to defaults');
    } catch {
      showToast('Reset failed', 'error');
    }
  };

  // ============ GD-04: Google Drive cloud snapshots (browse/download/delete) ============
  // All operations are explicit user actions (D6); deletion is PERMANENT on the
  // Drive side and never touches local data; contents download only on request.
  const driveServiceRef = useRef<ReturnType<typeof createDriveService> | null>(null);
  const driveAuthRef = useRef<AuthController | null>(null);
  const [drivePhase, setDrivePhase] = useState<'idle' | 'loading' | 'ready' | 'error' | 'disconnected'>('idle');
  const [driveEntries, setDriveEntries] = useState<SnapshotBrowserEntry[]>([]);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveBusyId, setDriveBusyId] = useState<string | null>(null);
  const [driveDeleteId, setDriveDeleteId] = useState<string | null>(null);
  const [isDeletingDrive, setIsDeletingDrive] = useState(false);
  // GD-07 IA-1 → PR-1: connection status is now REAL-state backed. On mount a
  // silent probe verifies Chrome's cached grant AND live Drive access
  // (chrome.identity's token cache survives restarts, so "configured" no longer
  // guesses 'disconnected' — it reports 'checking' until the truth is known).
  // Never prompts: the probe only calls the non-interactive auth path.
  const [driveConnection, setDriveConnection] = useState<
    'setup-needed' | 'checking' | 'disconnected' | 'connected' | 'connection-error'
  >(() => (createAuthController().isConfigured() ? 'checking' : 'setup-needed'));
  // PR-1 Task 3: connected account identity (in-memory only; never persisted).
  const [driveAccount, setDriveAccount] = useState<DriveAccountIdentity | null>(null);
  const [driveConnectionNote, setDriveConnectionNote] = useState<string | null>(null);
  // GD-07 states: one busy slot for connection/create actions ⇒ duplicate submissions disabled.
  const [driveActionBusy, setDriveActionBusy] = useState<'connect' | 'disconnect' | 'create' | null>(null);
  const [driveBackupName, setDriveBackupName] = useState('');

  const getDriveAuth = (): AuthController => {
    if (!driveAuthRef.current) driveAuthRef.current = createAuthController();
    return driveAuthRef.current;
  };

  const getDriveService = () => {
    if (!driveServiceRef.current) {
      // PR-1c: the service itself enforces the persisted disconnect intent
      // (single policy seam) — browse/download/delete/restore-download all
      // return `user-disconnected` with zero token acquisition while the flag
      // is set; the UI can never contradict the connection state.
      driveServiceRef.current = createDriveService({
        authorize: getDriveAuth().authorize,
        removeCachedAuthToken: driveRemoveCachedAuthToken,
        connectionIntent: getDriveIntentStore(),
      });
    }
    return driveServiceRef.current;
  };

  /** Same guarded chrome.identity adapter the GD-04 service uses internally (GD-03 401-retry flow). */
  const driveRemoveCachedAuthToken = (details: { token: string }): Promise<void> => {
    const chromeApi = (globalThis as unknown as {
      chrome?: { identity?: { removeCachedAuthToken?: (d: { token: string }, cb: () => void) => void } };
    }).chrome;
    return new Promise((resolve) => {
      try {
        const removeFn = chromeApi?.identity?.removeCachedAuthToken;
        if (!removeFn) {
          resolve();
          return;
        }
        removeFn({ token: details.token }, () => resolve());
      } catch {
        resolve();
      }
    });
  };

  // ============ PR-1: startup connection verification (silent, never prompts) ============
  // PR-1b: persisted user disconnect intent — the SAME store backs the probe,
  // so after Disconnect (which sets it FIRST, before token-cache eviction) a
  // popup reopen can never silently reconnect from Chrome's token cache.
  const driveIntentRef = useRef<ReturnType<typeof createChromeConnectionIntentStore> | null>(null);
  const getDriveIntentStore = () => {
    if (!driveIntentRef.current) driveIntentRef.current = createChromeConnectionIntentStore();
    return driveIntentRef.current;
  };
  const driveProbeRef = useRef<ReturnType<typeof createConnectionProbe> | null>(null);
  const getDriveProbe = () => {
    if (!driveProbeRef.current) {
      driveProbeRef.current = createConnectionProbe({
        authorize: (options) => getDriveAuth().authorize(options),
        removeCachedAuthToken: driveRemoveCachedAuthToken,
        connectionIntent: getDriveIntentStore(),
      });
    }
    return driveProbeRef.current;
  };

  const applyDriveConnectionState = (state: DriveConnectionState): void => {
    switch (state.status) {
      case 'setup-needed':
        setDriveConnection('setup-needed');
        setDriveAccount(null);
        setDriveConnectionNote(null);
        break;
      case 'disconnected':
        setDriveConnection('disconnected');
        setDriveAccount(null);
        setDriveConnectionNote(state.message);
        break;
      case 'connection-error':
        setDriveConnection('connection-error');
        setDriveAccount(null);
        setDriveConnectionNote(state.message);
        break;
      case 'connected':
        setDriveConnection('connected');
        setDriveAccount(state.account);
        setDriveConnectionNote(null);
        break;
    }
  };

  const runDriveConnectionProbe = async (): Promise<void> => {
    try {
      applyDriveConnectionState(await getDriveProbe().probe());
    } catch {
      // The probe is typed never to throw; guard anyway so the UI cannot lie.
      setDriveConnection('connection-error');
      setDriveAccount(null);
      setDriveConnectionNote('Connection check failed unexpectedly.');
    }
  };

  useEffect(() => {
    void runDriveConnectionProbe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const describeDriveError = (outcome: { status: string; message?: string; problemMessage?: string; reason?: string | null }): string => {
    switch (outcome.status) {
      case 'not-configured':
        return 'Google Drive backup is not configured yet. Add your own OAuth client ID (project docs, oauth-contract §6).';
      case 'denied':
        return 'Google Drive access was denied.';
      case 'interaction-required':
        return 'Google needs you to re-confirm access — try again.';
      case 'unauthorized':
        return 'Google authorization expired and could not be refreshed.';
      case 'forbidden':
        // PR-1: Drive's precise reason, never a blanket "permissions" claim.
        // Drive rate-limits with 403 for this documented reason family too.
        if (outcome.reason && DRIVE_RATE_LIMIT_403_REASONS.has(outcome.reason)) {
          return 'Google Drive rate limit reached — try again in a moment.';
        }
        if (outcome.reason === 'insufficientPermissions' || outcome.reason === 'serviceDisabled') {
          return 'Google Drive access is not available for this app — verify the Drive API is enabled and this account is a Test user.';
        }
        return outcome.reason
          ? `Google Drive refused the request (${outcome.reason}).`
          : 'Google Drive refused the request (permissions).';
      case 'rate-limited':
        return 'Google Drive rate limit reached — try again in a moment.';
      case 'network-error':
        return 'Could not reach Google Drive. Check your connection.';
      case 'user-disconnected':
        // PR-1c: distinct from any transport error — the persisted disconnect
        // intent is set; nothing was fetched and nothing was deleted.
        return USER_DISCONNECTED_DRIVE_MESSAGE;
      default:
        return outcome.message || 'Google Drive request failed.';
    }
  };

  const handleDriveRefresh = async () => {
    setDrivePhase('loading');
    setDriveError(null);
    const outcome = await getDriveService().browse();
    if (outcome.status === 'ok') {
      setDriveEntries(outcome.entries);
      setDrivePhase('ready');
      setDriveConnection('connected'); // a successful authorized browse IS a connection proof
    } else if (outcome.status === 'user-disconnected') {
      // PR-1c: distinct disconnected state — never an empty list, never an
      // error, and no stale entries presented as live remote data.
      setDriveEntries([]);
      setDrivePhase('disconnected');
      setDriveError(null);
    } else {
      if (outcome.status === 'not-configured') setDriveConnection('setup-needed');
      setDriveError(describeDriveError(outcome));
      setDrivePhase('error');
    }
  };

  // ============ GD-07 IA-1: explicit Connect / Disconnect (no auto-connect) ============
  const handleDriveConnect = async () => {
    setDriveActionBusy('connect');
    try {
      // PR-1b: an explicit Connect click is the ONLY thing that may clear the
      // persisted disconnect intent — clear it before authorizing so the
      // interactive flow (and every later probe) treats reconnecting as
      // user-sanctioned.
      await getDriveIntentStore().set(false);
      const outcome = await getDriveAuth().authorize({ interactive: true });
      if (outcome.status === 'authorized') {
        setDriveConnection('connected');
        showToast('Connected to Google Drive');
        await handleDriveRefresh();
        // PR-1: silently refresh the real state + account identity
        // (cached token + about.get; never prompts).
        await runDriveConnectionProbe();
      } else {
        showToast(describeDriveError(outcome), 'error');
      }
    } finally {
      setDriveActionBusy(null);
    }
  };

  const handleDriveDisconnect = async () => {
    setDriveActionBusy('disconnect');
    try {
      // PR-1b: persist the user's disconnect intent FIRST — it must survive
      // popup close/reopen even if token-cache eviction fails below.
      // signOut() only evicts Chrome's cached token; the OAuth grant itself
      // stays valid at Google, so without this persisted flag the startup
      // probe would silently reconnect on the next open.
      await getDriveIntentStore().set(true);
      await getDriveAuth().signOut(); // clears the Chrome token cache only — never cloud data
      setDriveConnection('disconnected');
      setDriveAccount(null); // PR-1 Task 3: identity leaves the UI with the session
      setDriveConnectionNote('You disconnected Google Drive. Click Connect to reconnect.');
      // PR-1c: drop any in-memory listing so no previously fetched entries can
      // be mistaken for live remote data while disconnected.
      setDriveEntries([]);
      setDrivePhase('disconnected');
      setDriveError(null);
      showToast('Disconnected. Snapshots already stored remain in your Drive app folder.');
    } finally {
      setDriveActionBusy(null);
    }
  };

  // ============ GD-07 IA-2: Create cloud backup (GD-03 orchestrator gets its UI) ============
  // Explicit user action (D6); always uploads a NEW file — nothing is overwritten;
  // typed failures surfaced verbatim (ambiguous includes backupId reconciliation info).
  const handleDriveCreateBackup = async () => {
    setDriveActionBusy('create');
    try {
      const outcome = await createCloudBackup(
        {
          authorize: (options) => getDriveAuth().authorize(options),
          removeCachedAuthToken: driveRemoveCachedAuthToken,
          readers: { getAllSnippetsIncludingTrash, getCategories, getPreferences },
          clock: () => Date.now(),
          connectionIntent: getDriveIntentStore(), // PR-1c: same policy as browse — no silent reconnect
        },
        { displayName: driveBackupName.trim() || undefined },
      );
      if (outcome.status === 'created') {
        setDriveConnection('connected');
        setDriveBackupName('');
        showToast(
          `Created “${outcome.displayName}” — ${outcome.counts.activeSnippets} active + ${outcome.counts.trashedSnippets} trashed snippets, ${outcome.counts.categories} categories${outcome.reconciled ? ' (an earlier attempt had actually succeeded)' : ''}`,
        );
        await handleDriveRefresh();
      } else {
        showToast(describeDriveError(outcome), 'error');
      }
    } finally {
      setDriveActionBusy(null);
    }
  };

  const handleDriveDownload = async (entry: SnapshotBrowserEntry) => {
    setDriveBusyId(entry.driveFileId);
    try {
      const outcome = await getDriveService().download({ driveFileId: entry.driveFileId, fallbackFileName: entry.fileName });
      if (outcome.status === 'ok') {
        // Same save mechanism as the local export handler (blob + anchor; no tokens involved).
        const blob = new Blob([outcome.raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = outcome.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (outcome.parsed.status === 'ok') {
          showToast(`Downloaded “${entry.displayName}” — valid v2 snapshot`);
        } else if (outcome.parsed.status === 'unsupported-version') {
          showToast(`Downloaded raw file — newer schema (v${outcome.parsed.observedSchemaVersion ?? '?'}); this app version cannot read it yet`, 'error');
        } else {
          showToast('Downloaded raw file — content failed snapshot validation', 'error');
        }
      } else {
        showToast(describeDriveError(outcome), 'error');
      }
    } finally {
      setDriveBusyId(null);
    }
  };

  const handleDriveDelete = async (entry: SnapshotBrowserEntry) => {
    setIsDeletingDrive(true);
    try {
      const outcome = await getDriveService().remove({ driveFileId: entry.driveFileId });
      setDriveDeleteId(null);
      if (outcome.status === 'ok') {
        showToast(`Deleted cloud snapshot “${entry.displayName}” — local data untouched`);
      } else if (outcome.status === 'not-found') {
        showToast('That snapshot no longer exists on Google Drive', 'error');
      } else {
        showToast(describeDriveError(outcome), 'error');
      }
      await handleDriveRefresh();
    } finally {
      setIsDeletingDrive(false);
    }
  };

  // ============ GD-05: cloud restore (read-only preview → confirm → atomic apply) ============
  // Ordering is fixed: download + validate (no mutation) → verified safety checkpoint →
  // read-only preview → explicit user confirmation → ONE atomic transaction → post-check.
  // Canceling at any point before Apply writes nothing.
  const [restoreFlow, setRestoreFlow] = useState<RestoreFlowState | null>(null);

  const handleDriveRestoreStart = async (entry: SnapshotBrowserEntry) => {
    setDriveBusyId(entry.driveFileId);
    setRestoreFlow(null);
    try {
      // 1+2. Download and validate envelope/schema/digest — no local mutation.
      const download = await getDriveService().download({ driveFileId: entry.driveFileId, fallbackFileName: entry.fileName });
      if (download.status !== 'ok') {
        showToast(describeDriveError(download), 'error');
        return;
      }
      // 3. Read-only preview over trash-inclusive local state.
      const previewOutcome = await previewRestoreFromParsed(download.parsed, {
        localSnippets: await getAllSnippetsIncludingTrash(),
        localCategories: await getCategories(),
      });
      if (previewOutcome.status === 'not-usable') {
        showToast(previewOutcome.message, 'error');
        return;
      }
      // 7. Safety checkpoint (full local state incl. tombstones), verified via the
      // GD-01 parse contract. Without it every restore write is blocked (D7).
      const localState = await readAllLocalStateForRestore();
      const checkpointOutcome = await buildRestoreCheckpoint({
        readAllSnippetsIncludingTrash: () => Promise.resolve(localState.snippets),
        readCategories: () => Promise.resolve(localState.categories),
        readPreferences: () => Promise.resolve(localState.preferences),
      });
      if (checkpointOutcome.status !== 'ok') {
        showToast(checkpointOutcome.message, 'error');
        return;
      }
      setRestoreFlow({
        entry,
        stage: 'preview',
        envelope: previewOutcome.envelope,
        preview: previewOutcome.preview,
        checkpoint: checkpointOutcome.checkpoint,
        mode: 'merge',
        choices: {},
        applyPreferences: false,
        replaceConfirmed: false,
        resultMessage: null,
      });
    } finally {
      setDriveBusyId(null);
    }
  };

  /** Pure cancel: the preview never wrote anything, so closing it is free. */
  const cancelRestoreFlow = () => setRestoreFlow(null);

  const handleRestoreApply = async () => {
    if (!restoreFlow || restoreFlow.stage === 'applying') return;
    const flow = restoreFlow;
    setRestoreFlow({ ...flow, stage: 'applying', resultMessage: null });

    const plan =
      flow.mode === 'merge'
        ? buildMergePlan(flow.preview, { choices: flow.choices, applyPreferences: flow.applyPreferences })
        : buildReplacePlan(flow.envelope);
    const { expectedSnippets } = planRestoreExpectations(flow.mode, plan, flow.preview, flow.choices, flow.checkpoint);

    const outcome = await executeRestore(
      {
        executeAtomic: applyRestoreWritePlan,
        verifyAfterWrite: async ({ expectedSnippets: expected, expectedCategories }) => {
          const [snippets, categories] = await Promise.all([getAllSnippetsIncludingTrash(), getCategories()]);
          if (snippets.length !== expected) return false;
          if (expectedCategories !== null && categories.length !== expectedCategories) return false;
          return true;
        },
      },
      {
        mode: flow.mode,
        plan,
        preferences: flow.envelope.payload.preferences ?? null,
        checkpoint: flow.checkpoint,
        expectedSnippets,
      },
    );

    if (outcome.status === 'ok') {
      showToast(`Restored from “${flow.entry.displayName}” — ${outcome.snippetsWritten} snippet(s) written. Safety copy was verified beforehand.`);
      setRestoreFlow(null);
      await loadData();
      await handleDriveRefresh();
    } else {
      // Keep the preview open with the failure message; the checkpoint stays valid.
      setRestoreFlow({ ...flow, stage: 'preview', resultMessage: outcome.message });
      showToast(outcome.message, 'error');
    }
  };

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  const navItems: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'categories', label: 'Categories', icon: FolderTree },
    { key: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
    { key: 'data', label: 'Backup & Data', icon: HardDrive },
    { key: 'trash', label: 'Trash', icon: Trash2 },
    { key: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="flex flex-col h-full text-slate-800">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-2 text-xs font-medium flex items-center justify-between border-b ${
            toastLeaving
              ? 'nm-toast-out'
              : 'animate-in fade-in slide-in-from-top-2 duration-200'
          } ${
            toastType === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="p-1 hover:bg-black/5 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/50 bg-white/35 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[rgb(240,85,88)] text-white shadow-sm shadow-red-500/30">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Settings</h2>
            <p className="text-[11px] text-slate-600">
              Customize preferences, organize categories, and manage data
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl nm-icon-btn text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Close settings"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Two-Column Layout: Left Navigation Sidebar + Right Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Vertical Settings Navigation Sidebar — width reduced 30% for the
            480 x 600 viewport (176px → 123px; ≥640px contexts 192px → 134px) so the
            settings content column gains the released space (SETTINGS-VP-01 Step 3).
            Labels wrap instead of truncating; icons and click targets preserved. */}
        <aside className="nm-scrollbar w-[123px] sm:w-[134px] shrink-0 border-r border-white/50 bg-white/25 backdrop-blur-sm flex flex-col min-h-0 overflow-y-auto select-none">
          <nav className="p-2 sm:p-3 space-y-1.5" aria-label="Settings navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              const showBadge = item.key === 'trash' && trashedSnippets.length > 0;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-xs text-left cursor-pointer transition-all ${
                    isActive
                      ? 'nm-inset text-[#9f0409] font-bold'
                      : 'nm-raised text-slate-700 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#9f0409]' : 'text-slate-400'}`} />
                  {/* min-w-0 + wrap instead of truncate: full labels stay readable at the
                      reduced sidebar width ("Backup & Data" wraps to two lines) */}
                  <span className="min-w-0 leading-tight">{item.label}</span>
                  {showBadge && (
                    <span
                      className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                        isActive
                          ? 'bg-[rgba(208,2,5,0.15)] text-[#9f0409]'
                          : 'bg-white/60 text-slate-700'
                      }`}
                    >
                      {trashedSnippets.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right: Existing Settings content for the selected section.
            MOTION-01: key={activeTab} replays a restrained entrance (200 ms fade
            + 4 px rise, ease-out) on every section switch — no layout shift, no
            overlap, and the entrance is suppressed under reduced motion. */}
        <main className="flex-1 min-w-0 flex flex-col min-h-0 bg-white/25 backdrop-blur-sm">
          <div
            key={activeTab}
            className="nm-scrollbar flex-1 overflow-y-auto px-6 py-5 text-xs space-y-6 animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out"
          >
        {/* ======================================================== */}
        {/* TAB 1: GENERAL PREFERENCES */}
        {/* ======================================================== */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-xl">
            {/* Appearance Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-[#9f0409]" />
                <h3 className="font-bold text-slate-800 text-xs tracking-tight">Appearance & Theme</h3>
              </div>
              <div className="nm-static-inset-section rounded-2xl p-4 space-y-3">
                {/* Vertical layout (title → description → control): the segmented picker
                    (~200px) cannot share a row with readable text inside the 480px
                    viewport column — horizontal arrangement left only a 48px text
                    sliver and overflowed the row by 38px (SETTINGS-VP-01 Step 5). */}
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-slate-700 block text-xs">Interface Theme</span>
                    <span className="text-[11px] text-slate-500">
                      Select your preferred display theme for popup & options
                    </span>
                  </div>

                  {/* Segmented Theme Picker — three options stay grouped horizontally */}
                  <div className="flex items-center p-1 nm-inset rounded-xl gap-1">
                    {[
                      { mode: 'light', label: 'Light', icon: Sun },
                      { mode: 'dark', label: 'Dark', icon: Moon },
                      { mode: 'system', label: 'Auto', icon: Laptop },
                    ].map(({ mode, label, icon: Icon }) => {
                      const isCurrent = (preferences.theme || 'light') === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleUpdatePreferences({ theme: mode as ThemeMode })}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                            isCurrent
                              ? 'nm-inset text-[#9f0409] font-semibold'
                              : 'nm-raised text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Search Fields Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-[#9f0409]" />
                <h3 className="font-bold text-slate-800 text-xs tracking-tight">Search Scope</h3>
              </div>
              <div className="nm-static-inset-section rounded-2xl p-4 space-y-3">
                <p className="text-[11px] text-slate-500 mb-2">
                  Choose which snippet fields are indexed during live search queries in the main popup.
                </p>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-[rgba(208,2,5,0.08)] transition-colors cursor-pointer">
                  <div>
                    <span className="font-medium text-slate-700 block">Search in Titles</span>
                    <span className="text-[11px] text-slate-500">Match against the snippet title</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.searchFields.title}
                    onChange={(e) =>
                      handleUpdatePreferences({
                        searchFields: {
                          ...preferences.searchFields,
                          title: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-[rgb(240,85,88)] rounded border-slate-300 focus:ring-[rgba(208,2,5,0.4)] cursor-pointer"
                  />
                </label>

                <div className="h-px bg-slate-200/60" />

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-[rgba(208,2,5,0.08)] transition-colors cursor-pointer">
                  <div>
                    <span className="font-medium text-slate-700 block">Search in Content</span>
                    <span className="text-[11px] text-slate-500">Match inside snippet body text</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.searchFields.content}
                    onChange={(e) =>
                      handleUpdatePreferences({
                        searchFields: {
                          ...preferences.searchFields,
                          content: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-[rgb(240,85,88)] rounded border-slate-300 focus:ring-[rgba(208,2,5,0.4)] cursor-pointer"
                  />
                </label>

                <div className="h-px bg-slate-200/60" />

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-[rgba(208,2,5,0.08)] transition-colors cursor-pointer">
                  <div>
                    <span className="font-medium text-slate-700 block">Search in Categories</span>
                    <span className="text-[11px] text-slate-500">Match category tag names</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.searchFields.category}
                    onChange={(e) =>
                      handleUpdatePreferences({
                        searchFields: {
                          ...preferences.searchFields,
                          category: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-[rgb(240,85,88)] rounded border-slate-300 focus:ring-[rgba(208,2,5,0.4)] cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Behavior & Confirmations */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#9f0409]" />
                <h3 className="font-bold text-slate-800 text-xs tracking-tight">Behavior & Confirmations</h3>
              </div>
              <div className="nm-static-inset-section rounded-2xl p-4 space-y-3">
                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-[rgba(208,2,5,0.08)] transition-colors cursor-pointer">
                  <div>
                    <span className="font-medium text-slate-700 block">Favorite Confirmation</span>
                    <span className="text-[11px] text-slate-500">
                      Ask for confirmation before adding or removing favorites
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.favoriteConfirmationEnabled}
                    onChange={(e) =>
                      handleUpdatePreferences({
                        favoriteConfirmationEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-[rgb(240,85,88)] rounded border-slate-300 focus:ring-[rgba(208,2,5,0.4)] cursor-pointer"
                  />
                </label>

                <div className="h-px bg-slate-200/60" />

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-[rgba(208,2,5,0.08)] transition-colors cursor-pointer">
                  <div>
                    <span className="font-medium text-slate-700 block">Copy Notification</span>
                    <span className="text-[11px] text-slate-500">
                      Show green checkmark feedback badge when snippet is copied
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.showCopyNotification ?? true}
                    onChange={(e) =>
                      handleUpdatePreferences({
                        showCopyNotification: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-[rgb(240,85,88)] rounded border-slate-300 focus:ring-[rgba(208,2,5,0.4)] cursor-pointer"
                  />
                </label>
                {/* GD-07: the "Auto-Sync Indicator" toggle was removed — it controlled a
                    fabricated footer sync claim and no synchronization exists (GD-06
                    blocked). The stored `autoSyncEnabled` preference field remains in
                    Preferences for snapshot/import compatibility but drives nothing. */}
              </div>
            </div>

            {/* Default Startup View */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-[#9f0409]" />
                <h3 className="font-bold text-slate-800 text-xs tracking-tight">Default View</h3>
              </div>
              <div className="nm-static-inset-section rounded-2xl p-4">
                {/* Vertical layout (title → description → control): the 122px dropdown
                    reduced its row's text to an 89px sliver — narrower than the control
                    itself — fragmenting the description (SETTINGS-VP-01 Step 5). */}
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-slate-700 block">Startup Filter Tab</span>
                    <span className="text-[11px] text-slate-500">
                      Default active tab when opening the extension popup
                    </span>
                  </div>
                  <select
                    value={preferences.defaultFilter || 'all'}
                    onChange={(e) =>
                      handleUpdatePreferences({ defaultFilter: e.target.value as FilterType })
                    }
                    className="nm-raised rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium cursor-pointer outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="favorites">Favorites</option>
                    <option value="recent">Recent</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CATEGORY MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-5 max-w-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs">Categories & Tags</h3>
                <p className="text-[11px] text-slate-500">
                  Manage categories to classify your snippets with custom labels and colors
                </p>
              </div>
              {!isCreatingCategory && (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 nm-primary-raised text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Category</span>
                </button>
              )}
            </div>

            {/* Create Category Form */}
            {isCreatingCategory && (
              <form
                onSubmit={handleSaveNewCategory}
                className="nm-static-inset-info-section rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-98 duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#7f1d1d] text-xs">Add New Category</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales, Marketing, Technical..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white/50 border border-white/60 rounded-xl text-xs focus:ring-2 focus:ring-[rgba(208,2,5,0.25)] outline-none"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Badge Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCategoryColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-lg transition-transform cursor-pointer ${
                          newCategoryColor === c
                            ? 'ring-2 ring-[rgba(208,2,5,0.7)] scale-110 shadow-sm'
                            : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[rgba(208,2,5,0.6)] hover:bg-[rgba(208,2,5,0.45)] text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Save Category
                  </button>
                </div>
              </form>
            )}

            {/* Category List Cards */}
            <div className="space-y-2">
              {categories.map((cat) => {
                const isEditing = editingCategoryId === cat.id;
                const isDefault = cat.id === 'default';

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      className="nm-static-inset-subsection rounded-2xl p-3.5 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-white/60 bg-white/50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[rgba(208,2,5,0.25)] outline-none"
                          autoFocus
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditCategoryColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-md transition-transform cursor-pointer ${
                              editCategoryColor === c
                                ? 'ring-2 ring-[rgba(208,2,5,0.7)] scale-110'
                                : 'hover:scale-105'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingCategoryId(null)}
                          className="px-2.5 py-1 text-slate-500 hover:bg-[rgba(208,2,5,0.08)] rounded-lg text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEditCategory}
                          className="flex items-center gap-1 px-3 py-1 bg-[rgba(208,2,5,0.6)] text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3.5 nm-static-inset-card rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-lg shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">{cat.name}</span>
                          {isDefault && (
                            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {cat.snippetCount} {cat.snippetCount === 1 ? 'snippet' : 'snippets'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleStartEditCategory(cat)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-[rgba(208,2,5,0.08)] rounded-lg transition-colors cursor-pointer"
                        title="Edit category"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: KEYBOARD SHORTCUTS */}
        {/* ======================================================== */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-5 max-w-xl">
            {/* TASK-locked 2026-10-17: the redundant "Keyboard Shortcuts" intro
                heading + description were removed — the tab is now led directly by
                the Default Shortcuts card. The tab's navigation entry is unchanged. */}

            {/* SNIPPET-KBD-02 Card 1: informational default-shortcuts reference */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs">Default Shortcuts</h4>
              <p className="text-[11px] text-slate-500">
                The five supported actions and their out-of-the-box bindings
              </p>
            </div>
            <div className="nm-static-inset-section rounded-2xl divide-y divide-white/50 overflow-hidden">
              {[
                {
                  keys: ['Ctrl', 'Shift', 'S'],
                  label: 'Focus Search Bar',
                  desc: 'Focus the search field, ready for immediate typing',
                },
                {
                  keys: ['↑', '↓'],
                  label: 'Navigate Snippets',
                  desc: 'Move the active selection through the visible snippet cards',
                },
                {
                  keys: ['Enter'],
                  label: 'Copy Content',
                  desc: "Copy the active snippet's content directly — no preview opens",
                },
                {
                  keys: ['Backspace'],
                  label: 'Clear Search / Dismiss',
                  desc: 'Clear the search query from the snippet list; in the field, Backspace still edits normally',
                },
                {
                  keys: [globalCommandShortcut ?? 'Ctrl+Shift+X'],
                  label: 'Open / Toggle Extension',
                  desc: 'Browser-global shortcut to open Snippet Organizer — toggles the floating window closed, and opens the docked popup where Chrome supports it. Change it via "Manage" below',
                },
              ].map((shortcut, idx) => (
                /* SHORTCUTS-VERTICAL-01 (turn 17): each row stacks vertically —
                   title → description → key badges (wrap) — instead of one long
                   horizontal justify-between row that squeezed long descriptions
                   against shrink-0 key badges inside the 430px popup. Same
                   classes/styling otherwise; no behavior change. */
                <div
                  key={idx}
                  className="flex flex-col gap-1.5 p-3.5 hover:bg-white/60 transition-colors"
                >
                  <span className="font-semibold text-slate-700 block text-xs">
                    {shortcut.label}
                  </span>
                  <span className="text-[11px] text-slate-500">{shortcut.desc}</span>
                  <div className="flex flex-wrap items-center gap-1 min-w-0 pt-0.5">
                    {shortcut.keys.map((k, kidx) => (
                      <kbd
                        key={kidx}
                        className="px-2 py-1 font-mono font-bold text-[11px] text-slate-700 bg-white/60 border border-white/70 rounded-lg"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* SNIPPET-KBD-02 Card 2: in-extension customization for the same five actions */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs">Customize Shortcuts</h4>
              <p className="text-[11px] text-slate-500">
                Change the in-extension bindings below. The active binding is shown on each row;
                navigation is fixed to the arrow keys.
              </p>
            </div>
            <div className="nm-static-inset-section rounded-2xl divide-y divide-white/50 overflow-hidden">
              {(
                [
                  {
                    action: 'focusSearch' as const,
                    label: 'Focus Search Bar',
                    desc: 'Focus the search input for immediate typing',
                  },
                  {
                    action: 'copy' as const,
                    label: 'Copy Content',
                    desc: "Copy the active snippet's content directly (no preview)",
                  },
                  {
                    action: 'clearSearch' as const,
                    label: 'Clear Search / Dismiss',
                    desc: 'Clear the search query while the snippet list has keyboard interaction',
                  },
                ] as Array<{ action: keyof UIShortcutBindings; label: string; desc: string }>
              ).map((row) => {
                const bindings = preferences?.uiShortcuts ?? DEFAULT_UI_SHORTCUTS;
                const binding = bindings[row.action];
                const isCapturing = capturingAction === row.action;
                return (
                  /* SHORTCUTS-VERTICAL-01 (turn 17): vertical stack — title →
                     description → current key badges (wrap; the capturing
                     badge lives in the same row) → Change/Cancel button INSIDE
                     the section, below the info. Nothing can be pushed out or
                     clipped by shrink-0 badge groups anymore. */
                  <div
                    key={row.action}
                    className="flex flex-col gap-1.5 p-3.5 hover:bg-white/60 transition-colors"
                  >
                    <span className="font-semibold text-slate-700 block text-xs">{row.label}</span>
                    <span className="text-[11px] text-slate-500">{row.desc}</span>
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 pt-0.5">
                      {isCapturing ? (
                        <span className="px-2 py-1 font-mono font-bold text-[11px] text-[#9f0409] bg-white/60 border border-white/70 rounded-lg animate-pulse">
                          Press keys… (Esc cancels)
                        </span>
                      ) : (
                        (binding ?? '').split('+').map((part, kidx) => (
                          <kbd
                            key={kidx}
                            className="px-2 py-1 font-mono font-bold text-[11px] text-slate-700 bg-white/60 border border-white/70 rounded-lg"
                          >
                            {part}
                          </kbd>
                        ))
                      )}
                    </div>
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => setCapturingAction(isCapturing ? null : row.action)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 nm-raised rounded-xl cursor-pointer"
                      >
                        {isCapturing ? 'Cancel' : 'Change'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* Navigate Snippets: fixed mechanism — shown for completeness, not rebindable.
                  SHORTCUTS-VERTICAL-01: same vertical stacking. */}
              <div className="flex flex-col gap-1.5 p-3.5 hover:bg-white/60 transition-colors">
                <span className="font-semibold text-slate-700 block text-xs">
                  Navigate Snippets
                </span>
                <span className="text-[11px] text-slate-500">
                  Fixed — the arrow keys are the navigation mechanism
                </span>
                <div className="flex flex-wrap items-center gap-1 min-w-0 pt-0.5">
                  {['↑', '↓'].map((k, kidx) => (
                    <kbd
                      key={kidx}
                      className="px-2 py-1 font-mono font-bold text-[11px] text-slate-700 bg-white/60 border border-white/70 rounded-lg"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
              {/* Open / Toggle Extension: browser-global, customized via Chrome's manager.
                  SHORTCUTS-VERTICAL-01: same vertical stacking. */}
              <div className="flex flex-col gap-1.5 p-3.5 hover:bg-white/60 transition-colors">
                <span className="font-semibold text-slate-700 block text-xs">
                  Open / Toggle Extension
                </span>
                <span className="text-[11px] text-slate-500">
                  Browser-global command — change it with the Chrome manager below
                </span>
                <div className="flex flex-wrap items-center gap-1 min-w-0 pt-0.5">
                  {(globalCommandShortcut ?? 'Ctrl+Shift+X').split('+').map((part, kidx) => (
                    <kbd
                      key={kidx}
                      className="px-2 py-1 font-mono font-bold text-[11px] text-slate-700 bg-white/60 border border-white/70 rounded-lg"
                    >
                      {part}
                    </kbd>
                  ))}
                </div>
              </div>
              {/* SHORTCUTS-VERTICAL-01: footer row stacks too — note above the
                  Reset button, button fully inside the card (no clipping). */}
              <div className="flex flex-col items-start gap-2 p-3.5">
                <span className="text-[11px] text-slate-500">
                  Saved automatically with your other settings.
                </span>
                <button
                  type="button"
                  onClick={handleResetUiShortcuts}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 nm-raised rounded-xl cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>

            {/* Chrome Shortcut Customizer link — single-column layout: title,
                concise description, then a full-width Manage button */}
            <div className="nm-static-inset-info-section rounded-2xl p-4 flex flex-col items-stretch gap-2.5">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-[#9f0409] shrink-0" />
                <span className="font-bold text-[#7f1d1d] text-xs">
                  Customize Browser Shortcut
                </span>
              </div>
              <span className="text-[11px] text-[#9f0409]">
                Manage your extension shortcuts in Chrome settings.
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    const chromeApi = (globalThis as unknown as { chrome?: { tabs?: { create: (opts: any) => void } } }).chrome;
                    if (chromeApi?.tabs?.create) {
                      chromeApi.tabs.create({ url: 'chrome://extensions/shortcuts' });
                    } else {
                      showToast('Copy "chrome://extensions/shortcuts" in your browser bar');
                    }
                  } catch {
                    showToast('Navigate to chrome://extensions/shortcuts');
                  }
                }}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-white/50 hover:bg-white/75 text-[#9f0409] border border-white/70 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                <span>Manage</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: BACKUP & DATA MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'data' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="font-bold text-slate-800 text-xs">Backup & Data Management</h3>
              <p className="text-[11px] text-slate-500">
                Safely export your snippet library, restore previous backups, or reset your local store
              </p>
            </div>

            {/* Export Card */}
            <div className="nm-static-inset-section rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Export Snippet Library</span>
                  <span className="text-[11px] text-slate-500">
                    Download all snippets, category tags, and user preferences as a JSON file
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 nm-primary-raised text-white font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Import Card */}
            <div className="nm-static-inset-section rounded-2xl p-4 space-y-3">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Restore / Import Backup</span>
                <span className="text-[11px] text-slate-500">
                  Select a previously exported <code className="bg-slate-200/60 px-1 rounded">.json</code> backup file
                </span>
              </div>

              {/* SETTINGS-BACKUP-01: two-column action group — Merge/Replace stacked in
                  the left column, File spanning both rows on the right. The single flex
                  row this replaces squeezed the labels into wrapping (Replace All grew
                  to 35 px while Merge stayed 19 px) and pushed Choose File... 37 px past
                  the section's right boundary. CSS Grid gives the File button exactly
                  the combined height of the two stacked buttons plus their gap via
                  row-span-2 + stretch, fixed h-8 tokens keep Merge/Replace identical,
                  and whitespace-nowrap prevents any wrap-induced height changes. */}
              <div className="pt-1">
                <span className="block text-[11px] font-bold text-slate-700 mb-1.5">Mode</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1.5">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    disabled={isImporting}
                    className={`row-start-1 col-start-1 h-8 px-2 whitespace-nowrap rounded-md text-[11px] flex items-center justify-center transition-all ${
                      importMode === 'merge'
                        ? 'nm-inset text-[#9f0409] font-semibold'
                        : 'nm-raised text-slate-700 hover:text-slate-900'
                    } ${isImporting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    disabled={isImporting}
                    className={`row-start-2 col-start-1 h-8 px-2 whitespace-nowrap rounded-md text-[11px] flex items-center justify-center transition-all ${
                      importMode === 'replace'
                        ? 'nm-inset text-rose-700 font-semibold'
                        : 'nm-raised text-slate-700 hover:text-slate-900'
                    } ${isImporting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    title="Choose backup file"
                    className={`col-start-2 row-start-1 row-span-2 h-full px-4 whitespace-nowrap font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 ${
                      isImporting
                        ? 'nm-inset text-slate-500 cursor-wait opacity-80'
                        : 'nm-raised text-slate-700 hover:text-slate-900 cursor-pointer'
                    }`}
                  >
                    {isImporting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                        <span>Importing…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Google Drive Snapshots (GD-04/GD-07): create / browse / download / permanent delete */}
            <div className="nm-static-inset-section rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-slate-800 block text-xs">Google Drive Snapshots</span>
                  <span className="text-[11px] text-slate-500">
                    Create snapshots in your own Drive app folder; restore, download, or delete them
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDriveRefresh}
                  disabled={drivePhase === 'loading'}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 nm-primary-raised text-white font-semibold rounded-xl text-xs transition-all whitespace-nowrap ${
                    drivePhase === 'loading' ? 'opacity-60 cursor-wait' : 'cursor-pointer'
                  }`}
                >
                  {drivePhase === 'loading' ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>{drivePhase === 'loading' ? 'Loading…' : drivePhase === 'idle' ? 'Browse Drive' : 'Refresh'}</span>
                </button>
              </div>

              {/* GD-07 IA-1 → PR-1: Google Drive connection — REAL-state backed.
                  On mount a silent probe verifies Chrome's cached grant + live
                  Drive access; never prompts, never fabricates. Task 3: the
                  connected account's identity (email/avatar) is shown while
                  connected and cleared on Disconnect; it lives in memory only. */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl nm-inset">
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold text-slate-800">Google Drive connection</span>
                  <span className="block text-[10px] text-slate-500">
                    {driveConnection === 'setup-needed'
                      ? 'Setup needed: add your own OAuth client ID (project docs, oauth-contract §6)'
                      : driveConnection === 'checking'
                        ? 'Checking saved Google connection…'
                        : driveConnection === 'connected'
                          ? 'Connected to your own Google account'
                          : driveConnection === 'connection-error'
                            ? `Connection check failed: ${driveConnectionNote ?? 'unknown error'}`
                            : driveConnectionNote
                              ? `Not connected — ${driveConnectionNote}`
                              : 'Not connected — your Drive app folder is untouched until you connect'}
                  </span>
                  {driveConnection === 'connected' && driveAccount ? (
                    <span className="flex items-center gap-1.5 mt-1.5 min-w-0">
                      {driveAccount.photoUrl ? (
                        <img
                          src={driveAccount.photoUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full border border-slate-200 shrink-0"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="w-5 h-5 rounded-full bg-[rgb(240,85,88)]/15 text-[rgb(240,85,88)] text-[10px] font-bold flex items-center justify-center shrink-0"
                        >
                          {(driveAccount.email ?? driveAccount.displayName ?? 'G').charAt(0).toUpperCase()}
                        </span>
                      )}
                      {/* The email itself disambiguates multi-account Chrome profiles. */}
                      <span className="text-[10px] text-slate-600 font-medium truncate">
                        {driveAccount.email ?? driveAccount.displayName ?? 'Google account'}
                      </span>
                    </span>
                  ) : null}
                </div>
                {driveConnection === 'connected' ? (
                  <button
                    type="button"
                    onClick={handleDriveDisconnect}
                    disabled={driveActionBusy !== null}
                    className={`px-2.5 py-1 nm-raised text-slate-700 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                      driveActionBusy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {driveActionBusy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDriveConnect}
                    disabled={driveActionBusy !== null || driveConnection === 'setup-needed' || driveConnection === 'checking'}
                    title={
                      driveConnection === 'setup-needed'
                        ? 'Configure your own OAuth client ID first (project docs, oauth-contract §6)'
                        : undefined
                    }
                    className={`flex items-center gap-1 px-2.5 py-1 nm-raised text-slate-700 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                      driveActionBusy || driveConnection === 'setup-needed' || driveConnection === 'checking'
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    {driveActionBusy === 'connect' && (
                      <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {driveActionBusy === 'connect' ? 'Connecting…' : 'Connect'}
                  </button>
                )}
              </div>

              {/* GD-07 IA-2: Create cloud backup — the GD-03 orchestrator's UI.
                  Always uploads a NEW file; nothing is overwritten (D6, ADR-011:
                  no sync, no overwrite — snapshot upload only). */}
              <div className="p-2.5 rounded-xl nm-inset space-y-1.5">
                <div>
                  <span className="block text-[11px] font-bold text-slate-800">Create cloud backup</span>
                  <span className="block text-[10px] text-slate-500">
                    Uploads a NEW snapshot: all snippets (including trash), categories, and preferences. Existing
                    files are never overwritten.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={driveBackupName}
                    onChange={(e) => setDriveBackupName(e.target.value)}
                    disabled={driveActionBusy !== null}
                    maxLength={60}
                    aria-label="Backup name (optional)"
                    placeholder="Optional name (default: date & time)"
                    className="min-w-0 flex-1 px-2.5 py-1.5 rounded-lg nm-inset text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[rgba(208,2,5,0.35)] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={handleDriveCreateBackup}
                    disabled={driveActionBusy !== null}
                    className={`flex items-center gap-1 px-2.5 py-1.5 nm-primary-raised text-white font-semibold rounded-lg text-[11px] transition-all whitespace-nowrap ${
                      driveActionBusy ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                    }`}
                  >
                    {driveActionBusy === 'create' ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    )}
                    <span>{driveActionBusy === 'create' ? 'Creating…' : 'Create'}</span>
                  </button>
                </div>
              </div>

              {drivePhase === 'error' && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/70">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-rose-700 block">{driveError}</span>
                    <button
                      type="button"
                      onClick={handleDriveRefresh}
                      className="text-[11px] font-semibold text-rose-700 underline cursor-pointer mt-0.5"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {drivePhase === 'disconnected' && (
                // PR-1c: distinguishable from loading / error / empty — remote
                // browsing is blocked by the persisted disconnect intent, and
                // remote snapshots are untouched (nothing was deleted).
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-600 block">{USER_DISCONNECTED_DRIVE_MESSAGE}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Snapshots already stored in your Drive app folder are untouched — Connect above to browse them again.
                    </span>
                  </div>
                </div>
              )}

              {drivePhase === 'ready' && driveEntries.length === 0 && (
                <p className="text-[11px] text-slate-500 px-1 py-1">
                  No cloud snapshots yet — create one above. Backups stay in your own Drive app folder.
                </p>
              )}

              {drivePhase === 'ready' && driveEntries.length > 0 && (
                <ul className="nm-scrollbar space-y-2 max-h-64 overflow-y-auto pr-0.5">
                  {driveEntries.map((entry) => (
                    <li key={entry.driveFileId} className="p-2.5 rounded-xl nm-inset">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-[11px] font-bold text-slate-800 truncate">{entry.displayName}</span>
                          <span className="block text-[10px] text-slate-500 truncate">
                            {formatDriveTimestamp(entry.createdAt ?? entry.createdTime)}
                            {entry.sizeBytes !== null && ` · ${formatDriveSize(entry.sizeBytes)}`}
                            {` · ${entry.compatibility === 'v2' ? 'v2 snapshot' : 'unverified format'}`}
                          </span>
                          <span
                            className="block text-[10px] text-slate-400 truncate font-mono"
                            title={entry.fileName}
                          >
                            {entry.backupId ?? entry.driveFileId}
                          </span>
                        </div>

                        {driveDeleteId === entry.driveFileId ? (
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className="text-[10px] font-semibold text-rose-700 max-w-[9rem] truncate text-right"
                              title={entry.displayName}
                            >
                              Delete “{entry.displayName}”?
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDriveDeleteId(null)}
                                disabled={isDeletingDrive}
                                className="px-2 py-1 nm-raised text-slate-600 rounded-lg text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDriveDelete(entry)}
                                disabled={isDeletingDrive}
                                className={`px-2 py-1 nm-danger-raised font-bold rounded-lg text-[11px] flex items-center gap-1 ${
                                  isDeletingDrive ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                                }`}
                              >
                                {isDeletingDrive && (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                )}
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDriveRestoreStart(entry)}
                              disabled={driveBusyId === entry.driveFileId || isDeletingDrive}
                              title="Restore from this snapshot (preview first)"
                              aria-label={`Restore from “${entry.displayName}” (preview first)`}
                              className="px-2 py-1 nm-raised text-slate-700 rounded-lg text-[11px] cursor-pointer disabled:opacity-60"
                            >
                              {driveBusyId === entry.driveFileId ? (
                                <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Upload className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDriveDownload(entry)}
                              disabled={driveBusyId === entry.driveFileId || isDeletingDrive}
                              title="Download snapshot to a file"
                              className="px-2 py-1 nm-raised text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-60"
                            >
                              {driveBusyId === entry.driveFileId ? (
                                <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDriveDeleteId(entry.driveFileId)}
                              disabled={isDeletingDrive}
                              title="Permanently delete from Google Drive"
                              aria-label={`Permanently delete “${entry.displayName}” from Google Drive`}
                              className="px-2 py-1 nm-raised text-rose-700 rounded-lg text-[11px] cursor-pointer disabled:opacity-60"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* GD-05 restore flow: read-only preview → explicit confirm → atomic apply */}
              {restoreFlow && (
                <div className="p-3 rounded-xl nm-inset space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold text-slate-800 truncate">
                        Restore “{restoreFlow.entry.displayName}”
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        Safety copy verified ({restoreFlow.checkpoint.snippetCount} snippets) · preview only — nothing
                        changes until you apply
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={cancelRestoreFlow}
                      disabled={restoreFlow.stage === 'applying'}
                      className="px-2 py-1 nm-raised text-slate-600 rounded-lg text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600">Mode</span>
                    <button
                      type="button"
                      onClick={() => setRestoreFlow({ ...restoreFlow, mode: 'merge', replaceConfirmed: false })}
                      disabled={restoreFlow.stage === 'applying'}
                      className={`h-6 px-2 rounded-md text-[10px] font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                        restoreFlow.mode === 'merge' ? 'nm-inset text-[#9f0409]' : 'nm-raised text-slate-700'
                      }`}
                    >
                      Merge
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestoreFlow({ ...restoreFlow, mode: 'replace' })}
                      disabled={restoreFlow.stage === 'applying'}
                      className={`h-6 px-2 rounded-md text-[10px] font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                        restoreFlow.mode === 'replace' ? 'nm-inset text-rose-700' : 'nm-raised text-slate-700'
                      }`}
                    >
                      Replace
                    </button>
                  </div>

                  {restoreFlow.mode === 'replace' && (
                    <p className="text-[10px] font-semibold text-rose-700 leading-snug">
                      Replace clears ALL local snippets and categories and rewrites them from this snapshot. Preferences
                      are kept unless you opt in below.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                    <span className="px-1.5 py-0.5 nm-raised rounded-md">
                      +{restoreFlow.preview.toAdd.length} new
                    </span>
                    <span className="px-1.5 py-0.5 nm-raised rounded-md">
                      {restoreFlow.preview.unchanged.length} identical
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md ${
                        restoreFlow.preview.conflicts.length > 0 ? 'nm-inset text-rose-700 font-semibold' : 'nm-raised'
                      }`}
                    >
                      {restoreFlow.preview.conflicts.length} conflict(s)
                    </span>
                    <span className="px-1.5 py-0.5 nm-raised rounded-md">
                      {restoreFlow.preview.duplicateNames.length} same-name pair(s)
                    </span>
                    {restoreFlow.preview.missingCategoryIds.length > 0 && (
                      <span className="px-1.5 py-0.5 nm-raised rounded-md">
                        {restoreFlow.preview.missingCategoryIds.length} missing category(ies) → Default
                      </span>
                    )}
                    {restoreFlow.preview.quarantinedCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-50/70 border border-amber-200/70 rounded-md text-amber-700 font-semibold">
                        {restoreFlow.preview.quarantinedCount} quarantined record(s)
                      </span>
                    )}
                  </div>

                  {restoreFlow.preview.duplicateNames.length > 0 && (
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Same-name, different-id records are informational — both copies are kept (existing duplicate
                      policy).
                    </p>
                  )}

                  {restoreFlow.preview.conflicts.length > 0 && (
                    <ul className="nm-scrollbar space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                      {restoreFlow.preview.conflicts.map((conflict: RestorePreviewConflict) => {
                        const current = restoreFlow.choices[conflict.id] ?? 'keep-local';
                        return (
                          <li key={conflict.id} className="p-2 rounded-lg nm-raised space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-800 truncate">
                                {conflict.local.title}
                              </span>
                              <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap">
                                {conflict.kind === 'content-conflict' ? 'Content differs' : 'Trash state differs'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {(['keep-local', 'take-incoming', 'keep-both'] as const).map((choice) => (
                                <button
                                  key={choice}
                                  type="button"
                                  onClick={() =>
                                    setRestoreFlow({
                                      ...restoreFlow,
                                      choices: { ...restoreFlow.choices, [conflict.id]: choice },
                                    })
                                  }
                                  disabled={restoreFlow.stage === 'applying'}
                                  className={`flex-1 h-5 px-1 rounded text-[9px] font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                                    current === choice ? 'nm-inset text-[#9f0409]' : 'bg-slate-200/50 text-slate-600'
                                  }`}
                                >
                                  {RESTORE_CHOICE_LABELS[choice]}
                                </button>
                              ))}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {restoreFlow.preview.hasPreferences && (
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restoreFlow.applyPreferences}
                        disabled={restoreFlow.stage === 'applying'}
                        onChange={(e) => setRestoreFlow({ ...restoreFlow, applyPreferences: e.target.checked })}
                        className="accent-[#9f0409]"
                      />
                      Also apply preferences from this snapshot
                    </label>
                  )}

                  {restoreFlow.mode === 'replace' && (
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restoreFlow.replaceConfirmed}
                        disabled={restoreFlow.stage === 'applying'}
                        onChange={(e) => setRestoreFlow({ ...restoreFlow, replaceConfirmed: e.target.checked })}
                        className="accent-rose-700"
                      />
                      I understand: Replace rewrites my entire library from this snapshot.
                    </label>
                  )}

                  {restoreFlow.resultMessage && (
                    <p className="text-[10px] font-semibold text-rose-700 leading-snug">{restoreFlow.resultMessage}</p>
                  )}

                  <div className="flex items-center justify-end gap-1.5">
                    {restoreFlow.stage === 'applying' && (
                      <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <button
                      type="button"
                      onClick={handleRestoreApply}
                      disabled={
                        restoreFlow.stage === 'applying' ||
                        (restoreFlow.mode === 'replace' && !restoreFlow.replaceConfirmed)
                      }
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all ${
                        restoreFlow.mode === 'replace' ? 'nm-danger-raised' : 'nm-primary-raised'
                      } ${
                        restoreFlow.stage === 'applying' || (restoreFlow.mode === 'replace' && !restoreFlow.replaceConfirmed)
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    >
                      {restoreFlow.mode === 'replace' ? 'Replace everything' : 'Apply restore'}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 px-1">
                Listed newest first. Deletion is permanent — app-folder files skip Drive trash — and never affects local
                snippets.
              </p>
            </div>

            {/* Database Reset Card */}
            <div className="nm-static-inset-danger-section rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-900 block text-xs">Reset to Factory Defaults</span>
                  <span className="text-[11px] text-rose-600/80">
                    Restore the starter snippets and reset all preferences
                  </span>
                </div>

                {!showResetConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 nm-danger-raised rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset...</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2.5 py-1 text-slate-600 hover:text-slate-900 nm-raised rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="px-3 py-1 nm-danger-raised font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: TRASH MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'trash' && (
          <div className="space-y-4 max-w-xl">
            {/* Header & Batch Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/70 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight">
                    Trash {trashedSnippets.length > 0 && `(${trashedSnippets.length})`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Recover deleted snippets or permanently delete them
                  </p>
                </div>
              </div>

              {trashedSnippets.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRestoreAll}
                    disabled={isRestoringAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 nm-raised text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isRestoringAll ? 'Restoring...' : 'Restore All'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEmptyTrash}
                    disabled={isEmptyingTrash}
                    className="flex items-center gap-1.5 px-3 py-1.5 nm-danger-raised rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isEmptyingTrash ? 'Emptying...' : 'Empty Trash'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Retention Notice Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl nm-static-inset-warn-section text-amber-900 text-[11px] leading-relaxed">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Automatic 3-Day Retention:</span> Snippets moved to Trash are stored for 3 days (72 hours). During this window, you can restore them anytime. Expired items are automatically deleted forever.
              </div>
            </div>

            {/* Trashed Snippets List / Empty State */}
            {trashedSnippets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-white/60 nm-static-inset-section">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/50 text-slate-400 mb-3">
                  <Trash2 className="w-6 h-6 stroke-[1.6]" />
                </div>
                <h4 className="text-xs font-bold text-slate-700 mb-1">Trash is empty</h4>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Snippets you move to trash will be kept here for 3 days before being automatically purged.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {trashedSnippets.map((snippet) => {
                  const now = Date.now();
                  const deletedTime = snippet.deletedAt || now;
                  const expiresAt = deletedTime + TRASH_RETENTION_MS;
                  const remainingMs = Math.max(0, expiresAt - now);
                  const isNearExpiry = remainingMs < 24 * 60 * 60 * 1000; // less than 24 hours

                  let remainingLabel = '';
                  if (remainingMs <= 0) {
                    remainingLabel = 'Expiring now';
                  } else {
                    const totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
                    const days = Math.floor(totalHours / 24);
                    const hours = totalHours % 24;
                    if (days > 0) {
                      remainingLabel = `${days}d ${hours}h left`;
                    } else if (totalHours > 0) {
                      remainingLabel = `${totalHours}h left`;
                    } else {
                      const mins = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
                      remainingLabel = `${mins}m left`;
                    }
                  }

                  const formattedDate = new Date(deletedTime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const category = categories.find((c) => c.id === snippet.categoryId);
                  const previewText = stripHtml(snippet.content);

                  return (
                    /* TRASH-CARD-01: vertical content order — Title → Category badge →
                       short display-only summary → Restore/Delete Forever → Remaining →
                       Deleted date. The old layout put the buttons to the RIGHT of a
                       shared band with the title, badge and expiry pill: the 206px
                       button group squeezed the left column to ~35px, crushing the
                       expiry pill into a 22px-wide column whose label wrapped
                       character-by-character (a "0d …" fragment of it read like a
                       "0." marker next to Restore) and clipping the truncated title. */
                    <div
                      key={snippet.id}
                      className="p-3.5 rounded-2xl nm-static-inset-card transition-all space-y-2.5"
                    >
                      {/* 1. Snippet title — full card width, wraps at word boundaries */}
                      <h4 className="font-bold text-slate-800 text-xs leading-snug break-words">
                        {snippet.title}
                      </h4>

                      {/* 2. Category badge (existing styling) */}
                      <div>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: category ? `${category.color}15` : '#64748b15',
                            color: category?.color || '#64748b',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: category?.color || '#64748b' }}
                          />
                          {category?.name || 'Default'}
                        </span>
                      </div>

                      {/* 3. Short display-only summary (~7 words derived from the existing
                          stripHtml preview; stored snippet content is never modified) */}
                      {previewText && (
                        <div className="text-[11px] text-slate-500 bg-white/50 rounded-xl px-3 py-2 border border-white/60 leading-relaxed font-sans">
                          {previewText.split(/\s+/).filter(Boolean).slice(0, 7).join(' ')}
                        </div>
                      )}

                      {/* 4. Actions — below the description, one row (205px ≤ 212px inner width) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreSnippet(snippet)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#9f0409] hover:text-[#7f1d1d] nm-raised rounded-xl transition-all cursor-pointer"
                          title="Restore snippet to library"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDeleteSnippet(snippet)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold nm-danger-raised rounded-xl transition-all cursor-pointer"
                          title="Permanently delete snippet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Forever</span>
                        </button>
                      </div>

                      {/* 5. Remaining time — readable text line (no narrow pill/circle) */}
                      <div
                        className={`flex items-center gap-1 text-[10px] font-semibold ${
                          isNearExpiry ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span>Remaining: {remainingLabel}</span>
                        {isNearExpiry && <span>· Expiring soon</span>}
                      </div>

                      {/* 6. Deletion date (existing format) */}
                      <div className="text-[10px] text-slate-500">
                        Deleted {formattedDate}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: ABOUT & DIAGNOSTICS */}
        {/* ======================================================== */}
        {activeTab === 'about' && (
          <div className="space-y-5 max-w-xl">
            <div className="flex items-center gap-3 p-4 nm-static-inset-section rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-[rgb(240,85,88)] flex items-center justify-center text-white shadow-md shadow-red-500/30 shrink-0">
                <Layers className="w-6 h-6" strokeWidth={2.3} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Snippet Organizer</h3>
                <p className="text-[11px] text-slate-500">
                  Personal snippet and productivity organizer Chrome Extension
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span>Version 0.1.0</span>
                  <span>·</span>
                  <span>Manifest V3</span>
                  <span>·</span>
                  <span className="text-emerald-600 font-medium">Offline-First IndexedDB</span>
                </div>
              </div>
            </div>

            <div className="nm-static-inset-section rounded-2xl p-4 space-y-2 text-slate-600 leading-relaxed text-[11px]">
              <span className="font-bold text-slate-800 block text-xs">Features & Highlights:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Instant multi-field search with debounced filtering and keyboard navigation</li>
                <li>One-click copy to clipboard with HTML + plain text fallback</li>
                <li>Custom category classification with customizable color badges</li>
                <li>Detachable floating window mode via the header pin control</li>
                <li>Full backup and restore with JSON import / export</li>
              </ul>
            </div>

            {/* ABOUT-DEV-01: Developer information card (additive, below Feature Highlights).
                Same surface/token language as the two cards above (nm-static-inset-section,
                rounded-2xl, p-4, text-[11px]); values must stay exactly as specified. */}
            <div className="nm-static-inset-section rounded-2xl p-4 space-y-2.5">
              <span className="font-bold text-slate-800 block text-xs">Developer Information:</span>

              <div className="flex items-center gap-2 text-[11px] text-slate-700">
                <User className="w-3.5 h-3.5 shrink-0 text-[rgb(240,85,88)]" />
                <span className="font-semibold">Developed by AKASH</span>
              </div>

              <a
                href="https://github.com/mdnooor/Snippet-Organizer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] text-slate-600 hover:text-[#9f0409] transition-colors rounded-lg px-1 -mx-1 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(208,2,5,0.55)] focus-visible:outline-offset-2 min-w-0"
              >
                <Github className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold shrink-0">GitHub:</span>
                <span className="break-words min-w-0">github.com/mdnooor/Snippet-Organizer</span>
              </a>

              <a
                href="mailto:md.nooor.hossain@gmail.com"
                className="flex items-center gap-2 text-[11px] text-slate-600 hover:text-[#9f0409] transition-colors rounded-lg px-1 -mx-1 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(208,2,5,0.55)] focus-visible:outline-offset-2 min-w-0"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold shrink-0">Email:</span>
                <span className="break-words min-w-0">md.nooor.hossain@gmail.com</span>
              </a>
            </div>
          </div>
        )}
      </div>

        </main>
      </div>

      {/* Footer Bar — SETTINGS-FOOTER-01: moved out of <main> to the settings root so it
          spans the full popup width beneath the sidebar, matching the full-width header.
          Classes, height, vertical position, and controls are unchanged. */}
      <div className="px-6 py-3 border-t border-white/50 bg-white/30 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
        <span>Settings auto-save on change</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[rgba(208,2,5,0.6)] hover:bg-[rgba(208,2,5,0.45)] rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        )}
      </div>

      {/* CAT-DEL-MODAL-01: Category Deletion Decision Modal.
          Opens from the category Delete action instead of deleting immediately.
          Two mutually exclusive choices; nothing happens until Delete is pressed. */}
      {categoryDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6 animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeletingCategory) {
              setCategoryDeleteModal(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Delete category ${categoryDeleteModal.name}`}
            className="nm-raised rounded-2xl p-4 w-[340px] max-w-full animate-in zoom-in-95 duration-150"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header: identifies the category being deleted */}
            <div className="flex items-start gap-2.5 pb-3 border-b border-white/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/70 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-xs tracking-tight leading-tight">
                  Delete &quot;{categoryDeleteModal.name}&quot;?
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose what happens to its snippets.
                </p>
              </div>
            </div>

            {/* Two mutually exclusive options */}
            <div role="radiogroup" aria-label="Deletion options" className="space-y-2 py-3">
              <button
                type="button"
                role="radio"
                aria-checked={categoryDeleteChoice === 'keep-snippets'}
                disabled={isDeletingCategory}
                onClick={() => setCategoryDeleteChoice('keep-snippets')}
                className={`w-full flex items-start gap-2.5 text-left p-3 rounded-xl cursor-pointer transition-all disabled:cursor-not-allowed ${
                  categoryDeleteChoice === 'keep-snippets'
                    ? 'nm-primary-inset text-white'
                    : 'nm-raised text-slate-700 hover:text-slate-900'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 mt-0.5 rounded-full shrink-0 border-2 transition-colors ${
                    categoryDeleteChoice === 'keep-snippets'
                      ? 'border-white/90 bg-white/25'
                      : 'border-slate-300/80'
                  }`}
                >
                  {categoryDeleteChoice === 'keep-snippets' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-tight">Only Delete Category</span>
                  <span className={`block text-[11px] leading-snug mt-0.5 ${categoryDeleteChoice === 'keep-snippets' ? 'text-white/85' : 'text-slate-500'}`}>
                    Keep the snippets and move them to the default category.
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={categoryDeleteChoice === 'delete-snippets'}
                disabled={isDeletingCategory}
                onClick={() => setCategoryDeleteChoice('delete-snippets')}
                className={`w-full flex items-start gap-2.5 text-left p-3 rounded-xl cursor-pointer transition-all disabled:cursor-not-allowed ${
                  categoryDeleteChoice === 'delete-snippets'
                    ? 'nm-primary-inset text-white'
                    : 'nm-raised text-slate-700 hover:text-slate-900'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 mt-0.5 rounded-full shrink-0 border-2 transition-colors ${
                    categoryDeleteChoice === 'delete-snippets'
                      ? 'border-white/90 bg-white/25'
                      : 'border-slate-300/80'
                  }`}
                >
                  {categoryDeleteChoice === 'delete-snippets' && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-tight">Delete Category with Snippets</span>
                  <span className={`block text-[11px] leading-snug mt-0.5 ${categoryDeleteChoice === 'delete-snippets' ? 'text-white/85' : 'text-slate-500'}`}>
                    Delete this category and its associated snippets.
                  </span>
                </span>
              </button>
            </div>

            {/* Footer: Cancel closes without changes; Delete runs the chosen option */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setCategoryDeleteModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 nm-raised rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={handleConfirmCategoryDelete}
                className="px-3 py-1.5 text-xs font-semibold text-white nm-danger-raised rounded-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeletingCategory ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
