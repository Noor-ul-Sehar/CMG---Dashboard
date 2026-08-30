import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import type { PoolClient } from "pg";
import { db, query } from "@/lib/db/client";
import {
  APPROVAL_STATUSES,
  CASE_STATUSES,
} from "@/lib/constants";
import { getField, type ReferenceNames } from "@/lib/import/fields";
import type {
  ImportRowResult,
  ImportValidationSummary,
  MasterDecisions,
  MasterDecision,
  MasterValueAnalysis,
} from "@/types";

const MAX_ROWS = 5000;
const MAX_COLUMNS = 200;

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportFileError";
  }
}

// ------------------------------------------------------------------
// PARSING
// ------------------------------------------------------------------

export interface ParsedImport {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
}

function headerText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in (value as object)) {
    return String((value as { text: unknown }).text);
  }
  return String(value).replace(/^\uFEFF/, "").trim();
}

export function cellToDisplay(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dateToDisplay(value);
  if (typeof value === "number") return String(value);
  const obj = value as { richText?: { text: string }[]; text?: string };
  if (Array.isArray(obj?.richText)) {
    return obj.richText.map((r) => r.text).join("");
  }
  if (typeof obj?.text === "string") return obj.text;
  return String(value);
}

export async function parseImportBuffer(
  buffer: Buffer,
  filename: string
): Promise<ParsedImport> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "xlsx" && ext !== "csv") {
    throw new ImportFileError(
      "Unsupported file type. Please upload a .xlsx or .csv file. The legacy .xls format is not supported — re-save the file as .xlsx or .csv."
    );
  }

  const workbook = new ExcelJS.Workbook();
  try {
    if (ext === "xlsx") {
      await workbook.xlsx.load(
        buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]
      );
    } else {
      await workbook.csv.read(Readable.from(buffer));
    }
  } catch {
    throw new ImportFileError(
      "Unable to read the file. Please check that it is a valid Excel or CSV file."
    );
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new ImportFileError("The file contains no worksheets or data.");
  }

  const headerRow = sheet.getRow(1);
  const colCount = Math.min(
    Math.max(sheet.columnCount, headerRow.cellCount),
    MAX_COLUMNS
  );

  const headers: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    const name = headerText(headerRow.getCell(c).value);
    headers.push(name || `Column ${c}`);
  }

  const rows: Record<string, unknown>[] = [];
  let truncated = false;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      return;
    }
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    for (let c = 1; c <= colCount; c++) {
      const value = row.getCell(c).value;
      if (value !== null && value !== undefined) hasValue = true;
      obj[headers[c - 1]] = value;
    }
    if (hasValue) rows.push(obj);
  });

  if (rows.length === 0) {
    throw new ImportFileError(
      "No data rows found. Make sure the first row contains column headers and the data starts on row 2."
    );
  }

  return {
    filename,
    sheetName: sheet.name,
    headers,
    rows,
    truncated,
  };
}

// ------------------------------------------------------------------
// VALUE NORMALIZATION
// ------------------------------------------------------------------

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calendar-date formatter for Date objects. Uses LOCAL components so the
 * preview matches exactly what parseDateValue will store (ExcelJS parses
 * CSV dates as local midnight, and real xlsx dates as UTC midnight). */
function dateToDisplay(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return toIsoDate(d);
}

export function parseDateValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value);
  }
  if (typeof value === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    if (!Number.isNaN(d.getTime())) return toIsoDate(d);
    return null;
  }
  const raw = cellToDisplay(value).trim();
  if (!raw) return null;

  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const a = m[1];
    const b = m[2];
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    let dd: string;
    let mm: string;
    if (Number(a) > 12) {
      dd = a;
      mm = b;
    } else if (Number(b) > 12) {
      mm = a;
      dd = b;
    } else {
      dd = a;
      mm = b;
    }
    return `${y}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return null;
}

export function parseEnumValue(
  value: unknown,
  list: { value: string; label: string }[],
  label: string
): { value: string | null; error: string | null } {
  const raw = cellToDisplay(value).trim();
  if (!raw) {
    return { value: null, error: null };
  }
  const lower = raw.toLowerCase();
  const direct = list.find((l) => l.value === lower);
  if (direct) return { value: direct.value, error: null };
  const byLabel = list.find((l) => l.label.toLowerCase() === lower);
  if (byLabel) return { value: byLabel.value, error: null };
  return { value: null, error: `"${raw}" is not a valid ${label} value` };
}

// ------------------------------------------------------------------
// VALIDATION
// ------------------------------------------------------------------

interface ValidationContext {
  existingRefs: Set<string>;
}

function normalizeString(value: unknown): string | null {
  const s = cellToDisplay(value).trim();
  return s === "" ? null : s;
}

export function validateImportRows(
  rows: Record<string, unknown>[],
  mapping: Record<string, string>,
  existingRefs: Set<string>,
  targetByNames: string[] = []
): ImportRowResult[] {
  const ctx: ValidationContext = { existingRefs };
  const seen = new Map<string, number>();
  const results: ImportRowResult[] = [];

  const get = (row: Record<string, unknown>, fieldKey: string) => {
    const header = mapping[fieldKey];
    if (!header) return null;
    return row[header] ?? null;
  };

  const normName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];
    const warnings: string[] = [];

    const cmg = normalizeString(get(row, "cmg_reference"));
    if (!cmg) {
      results.push({
        row: rowNumber,
        status: "invalid",
        cmgReference: null,
        errors: ["Missing CMG Reference Number"],
        warnings,
      });
      return;
    }

    const reference = cmg.toUpperCase();
    const firstSeen = seen.get(reference);
    if (firstSeen !== undefined) {
      results.push({
        row: rowNumber,
        status: "duplicate",
        cmgReference: reference,
        duplicateOfRow: firstSeen,
        warnings,
      });
      return;
    }
    if (ctx.existingRefs.has(reference)) {
      results.push({
        row: rowNumber,
        status: "duplicate",
        cmgReference: reference,
        duplicateOfExistingId: 0,
        warnings,
      });
      return;
    }
    seen.set(reference, rowNumber);

    // Optional important fields — note missing ones but keep row importable.
    for (const key of ["title", "target_name", "brand"] as const) {
      const label = getField(key)?.label ?? key;
      if (!normalizeString(get(row, key))) {
        warnings.push(`Missing important information: ${label}`);
      }
    }

    const status = parseEnumValue(get(row, "status"), CASE_STATUSES, "case status");
    if (status.error) errors.push(status.error);

    const report = parseEnumValue(get(row, "report_status"), APPROVAL_STATUSES, "approval status");
    if (report.error) errors.push(report.error);

    const targetBy = normalizeString(get(row, "target_by"));
    if (targetBy && !targetByNames.some((n) => normName(n) === normName(targetBy))) {
      errors.push(`Target By "${targetBy}" does not exist in Target By master data.`);
    }

    for (const key of ["investigation_date"] as const) {
      const raw = get(row, key);
      if (raw !== null && raw !== undefined && cellToDisplay(raw).trim() !== "") {
        if (parseDateValue(raw) === null) {
          errors.push(`"${cellToDisplay(raw)}" is not a valid date`);
        }
      }
    }

    results.push({
      row: rowNumber,
      status: errors.length > 0 ? "invalid" : "new",
      cmgReference: reference,
      errors,
      warnings,
    });
  });

  return results;
}

export function summarizeValidation(
  results: ImportRowResult[]
): ImportValidationSummary {
  let newCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;
  let missingInfoCount = 0;
  let warningsCount = 0;
  for (const r of results) {
    if (r.status === "new") newCount++;
    else if (r.status === "duplicate") duplicateCount++;
    else invalidCount++;
    if (r.status === "new" && r.warnings && r.warnings.length > 0) {
      missingInfoCount++;
      warningsCount += r.warnings.length;
    }
  }
  return {
    total: results.length,
    newCount,
    duplicateCount,
    invalidCount,
    missingInfoCount,
    warningsCount,
    problems: results.filter((r) => r.status !== "new").slice(0, 500),
  };
}

// ------------------------------------------------------------------
// EXISTING REFERENCES
// ------------------------------------------------------------------

export async function fetchExistingReferences(): Promise<Set<string>> {
  const rows = await query<{ cmg_reference: string }>(
    `SELECT cmg_reference FROM cases`
  );
  // Store references in a canonical (uppercase) form so duplicate detection is
  // case-insensitive both ways — the import always compares uppercased refs.
  return new Set(rows.map((r) => r.cmg_reference.trim().toUpperCase()));
}

// ------------------------------------------------------------------
// MASTER REFERENCE NAMES (used for content-aware auto-mapping)
// ------------------------------------------------------------------

export async function fetchImportReferenceNames(): Promise<ReferenceNames> {
  const [targetBy, brands] = await Promise.all([
    query<{ name: string }>(`SELECT name FROM target_by`),
    query<{ name: string }>(`SELECT name FROM brands`),
  ]);
  return {
    targetBy: targetBy.map((t) => t.name),
    brands: brands.map((b) => b.name),
  };
}

// ------------------------------------------------------------------
// CONFIRM / COMMIT
// ------------------------------------------------------------------

export interface ConfirmImportResult {
  batchId: number;
  imported: number;
  duplicates: number;
  invalid: number;
  total: number;
}

interface MasterRefRow {
  id: number;
  name: string;
}

async function fetchRows(client: PoolClient, table: string): Promise<MasterRefRow[]> {
  const res = await client.query<MasterRefRow>(`SELECT id, name FROM ${table}`);
  return res.rows;
}

/** Looks up user decisions for each brand token in a cell. */
function decisionsFor(
  field: string,
  brandText: string | null,
  decisions: MasterDecisions
): Record<string, MasterDecision> | undefined {
  if (!brandText) return undefined;
  return decisions[field];
}

/** Lowercases and strips punctuation/whitespace for safe equivalence checks. */
function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Conservative similarity between two normalized names (0..1). 1 = identical.
 * Substring containment and edit-distance both contribute; short tokens are
 * never considered similar to avoid over-merging.
 */
function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen < 3) return 0;
  const editSim = 1 - levenshtein(a, b) / maxLen;
  if (a.includes(b) || b.includes(a)) {
    // "central" vs "centralstores" is containment, NOT an exact equivalent.
    return Math.max(editSim, 0.6);
  }
  return editSim;
}

/**
 * Conservative master-data resolution:
 *  - exact normalized match          -> existing row (clearly safe)
 *  - explicit user decision (id)     -> that existing row
 *  - otherwise                       -> create a NEW record (never silently
 *                                      merges similar-but-distinct names)
 */
async function resolveConservative(
  client: PoolClient,
  table: string,
  name: string,
  rows: MasterRefRow[],
  decision: MasterDecision | undefined
): Promise<{ id: number; name: string; merged: boolean }> {
  const trimmed = name.trim();
  const norm = normalizeName(trimmed);
  const exact = rows.find((r) => normalizeName(r.name) === norm);
  if (exact) return { id: exact.id, name: exact.name, merged: true };
  if (typeof decision === "number") {
    const chosen = rows.find((r) => r.id === decision);
    if (chosen) return { id: chosen.id, name: chosen.name, merged: true };
  }
  const created = await client.query<{ id: number }>(
    `INSERT INTO ${table} (name) VALUES ($1) RETURNING id`,
    [trimmed]
  );
  return { id: created.rows[0].id, name: trimmed, merged: false };
}

/** Resolves one or more brand names, linking each to its master row. */
async function resolveBrandIds(
  client: PoolClient,
  brandText: string | null,
  decisions?: Record<string, MasterDecision>
): Promise<{ brand: string | null; brandIds: number[] }> {
  if (!brandText || !brandText.trim()) return { brand: null, brandIds: [] };
  const rows = await client.query<MasterRefRow>(`SELECT id, name FROM brands`);
  const names = brandText
    .split(/[,;|]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  const resolved: { id: number; name: string }[] = [];
  for (const n of names) {
    const r = await resolveConservative(client, "brands", n, rows.rows, decisions?.[n]);
    resolved.push(r);
  }
  return {
    brand: resolved[0]?.name ?? null,
    brandIds: resolved.map((r) => r.id),
  };
}

// ------------------------------------------------------------------
// MASTER VALUE REVIEW (conservative match confirmation)
// ------------------------------------------------------------------

const MASTER_ANALYSIS_FIELDS: { key: string; table: string; label: string }[] = [
  { key: "target_by", table: "target_by", label: "Target By" },
  { key: "brand", table: "brands", label: "Brand" },
];

/**
 * Compares every distinct master-data value in the file against the existing
 * master tables and classifies each value as `existing` (exact normalized
 * match), `ambiguous` (similar but not equal — user must confirm), or `new`
 * (no candidate). Distinct names are never merged silently.
 */
export async function analyzeMasterValues(
  rows: Record<string, unknown>[],
  mapping: Record<string, string>
): Promise<MasterValueAnalysis[]> {
  const analyses: MasterValueAnalysis[] = [];

  for (const { key, table } of MASTER_ANALYSIS_FIELDS) {
    const header = mapping[key];
    if (!header) continue;

    const collected = new Map<string, string>(); // lowercased key -> trimmed value
    for (const row of rows) {
      const raw = normalizeString(row[header] ?? null);
      if (!raw) continue;
      const tokens =
        key === "brand" ? raw.split(/[,;|]+/).map((t) => t.trim()).filter(Boolean) : [raw.trim()];
      for (const token of tokens) {
        if (!collected.has(token.toLowerCase())) collected.set(token.toLowerCase(), token);
      }
    }
    if (collected.size === 0) continue;

    const existing = await query<MasterRefRow>(`SELECT id, name FROM ${table}`);
    const values: MasterValueAnalysis["values"] = [];

    for (const trimmed of collected.values()) {
      const norm = normalizeName(trimmed);
      const exact = existing.find((r) => normalizeName(r.name) === norm);
      if (exact) {
        values.push({ value: trimmed, status: "existing", existingName: exact.name, candidates: [] });
        continue;
      }
      const candidates = existing
        .map((r) => ({ id: r.id, name: r.name, sim: nameSimilarity(norm, normalizeName(r.name)) }))
        .filter((c) => c.sim >= 0.55)
        .sort((a, b) => b.sim - a.sim)
        .map((c) => ({ id: c.id, name: c.name }));
      if (candidates.length > 0) {
        values.push({ value: trimmed, status: "ambiguous", existingName: null, candidates });
      } else {
        values.push({ value: trimmed, status: "new", existingName: null, candidates: [] });
      }
    }

    analyses.push({ fieldKey: key, label: getField(key)?.label ?? key, values });
  }

  return analyses;
}

export async function confirmImport(
  token: string,
  filename: string,
  headers: string[],
  rows: Record<string, unknown>[],
  mapping: Record<string, string>,
  userId: number,
  masterDecisions: MasterDecisions = {}
): Promise<ConfirmImportResult> {
  const existingRefs = await fetchExistingReferences();
  const targetByNames = (await fetchImportReferenceNames()).targetBy;
  const results = validateImportRows(rows, mapping, existingRefs, targetByNames);
  const newRows = results
    .map((r, idx) => ({ result: r, raw: rows[idx] }))
    .filter((item) => item.result.status === "new");

  const client = await db.connect();
  let batchId: number;
  // finalResults mirrors the per-row outcome actually written to the database,
  // so Import History always reflects the true result (never phantom counts).
  const finalResults: ImportRowResult[] = results.map((r) => ({ ...r }));
  try {
    await client.query("BEGIN");

    for (const { result, raw } of newRows) {
      const get = (key: string) => {
        const header = mapping[key];
        if (!header) return null;
        return raw[header] ?? null;
      };
      const normStr = (key: string) => normalizeString(get(key));

      const targetByName = normStr("target_by");
      const targetNature = normStr("target_nature");

      let targetById: number | null = null;
      if (targetByName) {
        // Target By must already exist in master data — validation rejected any
        // row referencing an unknown Target By, so this always resolves.
        const rows = await fetchRows(client, "target_by");
        const exact = rows.find((r) => normalizeName(r.name) === normalizeName(targetByName));
        targetById = exact?.id ?? null;
      }

      const brand = await resolveBrandIds(client, normStr("brand"), decisionsFor("brand", normStr("brand"), masterDecisions));

      const status = parseEnumValue(get("status"), CASE_STATUSES, "case status").value ?? "open";
      const reportStatus =
        parseEnumValue(get("report_status"), APPROVAL_STATUSES, "approval status").value ?? "pending_approval";

      try {
        const insert = await client.query<{ id: number }>(
          `INSERT INTO cases (
             cmg_reference, client_reference, title,
             target_name, target_nature, target_owner, city, target_by_id,
             brand, status, report_status, investigation_date, notes,
             created_by, last_updated
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           RETURNING id`,
          [
            result.cmgReference, normStr("client_reference"), normStr("title"),
            normStr("target_name"), targetNature, normStr("target_owner"),
            normStr("city"), targetById,
            brand.brand, status, reportStatus, parseDateValue(get("investigation_date")), normStr("notes"),
            userId, new Date(),
          ]
        );
        const caseId = insert.rows[0].id;

        if (brand.brandIds.length > 0) {
          for (const brandId of brand.brandIds) {
            await client.query(
              `INSERT INTO case_brands (case_id, brand_id) VALUES ($1, $2)`,
              [caseId, brandId]
            );
          }
        }

        await client.query(
          `INSERT INTO activity_logs (case_id, user_id, action, description)
           VALUES ($1, $2, 'case_imported', $3)`,
          [caseId, userId, `Case imported from ${filename} (row ${result.row})`]
        );
      } catch (err) {
        const pgErr = err as { code?: string; constraint?: string };
        if (pgErr?.code === "23505" && pgErr.constraint === "cases_cmg_reference_key") {
          // The reference appeared after validation (concurrent import or a
          // case-variant duplicate). Skip the row cleanly instead of failing
          // the whole batch — never create a second Market Case.
          const idx = finalResults.findIndex((r) => r.row === result.row);
          if (idx >= 0) {
            finalResults[idx] = {
              row: result.row,
              status: "duplicate",
              cmgReference: result.cmgReference,
              duplicateOfExistingId: 0,
              warnings: ["CMG Reference already exists in the central database"],
            };
          }
          continue;
        }
        throw err;
      }
    }

    const actualSummary = summarizeValidation(finalResults);

    const batchInsert = await client.query<{ id: number }>(
      `INSERT INTO import_batches (
         filename, status, total_rows, new_count, duplicate_count, invalid_count,
         column_mapping, errors, imported_by, completed_at
       ) VALUES ($1, 'imported', $2, $3, $4, $5, $6, $7::jsonb, $8, NOW())
       RETURNING id`,
      [
        filename,
        actualSummary.total,
        actualSummary.newCount,
        actualSummary.duplicateCount,
        actualSummary.invalidCount,
        JSON.stringify(mapping),
        JSON.stringify(finalResults),
        userId,
      ]
    );
    batchId = batchInsert.rows[0].id;

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return {
    batchId,
    imported: finalResults.filter((r) => r.status === "new").length,
    duplicates: finalResults.filter((r) => r.status === "duplicate").length,
    invalid: finalResults.filter((r) => r.status === "invalid").length,
    total: finalResults.length,
  };
}