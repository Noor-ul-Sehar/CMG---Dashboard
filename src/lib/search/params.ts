import type { CaseListFilters, CaseSort } from "@/types";

type ParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

const SORTS: CaseSort[] = ["newest", "oldest", "az", "za", "relevance"];

function read(input: ParamsInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

function readList(input: ParamsInput, key: string): string[] | undefined {
  let values: string[];
  if (input instanceof URLSearchParams) {
    values = input.getAll(key);
  } else {
    const value = input[key];
    values = Array.isArray(value) ? value : value ? [value] : [];
  }
  const cleaned = values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : undefined;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Single source of truth for turning URL/query-string values into case search
 * filters. Used by both the server component and the live search API so the
 * two paths can never drift apart.
 */
export function parseCaseSearchParams(input: ParamsInput): CaseListFilters {
  const rawSort = read(input, "sort");
  const sort = SORTS.find((entry) => entry === rawSort) ?? "newest";

  const rawPerPage = Number.parseInt(read(input, "per_page") ?? "", 10);
  const perPage = Number.isFinite(rawPerPage)
    ? Math.min(100, Math.max(5, rawPerPage))
    : 20;

  return {
    q: clean(read(input, "q")),
    status: clean(read(input, "status")),
    statusIn: readList(input, "status_in"),
    targetBy: clean(read(input, "target_by")),
    targetNature: clean(read(input, "target_nature")),
    brand: clean(read(input, "brand")),
    brands: readList(input, "brands"),
    clientReference: clean(read(input, "client_reference")),
    reportStatus: clean(read(input, "report_status")),
    caseType: clean(read(input, "case_type")),
    investigator: clean(read(input, "investigator")),
    team: clean(read(input, "team")),
    dateFrom: clean(read(input, "date_from")),
    dateTo: clean(read(input, "date_to")),
    sort,
    page: toPositiveInt(read(input, "page"), 1),
    perPage,
  };
}

/** Serializes filters back into URL-friendly snake_case params. */
export function filtersToSearchParams(filters: CaseListFilters): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined | null) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  };

  set("q", filters.q);
  set("status", filters.status);
  if (filters.statusIn?.length) set("status_in", filters.statusIn.join(","));
  set("target_by", filters.targetBy);
  set("target_nature", filters.targetNature);
  set("brand", filters.brand);
  if (filters.brands?.length) set("brands", filters.brands.join(","));
  set("client_reference", filters.clientReference);
  set("report_status", filters.reportStatus);
  set("case_type", filters.caseType);
  set("investigator", filters.investigator);
  set("team", filters.team);
  set("date_from", filters.dateFrom);
  set("date_to", filters.dateTo);
  set("sort", filters.sort);
  set("page", filters.page);
  set("per_page", filters.perPage);
  return params;
}
