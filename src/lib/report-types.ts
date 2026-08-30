import type { CaseListFilters, CaseWithRefs } from "@/types";

export const REPORT_TYPES = [
  "all",
  "open",
  "close",
  "close_1",
  "by_brand",
  "custom",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  all: "All Cases",
  open: "Open Cases",
  close: "Closed Cases",
  close_1: "Close 1 Cases",
  by_brand: "Cases by Brand",
  custom: "Custom filtered case report",
};

export interface ReportFilters extends CaseListFilters {
  type: ReportType;
}

export interface ReportGroup {
  key: string;
  count: number;
}

export interface ReportSummary {
  total: number;
  open: number;
  close: number;
  close_1: number;
  byStatus: ReportGroup[];
  byBrand: ReportGroup[];
}

export interface ReportResult {
  type: ReportType;
  rows: CaseWithRefs[];
  total: number;
  summary: ReportSummary;
  groups: ReportGroup[];
}