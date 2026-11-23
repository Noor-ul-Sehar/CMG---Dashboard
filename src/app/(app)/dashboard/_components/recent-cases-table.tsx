"use client";

import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { CaseWithRefs } from "@/types";

const recentColumns: Column<CaseWithRefs>[] = [
  {
    key: "ref",
    header: "CMG Reference",
    cell: (r) => (
      <span className="font-medium tabular-nums text-zinc-900">
        {r.cmgReference}
      </span>
    ),
  },
  {
    key: "target",
    header: "Target",
    cell: (r) => (
      <span className="block max-w-56 truncate" title={r.targetName ?? ""}>
        {r.targetName ?? "—"}
      </span>
    ),
  },
  {
    key: "brand",
    header: "Brands",
    cell: (r) => {
      const brands = r.brands ?? [];
      if (brands.length === 0) return r.brand ?? "—";
      return (
        <span className="flex flex-wrap gap-1">
          {brands.slice(0, 2).map((b) => (
            <span
              key={b}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
            >
              {b}
            </span>
          ))}
          {brands.length > 2 ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
              +{brands.length - 2}
            </span>
          ) : null}
        </span>
      );
    },
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
  {
    key: "updated",
    header: "Last Updated",
    cell: (r) => (
      <span className="tabular-nums text-zinc-500">
        {formatDate(r.lastUpdated)}
      </span>
    ),
  },
];

export function RecentCasesTable({ rows }: { rows: CaseWithRefs[] }) {
  return (
    <DataTable
      columns={recentColumns}
      rows={rows}
      empty="No cases found."
      rowHref={(row) => `/market-cases/all-cases/${row.id}`}
    />
  );
}