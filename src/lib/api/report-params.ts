import { AuthError } from "@/lib/auth";
import { CASE_STATUSES } from "@/lib/constants";
import {
  REPORT_TYPES,
  type ReportFilters,
  type ReportType,
} from "@/lib/services/report-service";

function optionalString(value: string | null): string | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalInt(value: string | null): string | undefined {
  if (value === null || value === "") return undefined;
  if (!/^\d+$/.test(value)) {
    throw new AuthError(`Invalid filter value: "${value}".`, 400);
  }
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) {
    throw new AuthError(`Invalid filter value: "${value}".`, 400);
  }
  return value;
}

/**
 * Parses and validates report + export query parameters. Invalid filters
 * are rejected with a 400 before any query runs.
 */
export function parseReportParams(searchParams: URLSearchParams): ReportFilters {
  const rawType = searchParams.get("type") ?? "all";
  if (!(REPORT_TYPES as readonly string[]).includes(rawType)) {
    throw new AuthError(`Unknown report type: "${rawType}".`, 400);
  }
  const type = rawType as ReportType;

  const status = optionalString(searchParams.get("status"));
  if (status !== undefined && !CASE_STATUSES.some((s) => s.value === status)) {
    throw new AuthError(`Invalid status filter: "${status}".`, 400);
  }

  return {
    type,
    q: optionalString(searchParams.get("q")),
    status,
    targetBy: optionalInt(searchParams.get("targetBy")),
    targetNature: optionalString(searchParams.get("targetNature")),
    brand: optionalString(searchParams.get("brand")),
    clientReference: optionalString(searchParams.get("clientReference")),
  };
}

/** Compact, human-readable description of the filters for audit records. */
export function describeReportFilters(filters: ReportFilters): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`search "${filters.q}"`);
  if (filters.status) parts.push(`status=${filters.status}`);
  if (filters.targetBy) parts.push(`targetBy=${filters.targetBy}`);
  if (filters.targetNature) parts.push(`nature=${filters.targetNature}`);
  if (filters.brand) parts.push(`brand=${filters.brand}`);
  if (filters.clientReference) parts.push(`clientRef=${filters.clientReference}`);
  return parts.join("; ") || "no filters";
}