// SNIPPET-KBD-01/02: shared helpers for in-UI snippet-list keyboard shortcuts.
// These bindings are handled by the focused extension UI (MainPopup), never as
// browser-global commands — Chrome's commands API cannot register standalone
// Shift, modifier-only Ctrl+Shift gestures, or Space.

import type { UIShortcutBindings } from './types';

/** SNIPPET-KBD-02 defaults (mirrored in DEFAULT_PREFERENCES — kept in one place here). */
export const DEFAULT_UI_SHORTCUTS: UIShortcutBindings = {
  focusSearch: 'Ctrl+Shift+S',
  copy: 'Enter',
  clearSearch: 'Backspace',
};

/** Keys that are safe as unmodified bindings (never produce text or navigate). */
const FUNCTIONAL_KEYS = new Set([
  'Space',
  'Enter',
  'Backspace',
  'Delete',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
]);

/**
 * SNIPPET-KBD-02: coerce any stored uiShortcuts (including the removed
 * SNIPPET-KBD-01 shape) into the current schema. Obsolete keys are dropped;
 * a stored copy binding of 'Space' was the removed default, not a deliberate
 * customization, so it migrates to the new default.
 */
export function normalizeUiShortcuts(raw: unknown): UIShortcutBindings {
  const stored = (raw ?? {}) as Partial<Record<keyof UIShortcutBindings, unknown>>;
  const pick = (key: keyof UIShortcutBindings, fallback: string) => {
    const value = stored[key];
    if (typeof value === 'string' && value.trim()) {
      const parsed = parseShortcut(value);
      if (key === 'copy' && parsed && formatShortcut(parsed) === 'Space') {
        return fallback; // obsolete SNIPPET-KBD-01 default, not a customization
      }
      return value.trim();
    }
    return fallback;
  };
  return {
    focusSearch: pick('focusSearch', DEFAULT_UI_SHORTCUTS.focusSearch),
    copy: pick('copy', DEFAULT_UI_SHORTCUTS.copy),
    clearSearch: pick('clearSearch', DEFAULT_UI_SHORTCUTS.clearSearch),
  };
}

export interface ParsedShortcut {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  /** Normalized non-modifier key ('Space', 'Enter', 'F2', 'a', ...) or null for a modifier-only gesture. */
  key: string | null;
}

const MODIFIER_NAMES = new Set(['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd', 'command']);

/** Normalize a keyboard event's `key` to the canonical token used in bindings. */
export function normalizeEventKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toLowerCase();
  return key;
}

/**
 * Parse a binding string like 'Shift', 'Ctrl+Shift', 'Alt+J' or 'Space'.
 * Returns null for an empty/unparseable string.
 */
export function parseShortcut(binding: string | undefined | null): ParsedShortcut | null {
  if (!binding) return null;
  const parts = binding
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const parsed: ParsedShortcut = { ctrl: false, alt: false, shift: false, meta: false, key: null };
  let sawNonModifier = false;
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (MODIFIER_NAMES.has(lower)) {
      if (lower === 'ctrl' || lower === 'control') parsed.ctrl = true;
      else if (lower === 'alt') parsed.alt = true;
      else if (lower === 'shift') parsed.shift = true;
      else parsed.meta = true;
    } else if (!sawNonModifier) {
      parsed.key = normalizeEventKey(part);
      sawNonModifier = true;
    } else {
      return null; // two non-modifier keys — unsupported
    }
  }
  return parsed;
}

/** Canonical display/storage form, e.g. {ctrl,shift} → 'Ctrl+Shift'. */
export function formatShortcut(parsed: ParsedShortcut): string {
  const parts: string[] = [];
  if (parsed.ctrl) parts.push('Ctrl');
  if (parsed.alt) parts.push('Alt');
  if (parsed.shift) parts.push('Shift');
  if (parsed.meta) parts.push('Meta');
  if (parsed.key !== null) parts.push(parsed.key);
  return parts.join('+');
}

export interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/** True when a keyboard event matches a parsed binding exactly. */
export function matchShortcut(e: KeyEventLike, parsed: ParsedShortcut | null): boolean {
  if (!parsed) return false;
  const eventKey = normalizeEventKey(e.key);
  const eventIsModifierPress = MODIFIER_NAMES.has(eventKey.toLowerCase());
  if (parsed.key === null) {
    // Modifier-only gesture: every non-modifier keydown must NOT match; only the
    // final modifier keydown of the exact modifier set matches.
    if (!eventIsModifierPress) return false;
    const pressed = {
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
    };
    const eventMods = { ...pressed };
    // The event's own key is the last modifier pressed; reflect it in the set.
    const lower = eventKey.toLowerCase();
    if (lower === 'shift') eventMods.shift = true;
    else if (lower === 'control') eventMods.ctrl = true;
    else if (lower === 'alt') eventMods.alt = true;
    else if (lower === 'meta') eventMods.meta = true;
    return (
      eventMods.ctrl === parsed.ctrl &&
      eventMods.alt === parsed.alt &&
      eventMods.shift === parsed.shift &&
      eventMods.meta === parsed.meta
    );
  }
  // Key gesture: modifiers must match exactly and the key must match.
  return (
    eventKey === parsed.key &&
    e.ctrlKey === parsed.ctrl &&
    e.altKey === parsed.alt &&
    e.shiftKey === parsed.shift &&
    e.metaKey === parsed.meta
  );
}

export interface ShortcutValidationResult {
  ok: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validate a user-captured binding for a given action (SNIPPET-KBD-02 rules).
 * Rules:
 *  - must contain at least one of Ctrl/Alt/Meta, OR be a functional key
 *    (Space/Enter/Backspace/arrows/etc.) without modifiers — plain
 *    letters/digits/punctuation are rejected because they would collide with
 *    normal typing;
 *  - Escape is reserved for dismiss/back navigation;
 *  - standalone Shift is rejected (Shift is reserved for typing; arrow keys are
 *    the navigation mechanism);
 *  - must not duplicate another action's binding (conflict).
 */
export function validateShortcut(
  binding: string,
  _action: keyof UIShortcutBindings,
  otherBindings: string[]
): ShortcutValidationResult {
  const parsed = parseShortcut(binding);
  if (!parsed) return { ok: false, error: 'Unrecognized key combination.' };
  if (parsed.key === null) {
    // Modifier-only gestures (e.g. Ctrl+Shift) can never fire an action — the
    // handler only matches on a non-modifier keydown. Reject them outright so
    // no stored binding is displayed that is not actually implemented.
    return { ok: false, error: 'End the shortcut with a non-modifier key.' };
  }
  if (parsed.key === 'Escape') return { ok: false, error: 'Escape is reserved for dismiss/back.' };
  if (parsed.key === 'ArrowUp' || parsed.key === 'ArrowDown') {
    return { ok: false, error: 'Arrow keys are the fixed navigation mechanism.' };
  }
  if (parsed.key === 'Tab') {
    return { ok: false, error: 'Tab is reserved for keyboard focus navigation.' };
  }

  const hasStrongModifier = parsed.ctrl || parsed.alt || parsed.meta;
  const isFunctionalKey = parsed.key !== null && FUNCTIONAL_KEYS.has(parsed.key);
  const isStandaloneShift = parsed.shift && !hasStrongModifier && parsed.key === null;

  if (isStandaloneShift) {
    return { ok: false, error: 'Shift is reserved for typing — navigation uses the arrow keys.' };
  }
  if (!hasStrongModifier && !isFunctionalKey) {
    return {
      ok: false,
      error: 'Use a combo with Ctrl/Alt/Meta or a functional key (Enter, Backspace, Space, arrows).',
    };
  }

  const normalized = formatShortcut(parsed);
  const conflict = otherBindings.find((b) => {
    const other = parseShortcut(b);
    return other && formatShortcut(other) === normalized;
  });
  if (conflict) {
    return { ok: false, error: `Conflicts with another action already using ${conflict}.` };
  }
  return { ok: true, normalized };
}

/** True while the user is typing in an editable surface. */
export function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}
