import { db, query, queryOne } from "@/lib/db/client";
import {
  DuplicateReferenceError,
  normalizeReference,
  type ValidatedCaseInput,
} from "@/lib/validation";
import type { PoolClient } from "pg";
import type {
  CaseFullProfile,
  CaseListFilters,
  CaseListResult,
  CaseWithRefs,
  Investigator,
  RecordalInput,
  Team,
} from "@/types";

export const CASE_SELECT = `
  SELECT
    c.id,
    c.cmg_reference AS "cmgReference",
    c.client_reference AS "clientReference",
    c.title,
    c.target_name AS "targetName",
    COALESCE(c.target_nature, tn.name) AS "targetNature",
    c.target_owner AS "targetOwner",
    c.city,
    c.brand,
    c.target_by_id AS "targetById",
    c.target_nature_id AS "targetNatureId",
    c.target_id AS "targetId",
    c.team_id AS "teamId",
    c.investigator_id AS "investigatorId",
    c.status,
    c.report_status AS "reportStatus",
    to_char(c.investigation_date, 'YYYY-MM-DD') AS "investigationDate",
    c.last_updated AS "lastUpdated",
    c.notes,
    c.created_by AS "createdBy",
    c.created_at AS "createdAt",
    c.updated_at AS "updatedAt",
    t.name AS "teamName",
    i.name AS "investigatorName",
    tb.name AS "targetBy",
    COALESCE((
      SELECT array_agg(b.name ORDER BY b.name)
      FROM case_brands cb
      JOIN brands b ON b.id = cb.brand_id
      WHERE cb.case_id = c.id
    ), '{}'::text[]) AS brands,
    COALESCE((
      SELECT array_agg(b.id ORDER BY b.name)
      FROM case_brands cb
      JOIN brands b ON b.id = cb.brand_id
      WHERE cb.case_id = c.id
    ), '{}'::int[]) AS "brandIds"
  FROM cases c
  LEFT JOIN teams t ON t.id = c.team_id
  LEFT JOIN investigators i ON i.id = c.investigator_id
  LEFT JOIN target_by tb ON tb.id = c.target_by_id
  LEFT JOIN target_natures tn ON tn.id = c.target_nature_id
`;

export async function listTeams(): Promise<Team[]> {
  return query<Team>(`SELECT * FROM teams ORDER BY name`);
}

export async function listInvestigators(): Promise<Investigator[]> {
  return query<Investigator>(`SELECT * FROM investigators ORDER BY name`);
}

export async function getCaseById(id: number): Promise<CaseWithRefs | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  return queryOne<CaseWithRefs>(`${CASE_SELECT} WHERE c.id = $1`, [id]);
}

export async function getCaseByReference(
  reference: string
): Promise<CaseWithRefs | null> {
  const ref = normalizeReference(reference);
  if (!ref) return null;
  return queryOne<CaseWithRefs>(`${CASE_SELECT} WHERE c.cmg_reference = $1`, [ref]);
}

/** Returns the recordal inputs currently attached to a case (for PATCH merging). */
export async function getCaseRecordals(id: number): Promise<RecordalInput[]> {
  const rows = await query<{
    recordalDate: string | null;
    brandCmgCaseRef: string | null;
    brandCaseRef: string | null;
  }>(
    `SELECT to_char(recordal_date, 'YYYY-MM-DD') AS "recordalDate",
            brand_cmg_case_ref AS "brandCmgCaseRef",
            brand_case_ref AS "brandCaseRef"
     FROM case_recordals
     WHERE case_id = $1
     ORDER BY id ASC`,
    [id]
  );
  return rows.map((r) => ({
    recordalDate: r.recordalDate,
    brandCmgCaseRef: r.brandCmgCaseRef,
    brandCaseRef: r.brandCaseRef,
  }));
}

export async function getFullCaseProfile(id: number): Promise<CaseFullProfile | null> {
  const theCase = await getCaseById(id);
  if (!theCase) return null;

  const [recordals, remarks, reviews, activity, documents] = await Promise.all([
    query<CaseFullProfile["recordals"][number]>(
      `SELECT r.id, r.case_id AS "caseId", r.recordal_date AS "recordalDate",
              r.brand_cmg_case_ref AS "brandCmgCaseRef", r.brand_case_ref AS "brandCaseRef",
              r.created_at AS "createdAt", r.updated_at AS "updatedAt"
       FROM case_recordals r
       WHERE r.case_id = $1
       ORDER BY r.id ASC`,
      [id]
    ),
    query<CaseFullProfile["remarks"][number]>(
      `SELECT r.id, r.case_id AS "caseId", r.user_id AS "userId", r.comment, r.type,
              r.created_at AS "createdAt", u.name AS "userName"
       FROM remarks r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.case_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    ),
    query<CaseFullProfile["reviews"][number]>(
      `SELECT r.id, r.case_id AS "caseId", r.reviewer_id AS "reviewerId", r.review_comment AS "reviewComment",
              r.review_status AS "reviewStatus", r.reviewed_at AS "reviewedAt",
              r.created_at AS "createdAt", u.name AS "reviewerName"
       FROM reviews r
       LEFT JOIN users u ON u.id = r.reviewer_id
       WHERE r.case_id = $1
       ORDER BY r.reviewed_at DESC, r.created_at DESC`,
      [id]
    ),
    query<CaseFullProfile["activity"][number]>(
      `SELECT a.id, a.case_id AS "caseId", a.user_id AS "userId", a.action, a.description,
              a.created_at AS "createdAt", u.name AS "userName"
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.case_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    ),
    query<CaseFullProfile["documents"][number]>(
      `SELECT d.id, d.case_id AS "caseId", d.name, d.description, d.file_type AS "fileType",
              d.file_size AS "fileSize", d.reference, d.file_path AS "filePath",
              d.uploaded_by AS "uploadedBy", u.name AS "uploadedByName",
              d.created_at AS "createdAt"
       FROM case_documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE d.case_id = $1
       ORDER BY d.created_at DESC`,
      [id]
    ),
  ]);

  return { case: theCase, recordals, remarks, reviews, activity, documents };
}

// ------------------------------------------------------------------
// LIST / FILTER / SEARCH
// ------------------------------------------------------------------

export async function getCaseFilterOptions() {
  const [brands, targetBy, targetNatures] = await Promise.all([
    query<{ brand: string }>(
      `SELECT name AS brand FROM brands
       UNION
       SELECT DISTINCT brand FROM cases WHERE brand IS NOT NULL AND brand <> ''
       ORDER BY brand`
    ),
    query<{ id: number; name: string }>(
      `SELECT id, name FROM target_by WHERE is_active ORDER BY name`
    ),
    query<{ name: string }>(
      `SELECT DISTINCT COALESCE(target_nature, '') AS name FROM cases
       WHERE target_nature IS NOT NULL AND target_nature <> ''
       UNION
       SELECT name FROM target_natures WHERE is_active AND name <> ''
       ORDER BY name`
    ),
  ]);
  return {
    brands: brands.map((b) => b.brand),
    targetBy,
    targetNatures: targetNatures.map((t) => t.name),
  };
}

/**
 * Builds the parameterized WHERE clause shared by search, reporting and
 * export. Returns the raw SQL conditions plus their bound parameters.
 */
export function buildCaseConditions(filters: CaseListFilters): {
  conditions: string[];
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const q = filters.q?.trim();
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(c.cmg_reference ILIKE $${params.length} OR
        c.client_reference ILIKE $${params.length} OR
        c.title ILIKE $${params.length} OR
        c.target_name ILIKE $${params.length} OR
        c.target_nature ILIKE $${params.length} OR
        c.target_owner ILIKE $${params.length} OR
        c.city ILIKE $${params.length} OR
        c.brand ILIKE $${params.length} OR
        tb.name ILIKE $${params.length} OR
        EXISTS (
          SELECT 1 FROM case_brands qcb
          JOIN brands qb ON qb.id = qcb.brand_id
          WHERE qcb.case_id = c.id AND qb.name ILIKE $${params.length}
        ))`
    );
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`c.status::text = $${params.length}`);
  }
  if (filters.statusIn && filters.statusIn.length > 0) {
    params.push(filters.statusIn);
    conditions.push(`c.status::text = ANY($${params.length})`);
  }
  if (filters.targetBy) {
    params.push(filters.targetBy);
    conditions.push(`c.target_by_id = $${params.length}::int`);
  }
  if (filters.targetNature?.trim()) {
    params.push(filters.targetNature.trim());
    conditions.push(
      `(c.target_nature = $${params.length} OR EXISTS (
         SELECT 1 FROM target_natures tn2 WHERE tn2.id = c.target_nature_id AND tn2.name = $${params.length}
       ))`
    );
  }
  if (filters.brand) {
    params.push(filters.brand);
    conditions.push(
      `(c.brand = $${params.length} OR EXISTS (
         SELECT 1 FROM case_brands cb
         JOIN brands b ON b.id = cb.brand_id
         WHERE cb.case_id = c.id AND b.name = $${params.length}
       ))`
    );
  }
  if (filters.clientReference?.trim()) {
    params.push(`%${filters.clientReference.trim()}%`);
    conditions.push(`c.client_reference ILIKE $${params.length}`);
  }

  return { conditions, params };
}

/** Returns every row matching the filters, regardless of size. */
export async function searchAllCases(
  filters: CaseListFilters,
  orderBy = "c.last_updated DESC, c.id DESC"
): Promise<CaseWithRefs[]> {
  const { conditions, params } = buildCaseConditions(filters);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<CaseWithRefs>(`${CASE_SELECT} ${where} ORDER BY ${orderBy}`, params);
}

export async function searchCases(
  filters: CaseListFilters
): Promise<CaseListResult> {
  const { conditions, params } = buildCaseConditions(filters);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const perPage = Math.min(Math.max(filters.perPage ?? 20, 5), 100);
  const page = Math.max(filters.page ?? 1, 1);

  const countResult = await query<{ total: string }>(
    `SELECT count(*) AS total
     FROM cases c
     LEFT JOIN target_by tb ON tb.id = c.target_by_id
     ${where}`,
    params
  );
  const total = Number.parseInt(countResult[0].total, 10);
  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * perPage;

  const rows = await query<CaseWithRefs>(
    `${CASE_SELECT} ${where} ORDER BY c.last_updated DESC, c.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, perPage, offset]
  );

  return { rows, total, page: currentPage, perPage, totalPages };
}

// ------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------

export async function createCase(
  input: ValidatedCaseInput,
  userId: number,
  initialRemark?: string
): Promise<CaseWithRefs> {
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM cases WHERE cmg_reference = $1`,
    [input.cmgReference]
  );
  if (existing) {
    const info = await getCaseByReference(input.cmgReference);
    throw new DuplicateReferenceError(input.cmgReference, {
      id: info!.id,
      cmgReference: info!.cmgReference,
      title: info!.title,
      targetName: info!.targetName,
      status: info!.status,
    });
  }

  const client = await db.connect();
  let caseId: number;
  try {
    await client.query("BEGIN");
    const resolved = await resolveBrandNames(client, input.brandNames);
    const result = await client.query<{ id: number }>(
      `INSERT INTO cases (
         cmg_reference, client_reference, title,
         target_name, target_nature, target_owner, city, target_by_id,
         brand, status, report_status, investigation_date, notes,
         created_by, last_updated
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        input.cmgReference, input.clientReference, input.title,
        input.targetName, input.targetNature, input.targetOwner, input.city, input.targetById,
        resolved.brand, input.status, input.reportStatus, input.investigationDate, input.notes,
        userId, new Date(),
      ]
    );
    caseId = result.rows[0].id;

    await replaceCaseBrands(client, caseId, resolved.brandIds);
    await replaceCaseRecordals(client, caseId, input.recordals ?? []);

    await client.query(
      `INSERT INTO activity_logs (case_id, user_id, action, description)
       VALUES ($1, $2, 'case_created', $3)`,
      [caseId, userId, `Case created with reference ${input.cmgReference}`]
    );

    if (initialRemark && initialRemark.trim()) {
      const remark = initialRemark.trim();
      await client.query(
        `INSERT INTO remarks (case_id, user_id, comment, type)
         VALUES ($1, $2, $3, 'note')`,
        [caseId, userId, remark]
      );
      await client.query(
        `INSERT INTO activity_logs (case_id, user_id, action, description)
         VALUES ($1, $2, 'remark_added', $3)`,
        [caseId, userId, `Initial remark added: ${remark.slice(0, 80)}`]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw mapUniqueViolation(err, input.cmgReference);
  } finally {
    client.release();
  }

  return (await getCaseById(caseId))!;
}

/** Normalized-equality lookup for a master table name. */
function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolves approved brand names to their existing master brand rows. Only names
 * already present in the `brands` master list are kept (validation guarantees
 * inputs come from the approved list). The denormalized `brand` column stores
 * the first brand for legacy search/export.
 */
async function resolveBrandNames(
  client: PoolClient,
  brandNames: string[]
): Promise<{ brand: string | null; brandIds: number[] }> {
  const names = [...new Set(brandNames.map((b) => b.trim()).filter(Boolean))];
  if (names.length === 0) return { brand: null, brandIds: [] };

  const rows = await client.query<{ id: number; name: string }>(
    `SELECT id, name FROM brands`
  );
  const resolved: { id: number; name: string }[] = [];
  for (const name of names) {
    const norm = normalizeName(name);
    const row = rows.rows.find((r) => normalizeName(r.name) === norm);
    if (row) resolved.push(row);
  }
  return { brand: resolved[0]?.name ?? null, brandIds: resolved.map((r) => r.id) };
}

async function replaceCaseBrands(
  client: PoolClient,
  caseId: number,
  brandIds: number[]
) {
  await client.query(`DELETE FROM case_brands WHERE case_id = $1`, [caseId]);
  for (const brandId of brandIds) {
    await client.query(
      `INSERT INTO case_brands (case_id, brand_id) VALUES ($1, $2)`,
      [caseId, brandId]
    );
  }
}

/** Replaces all recordals for a case within the caller's transaction. */
async function replaceCaseRecordals(
  client: PoolClient,
  caseId: number,
  recordals: RecordalInput[]
) {
  await client.query(`DELETE FROM case_recordals WHERE case_id = $1`, [caseId]);
  for (const r of recordals) {
    await client.query(
      `INSERT INTO case_recordals (case_id, recordal_date, brand_cmg_case_ref, brand_case_ref)
       VALUES ($1, $2, $3, $4)`,
      [
        caseId,
        r.recordalDate || null,
        r.brandCmgCaseRef || null,
        r.brandCaseRef || null,
      ]
    );
  }
}

function mapUniqueViolation(err: unknown, reference: string): unknown {
  const pgErr = err as { code?: string; constraint?: string };
  if (pgErr?.code === "23505" && pgErr.constraint === "cases_cmg_reference_key") {
    return new DuplicateReferenceError(reference, {
      id: 0,
      cmgReference: reference,
      title: null,
      targetName: null,
      status: "",
    });
  }
  return err;
}

// ------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------

export async function updateCase(
  id: number,
  input: ValidatedCaseInput,
  userId: number
): Promise<CaseWithRefs> {
  const existing = await getCaseById(id);
  if (!existing) throw new Error("Case not found");

  if (existing.cmgReference !== input.cmgReference) {
    const dup = await queryOne<{ id: number }>(
      `SELECT id FROM cases WHERE cmg_reference = $1 AND id <> $2`,
      [input.cmgReference, id]
    );
    if (dup) {
      const info = await getCaseByReference(input.cmgReference);
      throw new DuplicateReferenceError(input.cmgReference, {
        id: info!.id,
        cmgReference: info!.cmgReference,
        title: info!.title,
        targetName: info!.targetName,
        status: info!.status,
      });
    }
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const resolved = await resolveBrandNames(client, input.brandNames);

    await client.query(
      `UPDATE cases SET
         cmg_reference = $1, client_reference = $2, title = $3,
         target_name = $4, target_nature = $5, target_owner = $6, city = $7, target_by_id = $8,
         brand = $9, status = $10, report_status = $11, investigation_date = $12, notes = $13,
         last_updated = NOW()
       WHERE id = $14`,
      [
        input.cmgReference, input.clientReference, input.title,
        input.targetName, input.targetNature, input.targetOwner, input.city, input.targetById,
        resolved.brand, input.status, input.reportStatus, input.investigationDate, input.notes,
        id,
      ]
    );

    await replaceCaseBrands(client, id, resolved.brandIds);
    await replaceCaseRecordals(client, id, input.recordals ?? []);
    await logChanges(client, id, userId, existing, input);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw mapUniqueViolation(err, input.cmgReference);
  } finally {
    client.release();
  }

  return (await getCaseById(id))!;
}

async function logChanges(
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
  caseId: number,
  userId: number,
  existing: CaseWithRefs,
  input: ValidatedCaseInput
) {
  const logs: { action: string; description: string }[] = [];

  if (existing.status !== input.status) {
    logs.push({
      action: "status_changed",
      description: `Status changed from ${existing.status} to ${input.status}`,
    });
  }

  const textFields = [
    "clientReference", "title", "targetName", "targetNature", "targetOwner",
    "city", "investigationDate", "notes", "reportStatus",
  ] as const;
  const existingAny = existing as unknown as Record<string, unknown>;
  const inputAny = input as unknown as Record<string, unknown>;
  const anyTextChanged = textFields.some((f) => existingAny[f] !== inputAny[f]);
  if (anyTextChanged) {
    logs.push({ action: "case_updated", description: "Case details updated" });
  }

  if (logs.length === 0) return;

  for (const log of logs) {
    await client.query(
      `INSERT INTO activity_logs (case_id, user_id, action, description)
       VALUES ($1, $2, $3, $4)`,
      [caseId, userId, log.action, log.description]
    );
  }
}

// ------------------------------------------------------------------
// REMARKS
// ------------------------------------------------------------------

export async function addRemark(
  caseId: number,
  userId: number,
  comment: string,
  type: string
): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO remarks (case_id, user_id, comment, type)
       VALUES ($1, $2, $3, $4::remark_type)`,
      [caseId, userId, comment, type]
    );
    await client.query(
      `INSERT INTO activity_logs (case_id, user_id, action, description)
       VALUES ($1, $2, 'remark_added', $3)`,
      [caseId, userId, `Remark added: ${comment.slice(0, 80)}`]
    );
    await client.query(
      `UPDATE cases SET last_updated = NOW() WHERE id = $1`,
      [caseId]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}