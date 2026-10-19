/**
 * GD-01 — Cloud snapshot build / parse / integrity / legacy migration. PURE module.
 *
 * Canonical specification: docs/google-drive-integration/data-contract.md
 * Final decisions implemented here (user-approved 2026-10-18):
 *  - D4: v2 envelope around the existing BackupData v1 payload; snapshots include trashed
 *    snippets (tombstones preserved); UTC-based naming; local file export behavior unchanged.
 *  - D5: record identity is snippet `id`; validation never mutates local state.
 *  - Integrity: SHA-256 over the canonical JSON of `payload` — corruption detection ONLY.
 *  - Version policy: schemaVersion 2 = current; > 2 rejected (never best-effort parsed);
 *    bare v1 local backup files are migrated on read (legacy-v1-migrated warning).
 *
 * All functions are synchronous-pure or async-pure: no IndexedDB, no chrome.* APIs, no
 * network, no DOM, no mutation of caller-owned objects.
 */
import type { Category, Preferences, Snippet } from '../types';
import {
  type BuildSnapshotInput,
  type BuiltSnapshot,
  type CloudSnapshotEnvelope,
  DEFAULT_MAX_SNAPSHOT_BYTES,
  type ParsedSnapshot,
  SNAPSHOT_FORMAT_ID,
  SNAPSHOT_INTEGRITY_ALGORITHM,
  SNAPSHOT_SCHEMA_VERSION,
  type SnapshotPayload,
  type SnapshotWarning,
  type ValidationIssue,
} from './types';

const APP_NAME = 'Snippet Organizer';
const FALLBACK_CATEGORY_COLOR = '#4f46e5';
const SNIPPET_FIELDS = [
  'id', 'title', 'content', 'categoryId', 'isFavorite',
  'createdAt', 'updatedAt', 'lastUsedAt', 'deletedAt', 'version',
] as const;
const CATEGORY_FIELDS = ['id', 'name', 'color'] as const;

// ---------------------------------------------------------------------------
// Canonical JSON + hashing
// ---------------------------------------------------------------------------

/**
 * Deterministic JSON serialization: object keys sorted recursively, insignificant
 * whitespace removed. Two structurally equal payloads always serialize identically,
 * so the integrity digest is stable across machines and runs.
 */
export function canonicalJson(value: unknown): string {
  if (value === undefined || value === null || typeof value === 'function') return 'null';
  if (typeof value === 'bigint') return JSON.stringify(value.toString());
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

/** SHA-256 hex digest of a UTF-8 string. Uses WebCrypto (available in Chrome and Node). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

// ---------------------------------------------------------------------------
// Time + naming (UTC only)
// ---------------------------------------------------------------------------

export function toIsoUtc(ms: number): string {
  return new Date(ms).toISOString();
}

/** 2026-10-18T10:30:00.000Z -> "20261018T103000Z" */
export function toCompactUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** UTC-based snapshot file naming (D4): snippet-organizer-snapshot-20261018T103000Z.json */
export function createSnapshotFileName(createdAtMs: number): string {
  return `snippet-organizer-snapshot-${toCompactUtc(createdAtMs)}.json`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/**
 * Build a v2 snapshot from full-fidelity library state.
 * The caller MUST pass active AND trashed snippets (cloud snapshots preserve tombstones).
 * Pure: inputs are shallow-copied, never mutated.
 */
export async function buildCloudSnapshot(input: BuildSnapshotInput): Promise<BuiltSnapshot> {
  if (!Array.isArray(input.snippets)) throw new TypeError('snippets must be an array');
  if (!Array.isArray(input.categories)) throw new TypeError('categories must be an array');
  if (!Number.isFinite(input.createdAtMs)) throw new TypeError('createdAtMs must be a finite epoch-ms number');

  const payload: SnapshotPayload = {
    version: 1, // payload format = BackupData v1 shape; envelope carries schemaVersion 2
    exportedAt: Math.trunc(input.createdAtMs),
    appName: APP_NAME,
    snippets: input.snippets.map((s) => ({ ...s })),
    categories: input.categories.map((c) => ({ ...c })),
    ...(input.preferences !== undefined ? { preferences: { ...input.preferences } } : {}),
  };
  const digest = await sha256Hex(canonicalJson(payload));
  const backupId = `bk-${toCompactUtc(input.createdAtMs)}-${digest.slice(0, 8)}`;
  const displayName =
    input.displayName ?? createSnapshotFileName(input.createdAtMs).replace(/\.json$/, '');
  const envelope: CloudSnapshotEnvelope = {
    format: SNAPSHOT_FORMAT_ID,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    backupId,
    displayName,
    createdAt: toIsoUtc(input.createdAtMs),
    appVersion: input.appVersion,
    payload,
    integrity: { algorithm: SNAPSHOT_INTEGRITY_ALGORITHM, digest },
  };
  const serialized = JSON.stringify(envelope, null, 2);
  return { envelope, serialized, sizeBytes: byteLength(serialized) };
}

// ---------------------------------------------------------------------------
// Parse / validate (cloud data is UNTRUSTED input)
// ---------------------------------------------------------------------------

export interface ParseSnapshotOptions {
  /** Parse guard in bytes. Default DEFAULT_MAX_SNAPSHOT_BYTES. */
  maxBytes?: number;
}

/**
 * Parse untrusted snapshot JSON into a validated, normalized envelope.
 * Never mutates local state; the returned envelope is a fresh copy.
 *  - Envelope (format === 'snippet-organizer-backup'): strict validation.
 *  - Bare v1 BackupData shape: migrated to a v2 envelope (lenient record coercion that
 *    mirrors the existing local import behavior — see data-contract.md).
 *  - Newer schemaVersion: rejected as unsupported-version (never best-effort parsed).
 */
export async function parseCloudSnapshot(
  json: string,
  options: ParseSnapshotOptions = {},
): Promise<ParsedSnapshot> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_SNAPSHOT_BYTES;
  if (byteLength(json) > maxBytes) {
    return {
      status: 'invalid',
      issues: [
        {
          path: '(file)',
          message: `Snapshot exceeds the maximum allowed size (${byteLength(json)} > ${maxBytes} bytes).`,
        },
      ],
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (err) {
    return {
      status: 'parse-error',
      message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { status: 'invalid', issues: [{ path: '(root)', message: 'Snapshot must be a JSON object.' }] };
  }
  const obj = raw as Record<string, unknown>;

  if (obj.format === SNAPSHOT_FORMAT_ID) return parseEnvelope(obj);
  if (Array.isArray(obj.snippets) && Array.isArray(obj.categories)) return migrateLegacyV1(obj);
  return {
    status: 'invalid',
    issues: [
      {
        path: '(root)',
        message:
          'Unrecognized snapshot: neither a v2 cloud snapshot envelope nor a v1 (BackupData) backup file.',
      },
    ],
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Legacy leniency: accepts numeric strings (e.g. "1717000000000") the way the existing
 *  v1 importer coerces with Number(). Strict mode accepts finite numbers only. */
function coerceNumberLike(value: unknown, lenient: boolean): number | null {
  const direct = finiteNumber(value);
  if (direct !== null) return direct;
  if (lenient && typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function recordIdOf(item: unknown): string | undefined {
  if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
    const id = (item as Record<string, unknown>).id;
    if (typeof id === 'string') return id;
  }
  return undefined;
}

function hasUnknownFields(item: unknown, known: readonly string[]): boolean {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  return Object.keys(item as Record<string, unknown>).some((k) => !(known as readonly string[]).includes(k));
}

type SnippetRecordResult = { record: Snippet; unknownFields: boolean } | string;

/**
 * Normalize one snippet record. Returns the failure reason (string) when the record must
 * be quarantined. Strict mode (v2 envelopes): types must match exactly.
 * Lenient mode (legacy v1 migration): mirrors the existing local import coercion
 * (Boolean(isFavorite), version fallback 0, nullable timestamps fall back to null) so v1
 * files import exactly as they did before — but quarantines are REPORTED, never silent.
 */
function normalizeSnippetRecord(item: unknown, lenient: boolean): SnippetRecordResult {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return 'record is not an object';
  const o = item as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0) return 'id must be a non-empty string';
  if (typeof o.title !== 'string' || o.title.trim().length === 0) return 'title must be a non-empty string';
  if (typeof o.content !== 'string') return 'content must be a string';
  if (typeof o.categoryId !== 'string' || o.categoryId.length === 0) return 'categoryId must be a non-empty string';
  if (typeof o.isFavorite !== 'boolean' && !lenient) return 'isFavorite must be a boolean';

  // Numeric coercion for legacy v1 files, mirroring importData's Number(...) coercion.
  const createdAt = coerceNumberLike(o.createdAt, lenient);
  if (createdAt === null) return 'createdAt must be a finite number';
  const updatedAt = coerceNumberLike(o.updatedAt, lenient);
  if (updatedAt === null) return 'updatedAt must be a finite number';

  let lastUsedAt: number | null = null;
  if (o.lastUsedAt !== null && o.lastUsedAt !== undefined) {
    const v = finiteNumber(o.lastUsedAt);
    if (v === null) {
      if (!lenient) return 'lastUsedAt must be a finite number or null';
    } else {
      lastUsedAt = v;
    }
  }
  let deletedAt: number | null = null;
  if (o.deletedAt !== null && o.deletedAt !== undefined) {
    const v = finiteNumber(o.deletedAt);
    if (v === null) {
      if (!lenient) return 'deletedAt must be a finite number or null';
    } else {
      deletedAt = v;
    }
  }
  let version = 0;
  if (o.version !== null && o.version !== undefined) {
    const v = finiteNumber(o.version);
    if (v === null || v < 0) {
      if (!lenient) return 'version must be a finite non-negative number';
    } else {
      version = v;
    }
  }

  return {
    record: {
      id: o.id,
      title: o.title,
      content: o.content,
      categoryId: o.categoryId,
      isFavorite: typeof o.isFavorite === 'boolean' ? o.isFavorite : Boolean(o.isFavorite),
      createdAt,
      updatedAt,
      lastUsedAt,
      deletedAt,
      version,
    },
    unknownFields: hasUnknownFields(item, SNIPPET_FIELDS),
  };
}

type CategoryRecordResult = { record: Category; unknownFields: boolean } | string;

function normalizeCategoryRecord(item: unknown): CategoryRecordResult {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return 'record is not an object';
  const o = item as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0) return 'id must be a non-empty string';
  if (typeof o.name !== 'string' || o.name.trim().length === 0) return 'name must be a non-empty string';
  return {
    record: {
      id: o.id,
      name: o.name,
      color: typeof o.color === 'string' && o.color.length > 0 ? o.color : FALLBACK_CATEGORY_COLOR,
    },
    unknownFields: hasUnknownFields(item, CATEGORY_FIELDS),
  };
}

function validateSnippetRecords(
  value: unknown,
  warnings: SnapshotWarning[],
  basePath: string,
  lenient = false,
): Snippet[] {
  const out: Snippet[] = [];
  if (!Array.isArray(value)) {
    warnings.push({ code: 'record-quarantined', message: `${basePath} is not an array; no records were read.` });
    return out;
  }
  const seen = new Set<string>();
  (value as unknown[]).forEach((item, index) => {
    const result = normalizeSnippetRecord(item, lenient);
    if (typeof result === 'string') {
      warnings.push({
        code: 'record-quarantined',
        message: `${basePath}[${index}] quarantined: ${result}`,
        recordIndex: index,
        recordId: recordIdOf(item),
      });
      return;
    }
    if (seen.has(result.record.id)) {
      warnings.push({
        code: 'duplicate-id-in-snapshot',
        message: `${basePath}[${index}] repeats id "${result.record.id}"; the first occurrence is kept.`,
        recordIndex: index,
        recordId: result.record.id,
      });
      return;
    }
    seen.add(result.record.id);
    if (result.unknownFields) {
      warnings.push({
        code: 'unknown-fields-ignored',
        message: `${basePath}[${index}] contains unknown fields; they were ignored.`,
        recordIndex: index,
        recordId: result.record.id,
      });
    }
    out.push(result.record);
  });
  return out;
}

function validateCategoryRecords(value: unknown, warnings: SnapshotWarning[], basePath: string): Category[] {
  const out: Category[] = [];
  if (!Array.isArray(value)) {
    warnings.push({ code: 'record-quarantined', message: `${basePath} is not an array; no records were read.` });
    return out;
  }
  const seen = new Set<string>();
  (value as unknown[]).forEach((item, index) => {
    const result = normalizeCategoryRecord(item);
    if (typeof result === 'string') {
      warnings.push({
        code: 'record-quarantined',
        message: `${basePath}[${index}] quarantined: ${result}`,
        recordIndex: index,
        recordId: recordIdOf(item),
      });
      return;
    }
    if (seen.has(result.record.id)) {
      warnings.push({
        code: 'duplicate-id-in-snapshot',
        message: `${basePath}[${index}] repeats category id "${result.record.id}"; the first occurrence is kept.`,
        recordIndex: index,
        recordId: result.record.id,
      });
      return;
    }
    seen.add(result.record.id);
    out.push(result.record);
  });
  return out;
}

async function parseEnvelope(obj: Record<string, unknown>): Promise<ParsedSnapshot> {
  const issues: ValidationIssue[] = [];

  const schemaVersion = obj.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isFinite(schemaVersion)) {
    return {
      status: 'invalid',
      issues: [{ path: 'schemaVersion', message: 'schemaVersion must be a finite number.' }],
    };
  }
  if (schemaVersion > SNAPSHOT_SCHEMA_VERSION) {
    return {
      status: 'unsupported-version',
      observedSchemaVersion: schemaVersion,
      message: `Snapshot schema version ${schemaVersion} is newer than this app supports (v${SNAPSHOT_SCHEMA_VERSION}). Update the app to read this snapshot; nothing was changed.`,
    };
  }
  if (schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    return {
      status: 'invalid',
      issues: [
        {
          path: 'schemaVersion',
          message: `Envelope schemaVersion must be ${SNAPSHOT_SCHEMA_VERSION}; bare v1 backup files carry no envelope.`,
        },
      ],
    };
  }

  const backupId = typeof obj.backupId === 'string' ? obj.backupId : '';
  const displayName = typeof obj.displayName === 'string' ? obj.displayName : '';
  const createdAt = typeof obj.createdAt === 'string' && !Number.isNaN(Date.parse(obj.createdAt)) ? obj.createdAt : '';
  const appVersion = typeof obj.appVersion === 'string' ? obj.appVersion : '';
  if (backupId.length === 0) issues.push({ path: 'backupId', message: 'backupId must be a non-empty string.' });
  if (displayName === '') issues.push({ path: 'displayName', message: 'displayName must be a non-empty string.' });
  if (createdAt === '') issues.push({ path: 'createdAt', message: 'createdAt must be an ISO-8601 date-time string.' });
  if (obj.appVersion !== undefined && appVersion === '') {
    issues.push({ path: 'appVersion', message: 'appVersion must be a string when present.' });
  }

  let digest: string | null = null;
  const integrity = obj.integrity;
  if (typeof integrity !== 'object' || integrity === null || Array.isArray(integrity)) {
    issues.push({ path: 'integrity', message: 'integrity block is required.' });
  } else {
    const integ = integrity as Record<string, unknown>;
    if (integ.algorithm !== SNAPSHOT_INTEGRITY_ALGORITHM) {
      issues.push({ path: 'integrity.algorithm', message: `integrity.algorithm must be "${SNAPSHOT_INTEGRITY_ALGORITHM}".` });
    }
    const rawDigest = integ.digest;
    if (typeof rawDigest !== 'string' || !/^[0-9a-fA-F]{64}$/.test(rawDigest)) {
      issues.push({ path: 'integrity.digest', message: 'integrity.digest must be a 64-character hex SHA-256 string.' });
    } else {
      digest = rawDigest.toLowerCase();
    }
  }

  const payloadRaw = obj.payload;
  if (typeof payloadRaw !== 'object' || payloadRaw === null || Array.isArray(payloadRaw)) {
    issues.push({ path: 'payload', message: 'payload object is required.' });
    return { status: 'invalid', issues };
  }
  if (issues.length > 0) return { status: 'invalid', issues };

  // Integrity check BEFORE trusting payload contents (corruption detection only — not authenticity).
  const actualDigest = await sha256Hex(canonicalJson(payloadRaw));
  if (digest !== actualDigest) {
    return {
      status: 'invalid',
      issues: [
        {
          path: 'integrity.digest',
          message:
            'Integrity digest mismatch: the payload is corrupted or was modified after the snapshot was created. The snapshot was not applied.',
        },
      ],
    };
  }

  const payload = payloadRaw as Record<string, unknown>;
  const payloadVersion = finiteNumber(payload.version);
  if (payloadVersion !== 1) {
    return {
      status: 'invalid',
      issues: [
        {
          path: 'payload.version',
          message: `payload.version must be 1 (BackupData v1 shape); observed ${JSON.stringify(payload.version ?? null)}.`,
        },
      ],
    };
  }

  const warnings: SnapshotWarning[] = [];
  const snippets = validateSnippetRecords(payload.snippets, warnings, 'payload.snippets');
  const categories = validateCategoryRecords(payload.categories, warnings, 'payload.categories');

  let exportedAt = Date.parse(createdAt);
  const payloadExportedAt = finiteNumber(payload.exportedAt);
  if (payloadExportedAt !== null) exportedAt = payloadExportedAt;
  const appName =
    typeof payload.appName === 'string' && payload.appName.length > 0 ? payload.appName : APP_NAME;

  let preferences: Preferences | undefined;
  if (payload.preferences === undefined) {
    warnings.push({
      code: 'preferences-absent',
      message: 'Snapshot carries no preferences; local preferences will be left untouched on restore.',
    });
  } else if (typeof payload.preferences === 'object' && payload.preferences !== null && !Array.isArray(payload.preferences)) {
    preferences = payload.preferences as Preferences;
  } else {
    warnings.push({
      code: 'preferences-invalid',
      message: 'Snapshot preferences are malformed; they will be ignored.',
    });
  }

  const envelope: CloudSnapshotEnvelope = {
    format: SNAPSHOT_FORMAT_ID,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    backupId,
    displayName,
    createdAt,
    appVersion,
    payload: {
      version: 1,
      exportedAt,
      appName,
      snippets,
      categories,
      ...(preferences !== undefined ? { preferences } : {}),
    },
    integrity: { algorithm: SNAPSHOT_INTEGRITY_ALGORITHM, digest: digest as string },
  };
  return { status: 'ok', snapshot: envelope, warnings };
}

/**
 * Legacy migration: a bare v1 BackupData file (the existing local backup format) is read
 * into a v2 envelope in memory. The LOCAL export/import behavior is unchanged — this only
 * defines how v1 files become v2 snapshots (D4 compatibility rule).
 */
async function migrateLegacyV1(obj: Record<string, unknown>): Promise<ParsedSnapshot> {
  const warnings: SnapshotWarning[] = [
    {
      code: 'legacy-v1-migrated',
      message: 'Recognized a bare v1 (BackupData) backup file; migrated into a v2 snapshot envelope in memory.',
    },
  ];

  const exportedAt = finiteNumber(obj.exportedAt) ?? Date.now();
  const appName = typeof obj.appName === 'string' && obj.appName.length > 0 ? obj.appName : APP_NAME;
  const snippets = validateSnippetRecords(obj.snippets, warnings, 'snippets', true);
  const categories = validateCategoryRecords(obj.categories, warnings, 'categories');

  let preferences: Preferences | undefined;
  if (obj.preferences === undefined) {
    warnings.push({
      code: 'preferences-absent',
      message: 'Legacy file carries no preferences; local preferences will be left untouched on restore.',
    });
  } else if (typeof obj.preferences === 'object' && obj.preferences !== null && !Array.isArray(obj.preferences)) {
    preferences = obj.preferences as Preferences;
  } else {
    warnings.push({ code: 'preferences-invalid', message: 'Legacy preferences are malformed; they will be ignored.' });
  }

  const payload: SnapshotPayload = {
    version: 1,
    exportedAt,
    appName,
    snippets,
    categories,
    ...(preferences !== undefined ? { preferences } : {}),
  };
  const digest = await sha256Hex(canonicalJson(payload));
  const envelope: CloudSnapshotEnvelope = {
    format: SNAPSHOT_FORMAT_ID,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    backupId: `bk-${toCompactUtc(exportedAt)}-${digest.slice(0, 8)}`,
    displayName: `Imported local backup ${toCompactUtc(exportedAt)}`,
    createdAt: toIsoUtc(exportedAt),
    appVersion: 'unknown',
    payload,
    integrity: { algorithm: SNAPSHOT_INTEGRITY_ALGORITHM, digest },
  };
  return { status: 'ok', snapshot: envelope, warnings };
}
