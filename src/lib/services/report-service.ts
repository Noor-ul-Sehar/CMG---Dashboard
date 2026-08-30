import {
  getCaseFilterOptions,
  searchAllCases,
} from "@/lib/services/case-service";
import { CASE_STATUSES } from "@/lib/constants";
import type { CaseListFilters, CaseWithRefs } from "@/types";
import {
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  type ReportFilters,
  type ReportGroup,
  type ReportResult,
  type ReportSummary,
  type ReportType,
} from "@/lib/report-types";

export {
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  type ReportFilters,
  type ReportGroup,
  type ReportResult,
  type ReportSummary,
  type ReportType,
};

const UNASSIGNED = "Not recorded";

/** Applies the report-type preset on top of the supplied filters. */
function effectiveFilters(filters: ReportFilters): CaseListFilters {
  const { type, ...rest } = filters;
  const base: CaseListFilters = { ...rest };
  if (type === "open") {
    base.status = "open";
  } else if (type === "close") {
    base.status = "close";
  } else if (type === "close_1") {
    base.status = "close_1";
  }
  return base;
}

function groupRows(rows: CaseWithRefs[], key: (row: CaseWithRefs) => string): ReportGroup[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([groupKey, count]) => ({ key: groupKey, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function reportGroupsForType(
  type: ReportType,
  rows: CaseWithRefs[]
): ReportGroup[] {
  switch (type) {
    case "by_brand":
      return groupRows(rows, (r) => (r.brands?.length ? r.brands.join(", ") : r.brand || UNASSIGNED));
    default:
      return [];
  }
}

/** Runs a report and returns the matching rows, totals and summary stats. */
export async function getReportResult(filters: ReportFilters): Promise<ReportResult> {
  const base = effectiveFilters(filters);
  const rows = await searchAllCases(base);
  const total = rows.length;

  const summary: ReportSummary = {
    total,
    open: rows.filter((r) => r.status === "open").length,
    close: rows.filter((r) => r.status === "close").length,
    close_1: rows.filter((r) => r.status === "close_1").length,
    byStatus: groupRows(rows, (r) => r.status),
    byBrand: groupRows(rows, (r) => (r.brands?.length ? r.brands.join(", ") : r.brand || UNASSIGNED)),
  };

  return {
    type: filters.type,
    rows,
    total,
    summary,
    groups: reportGroupsForType(filters.type, rows),
  };
}

export interface ReportFilterOptions {
  brands: string[];
  targetBy: { id: number; name: string }[];
  targetNatures: string[];
  statuses: { value: string; label: string }[];
}

/** Filter option lists shared by the reporting dashboard. */
export async function getReportFilterOptions(): Promise<ReportFilterOptions> {
  const base = await getCaseFilterOptions();
  return {
    brands: base.brands,
    targetBy: base.targetBy,
    targetNatures: base.targetNatures,
    statuses: CASE_STATUSES,
  };
}