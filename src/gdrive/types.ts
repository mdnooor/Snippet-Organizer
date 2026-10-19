/**
 * GD-01 — Cloud snapshot contract types.
 *
 * Canonical specification: docs/google-drive-integration/data-contract.md
 * Decisions: DECISIONS.md ADR-010 (per-user drive.appdata storage), ADR-011 (v2 envelope
 * + conflict vocabulary). Final user decisions D1/D3/D4/D5/D6 recorded 2026-10-18.
 *
 * This module is PURE: it never touches IndexedDB, chrome.* APIs, the network, or the DOM.
 * Cloud data is untrusted input; parsed values are copied/normalized, never written back
 * to any store by this module (restore writes are GD-05).
 */
import type { BackupData, Category, Preferences, Snippet } from '../types';

/** Envelope format identifier. Recognizes our files among arbitrary JSON. */
export const SNAPSHOT_FORMAT_ID = 'snippet-organizer-backup' as const;

/** Current envelope schema version (the payload inside stays BackupData v1-shaped). */
export const SNAPSHOT_SCHEMA_VERSION = 2 as const;

/** Integrity algorithm. SHA-256 over the canonical JSON of `payload`.
 *  Detects accidental corruption ONLY — it is not keyed/signed and proves no authenticity. */
export const SNAPSHOT_INTEGRITY_ALGORITHM = 'sha256' as const;

/** Parse guard: reject absurdly large inputs before JSON.parse (DoS/accident guard, not a
 *  storage quota). Override via parse options when a larger snapshot is genuinely expected. */
export const DEFAULT_MAX_SNAPSHOT_BYTES = 50 * 1024 * 1024;

/**
 * The payload of a cloud snapshot. Structurally the existing local `BackupData` v1 format
 * (so local files stay compatible), with two contract differences:
 *  - `snippets` MUST include trashed records (`deletedAt` preserved) — full-fidelity snapshots;
 *  - `preferences` is optional (absent preferences simply leave local preferences untouched).
 */
export interface SnapshotPayload {
  version: number; // payload format version; 1 = BackupData v1 shape (unchanged)
  exportedAt: number; // epoch ms, matches v1 convention
  appName: string;
  snippets: Snippet[];
  categories: Category[];
  preferences?: Preferences;
}

/**
 * The v2 cloud snapshot envelope. One file = one point-in-time snapshot.
 * `backupId` is the APPLICATION-level stable identity, computed deterministically from
 * content + creation time. It is NOT the Drive file ID: Drive assigns its own resource
 * ID per uploaded file (surfaced only in SnapshotListEntry, never stored in the file).
 */
export interface CloudSnapshotEnvelope {
  format: typeof SNAPSHOT_FORMAT_ID;
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  backupId: string; // 'bk-<compactUtc>-<digest8>'
  displayName: string; // user-facing label; duplicates allowed (Drive file ID disambiguates)
  createdAt: string; // ISO-8601 UTC
  appVersion: string; // extension version at creation; 'unknown' for migrated legacy files
  payload: SnapshotPayload;
  integrity: { algorithm: typeof SNAPSHOT_INTEGRITY_ALGORITHM; digest: string };
}

/** Metadata for browsing stored snapshots (GD-04). Lives OUTSIDE the file; `sizeBytes` is
 *  the byte length of the stored file and `driveFileId` is Drive's resource ID. */
export interface SnapshotListEntry {
  backupId: string;
  driveFileId: string;
  displayName: string;
  createdAt: string;
  appVersion: string;
  schemaVersion: number;
  sizeBytes: number;
}

export interface SnapshotWarning {
  code:
    | 'legacy-v1-migrated'
    | 'record-quarantined'
    | 'duplicate-id-in-snapshot'
    | 'preferences-absent'
    | 'preferences-invalid'
    | 'unknown-fields-ignored';
  message: string;
  recordIndex?: number;
  recordId?: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ParsedSnapshot =
  | { status: 'ok'; snapshot: CloudSnapshotEnvelope; warnings: SnapshotWarning[] }
  | { status: 'parse-error'; message: string }
  | { status: 'invalid'; issues: ValidationIssue[] }
  /** Future schema version: never best-effort parsed; rejected with the observed value. */
  | { status: 'unsupported-version'; observedSchemaVersion: number | null; message: string };

export interface BuildSnapshotInput {
  /** Full-fidelity library state: ACTIVE AND TRASHED snippets (deletion tombstones preserved). */
  snippets: Snippet[];
  categories: Category[];
  preferences?: Preferences;
  appVersion: string;
  /** Explicit creation instant (epoch ms) — passed in so builds stay deterministic and testable. */
  createdAtMs: number;
  displayName?: string;
}

export interface BuiltSnapshot {
  envelope: CloudSnapshotEnvelope;
  /** Pretty-printed UTF-8 JSON exactly as it should be uploaded/stored. */
  serialized: string;
  sizeBytes: number;
}
