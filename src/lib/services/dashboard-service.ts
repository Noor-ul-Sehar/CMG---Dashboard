import { query } from "@/lib/db/client";
import type { CaseWithRefs, DashboardStats } from "@/types";

const CASE_SELECT = `
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const countsQuery = `
    SELECT
      (SELECT count(*)::int FROM cases) AS total_cases,
      (SELECT count(*)::int FROM cases WHERE status = 'open') AS open_cases,
      (SELECT count(*)::int FROM cases WHERE status = 'close') AS closed_cases,
      (SELECT count(*)::int FROM cases WHERE status = 'close_1') AS close_1_cases
  `;

  const [counts, byStatus, recentCases, importantPending] = await Promise.all([
    query<{
      total_cases: number;
      open_cases: number;
      closed_cases: number;
      close_1_cases: number;
    }>(countsQuery),

    query<{ status: string; count: number }>(`
      SELECT status, count(*)::int AS count
      FROM cases
      GROUP BY status
      ORDER BY count DESC
    `),

    query<CaseWithRefs>(
      `${CASE_SELECT} ORDER BY c.updated_at DESC LIMIT 8`
    ),

    query<CaseWithRefs>(
      `${CASE_SELECT}
       WHERE c.report_status = 'pending_approval'
       ORDER BY c.last_updated ASC, c.investigation_date ASC NULLS LAST
       LIMIT 8`
    ),
  ]);

  return {
    total_cases: counts[0].total_cases,
    open_cases: counts[0].open_cases,
    closed_cases: counts[0].closed_cases,
    close_1_cases: counts[0].close_1_cases,
    cases_by_status: byStatus,
    recent_cases: recentCases,
    important_pending: importantPending,
  };
}