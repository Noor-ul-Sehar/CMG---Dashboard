import { db, query, queryOne } from "@/lib/db/client";
import {
  UnileverDuplicateReferenceError,
  normalizeReference,
  type ValidatedUnileverCaseInput,
} from "@/lib/validation";
import type {
  UnileverCase,
  UnileverCaseListFilters,
  UnileverCaseListResult,
} from "@/types";

const UNILEVER_CASE_SELECT = `
  SELECT
    u.id,
    u.cmg_reference AS "cmgReference",
    u.client_reference AS "clientReference",
    u.target_name AS "targetName",
    u.target_nature AS "targetNature",
    u.target_by AS "targetBy",
    u.brand AS "brand",
    u.brands AS "brands",
    u.status,
    u.approval_status AS "approvalStatus",
    to_char(u.investigation_date, 'YYYY-MM-DD') AS "investigationDate",
    u.notes,
    u.created_by AS "createdBy",
    u.created_at AS "createdAt",
    u.updated_at AS "updatedAt"
  FROM unilever_cases u
`;

export async function listUnileverBrands(): Promise<{ id: number; name: string }[]> {
  return query<{ id: number; name: string }>(
    `SELECT id, name FROM unilever_brands WHERE is_active ORDER BY name`
  );
}

export async function getUnileverCaseById(id: number): Promise<UnileverCase | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  return queryOne<UnileverCase>(`${UNILEVER_CASE_SELECT} WHERE u.id = $1`, [id]);
}

export async function getUnileverCaseByReference(
  reference: string
): Promise<UnileverCase | null> {
  const ref = normalizeReference(reference);
  if (!ref) return null;
  return queryOne<UnileverCase>(`${UNILEVER_CASE_SELECT} WHERE u.cmg_reference = $1`, [ref]);
}

// ------------------------------------------------------------------
// LIST / FILTER / SEARCH
// ------------------------------------------------------------------

export async function listUnileverCases(
  filters: UnileverCaseListFilters
): Promise<UnileverCaseListResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const q = filters.q?.trim();
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(u.cmg_reference ILIKE $${params.length} OR
        u.client_reference ILIKE $${params.length} OR
        u.target_name ILIKE $${params.length} OR
        u.target_nature ILIKE $${params.length} OR
        u.target_by ILIKE $${params.length} OR
        u.brand ILIKE $${params.length})`
    );
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`u.status = $${params.length}`);
  }
  if (filters.targetBy?.trim()) {
    params.push(filters.targetBy.trim());
    conditions.push(`u.target_by = $${params.length}`);
  }
  if (filters.targetNature?.trim()) {
    params.push(filters.targetNature.trim());
    conditions.push(`u.target_nature = $${params.length}`);
  }
  if (filters.brand?.trim()) {
    params.push(filters.brand.trim());
    conditions.push(
      `(u.brand = $${params.length} OR EXISTS (
         SELECT 1 FROM unnest(u.brands) b WHERE b = $${params.length}
       ))`
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const perPage = Math.min(Math.max(filters.perPage ?? 20, 5), 100);
  const page = Math.max(filters.page ?? 1, 1);

  const countResult = await query<{ total: string }>(
    `SELECT count(*) AS total FROM unilever_cases u ${where}`,
    params
  );
  const total = Number.parseInt(countResult[0].total, 10);
  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * perPage;

  const rows = await query<UnileverCase>(
    `${UNILEVER_CASE_SELECT} ${where} ORDER BY u.updated_at DESC, u.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, offset]
  );

  return { rows, total, page: currentPage, perPage, totalPages };
}

/** Statistics used by the Unilever dashboard — Unilever data only. */
export async function getUnileverStats() {
  const rows = await query<{ status: string; count: string }>(
    `SELECT status, count(*)::text AS count FROM unilever_cases GROUP BY status`
  );
  const byStatus = new Map(rows.map((r) => [r.status, Number.parseInt(r.count, 10)]));
  const recent = await query<UnileverCase>(
    `${UNILEVER_CASE_SELECT} ORDER BY u.updated_at DESC, u.id DESC LIMIT 5`
  );
  return {
    total: rows.reduce((sum, r) => sum + Number.parseInt(r.count, 10), 0),
    open: byStatus.get("open") ?? 0,
    close: byStatus.get("close") ?? 0,
    close_1: byStatus.get("close_1") ?? 0,
    recent,
  };
}

// ------------------------------------------------------------------
// CREATE / UPDATE / DELETE
// ------------------------------------------------------------------

/** Ensures every brand name exists in the separate unilever_brands master. */
async function ensureUnileverBrands(client: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }, brandNames: string[]) {
  for (const name of brandNames) {
    await client.query(
      `INSERT INTO unilever_brands (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [name]
    );
  }
}

export async function createUnileverCase(
  input: ValidatedUnileverCaseInput,
  userId: number
): Promise<UnileverCase> {
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM unilever_cases WHERE cmg_reference = $1`,
    [input.cmgReference]
  );
  if (existing) {
    throw new UnileverDuplicateReferenceError(input.cmgReference);
  }

  const brands = input.brandNames;
  const client = await db.connect();
  let id: number;
  try {
    await client.query("BEGIN");
    await ensureUnileverBrands(client, brands);
    const result = await client.query<{ id: number }>(
      `INSERT INTO unilever_cases (
         cmg_reference, client_reference, target_name, target_nature, target_by,
         brand, brands, status, approval_status, investigation_date, notes, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        input.cmgReference, input.clientReference, input.targetName, input.targetNature, input.targetBy,
        brands[0] ?? null, brands, input.status, input.approvalStatus, input.investigationDate, input.notes,
        userId,
      ]
    );
    id = result.rows[0].id;
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw mapUniqueViolation(err, input.cmgReference);
  } finally {
    client.release();
  }

  return (await getUnileverCaseById(id))!;
}

export async function updateUnileverCase(
  id: number,
  input: ValidatedUnileverCaseInput
): Promise<UnileverCase> {
  const existing = await getUnileverCaseById(id);
  if (!existing) throw new Error("Unilever case not found");

  if (existing.cmgReference !== input.cmgReference) {
    const dup = await queryOne<{ id: number }>(
      `SELECT id FROM unilever_cases WHERE cmg_reference = $1 AND id <> $2`,
      [input.cmgReference, id]
    );
    if (dup) throw new UnileverDuplicateReferenceError(input.cmgReference);
  }

  const brands = input.brandNames;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureUnileverBrands(client, brands);
    await client.query(
      `UPDATE unilever_cases SET
         cmg_reference = $1, client_reference = $2, target_name = $3, target_nature = $4, target_by = $5,
         brand = $6, brands = $7, status = $8, approval_status = $9, investigation_date = $10, notes = $11,
         updated_at = NOW()
       WHERE id = $12`,
      [
        input.cmgReference, input.clientReference, input.targetName, input.targetNature, input.targetBy,
        brands[0] ?? null, brands, input.status, input.approvalStatus, input.investigationDate, input.notes,
        id,
      ]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw mapUniqueViolation(err, input.cmgReference);
  } finally {
    client.release();
  }

  return (await getUnileverCaseById(id))!;
}

export async function deleteUnileverCase(id: number): Promise<boolean> {
  const result = await query<{ id: number }>(
    `DELETE FROM unilever_cases WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.length > 0;
}

function mapUniqueViolation(err: unknown, reference: string): unknown {
  const pgErr = err as { code?: string; constraint?: string };
  if (pgErr?.code === "23505" && pgErr.constraint === "unilever_cases_cmg_reference_key") {
    return new UnileverDuplicateReferenceError(reference);
  }
  return err;
}