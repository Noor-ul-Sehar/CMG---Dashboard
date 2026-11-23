"use client";

import { useCallback, useMemo, useState } from "react";
import {
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  type ReportFilters,
  type ReportResult,
} from "@/lib/report-types";
import type { ReportFilterOptions } from "@/lib/services/report-service";
import type { CaseWithRefs } from "@/types";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";

type FilterState = {
  q: string;
  status: string;
  targetBy: string;
  targetNature: string;
  brand: string;
  clientReference: string;
};

const EMPTY_FILTERS: FilterState = {
  q: "",
  status: "",
  targetBy: "",
  targetNature: "",
  brand: "",
  clientReference: "",
};

function tableColumns(): Column<CaseWithRefs>[] {
  return [
    {
      key: "ref",
      header: "CMG Ref.",
      cell: (r) => (
        <a
          href={`/market-cases/all-cases/${r.id}`}
          className="font-medium tabular-nums text-zinc-900 underline-offset-2 hover:underline"
        >
          {r.cmgReference}
        </a>
      ),
    },
    {
      key: "clientRef",
      header: "Client Ref.",
      cell: (r) => <span className="tabular-nums">{r.clientReference ?? "—"}</span>,
    },
    {
      key: "target",
      header: "Target",
      cell: (r) => (
        <span className="block max-w-48 truncate" title={r.targetName ?? ""}>
          {r.targetName ?? "—"}
        </span>
      ),
    },
    {
      key: "brand",
      header: "Brand",
      cell: (r) => (r.brands?.length ? r.brands.join(", ") : r.brand ?? "—"),
    },
    {
      key: "status",
      header: "Case Status",
      cell: (r) => <StatusBadge type="case" value={r.status} />,
    },
    {
      key: "reportStatus",
      header: "Approval Status",
      cell: (r) => <StatusBadge type="approval" value={r.reportStatus} />,
    },
  ];
}

function buildQuery(type: string, f: Omit<ReportFilters, "type">): URLSearchParams {
  const params = new URLSearchParams();
  params.set("type", type);
  if (f.q) params.set("q", f.q);
  if (f.status) params.set("status", f.status);
  if (f.targetBy) params.set("targetBy", f.targetBy);
  if (f.targetNature) params.set("targetNature", f.targetNature);
  if (f.brand) params.set("brand", f.brand);
  if (f.clientReference) params.set("clientReference", f.clientReference);
  return params;
}

export function ReportsDashboard({
  options,
  canExport,
}: {
  options: ReportFilterOptions;
  canExport: boolean;
}) {
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]>("all");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  const set = (key: keyof FilterState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDraft((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const openFilters = () => {
    setDraft(filters);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setFilters(draft);
    setFiltersOpen(false);
  };

  const activeFilterCount = Object.values(filters).filter((value) => value.trim() !== "").length;

  const runReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildQuery(type, filters);
      const res = await fetch(`/api/reports?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Failed to run report.");
        setResult(null);
        return;
      }
      const data: ReportResult = await res.json();
      setResult(data);
    } catch {
      setError("Failed to run report. Please try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [type, filters]);

  const exportQuery = useMemo(() => buildQuery(type, filters), [type, filters]);
  const grouped = type === "by_brand";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Report type" subtitle="Choose what you want to see, then run the report." />
        <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
          {REPORT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                type === t
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
              }`}
            >
              {REPORT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Filters"
          subtitle="Narrow the report down, then run the report to apply changes."
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-5 py-4">
          <Button type="button" variant="secondary" onClick={openFilters}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
          <Button onClick={runReport} disabled={loading}>
            {loading ? "Running…" : "Run Report"}
          </Button>
          {canExport && result ? (
            <>
              <a
                href={`/api/reports/export?format=xlsx&${exportQuery.toString()}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm shadow-zinc-900/10 transition-colors hover:bg-zinc-800"
              >
                Export Excel (.xlsx)
              </a>
              <a
                href={`/api/reports/export?format=csv&${exportQuery.toString()}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm shadow-zinc-900/[0.03] transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                Export CSV (.csv)
              </a>
            </>
          ) : null}
        </div>
      </Card>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Report filters"
        description="Leave fields blank to include everything. Apply to update the report query."
        size="xl"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDraft(EMPTY_FILTERS)}>
              Clear
            </Button>
            <Button type="button" variant="secondary" onClick={() => setFiltersOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyFilters}>
              Apply
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="CMG Reference">
            <Input value={draft.q} onChange={set("q")} placeholder="e.g. CMG-2024-0001" />
          </Field>
          <Field label="Client Reference">
            <Input value={draft.clientReference} onChange={set("clientReference")} placeholder="e.g. ARO-1123" />
          </Field>
          <Field label="Case Status">
            <Select value={draft.status} onChange={set("status")}>
              <option value="">All statuses</option>
              {options.statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target By">
            <Select value={draft.targetBy} onChange={set("targetBy")}>
              <option value="">All targeted by</option>
              {options.targetBy.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target Nature">
            <Select value={draft.targetNature} onChange={set("targetNature")}>
              <option value="">All natures</option>
              {options.targetNatures.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand">
            <Select value={draft.brand} onChange={set("brand")}>
              <option value="">All brands</option>
              {options.brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      {error ? (
        <ErrorState title="Could not run the report" message={error} />
      ) : null}

      {result ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total records</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">{result.total}</p>
            </Card>
            <Card className="px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Open</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700">{result.summary.open}</p>
            </Card>
            <Card className="px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Closed</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-600">{result.summary.close}</p>
            </Card>
            <Card className="px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Close 1</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-600">{result.summary.close_1}</p>
            </Card>
          </div>

          {grouped && result.groups.length > 0 ? (
            <Card>
              <CardHeader
                title={`Breakdown — ${REPORT_TYPE_LABELS[result.type]}`}
                subtitle="Cases grouped by brand"
              />
              <div className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.groups.map((g) => (
                  <div
                    key={g.key}
                    className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50/60 px-4 py-3"
                  >
                    <span className="truncate text-sm font-medium text-zinc-800">{g.key}</span>
                    <span className="ml-3 tabular-nums text-sm font-semibold text-zinc-900">{g.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {!grouped && result.total > 0 ? (
            <Card>
              <CardHeader title="Status breakdown" subtitle="How the filtered cases are distributed" />
              <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-3 lg:grid-cols-5">
                {result.summary.byStatus.map((g) => (
                  <div
                    key={g.key}
                    className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50/60 px-4 py-3"
                  >
                    <StatusBadge type="case" value={g.key} />
                    <span className="ml-3 tabular-nums text-sm font-semibold text-zinc-900">{g.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Results"
              subtitle={
                result.total > 0
                  ? `Showing ${result.total} case${result.total === 1 ? "" : "s"} matching the report.`
                  : "No cases matched the selected report."
              }
            />
            <DataTable
              columns={tableColumns()}
              rows={result.rows}
              empty={<EmptyState title="No records" description="No cases matched the current report and filters." />}
            />
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader title="Report preview" subtitle="Run a report to see results here." />
          <EmptyState
            title="No report yet"
            description="Pick a report type, adjust filters if needed, and press Run report."
          />
        </Card>
      )}
    </div>
  );
}