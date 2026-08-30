import {
  getUnileverStats,
  listUnileverBrands,
  listUnileverCases,
} from "@/lib/services/unilever-service";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { UnileverFilters } from "./unilever-filters";
import { Pagination } from "@/components/cases/pagination";
import { ChevronRightIcon } from "@/components/icons";
import type { UnileverCase } from "@/types";

export interface UnileverViewProps {
  searchParams: Record<string, string | string[] | undefined>;
}

function str(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const PER_PAGE = 20;

function BrandsCell({ row }: { row: UnileverCase }) {
  const brands = row.brands ?? [];
  if (brands.length === 0) return <span>{row.brand ?? "—"}</span>;
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
}

function columns(): Column<UnileverCase>[] {
  return [
    {
      key: "ref",
      header: "CMG Reference #",
      cell: (r) => (
        <a
          href={`/unilever/${r.id}`}
          className="relative z-10 font-medium tabular-nums text-zinc-900 underline-offset-2 hover:underline"
        >
          {r.cmgReference}
        </a>
      ),
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
    { key: "brand", header: "Brand", cell: (r) => <BrandsCell row={r} /> },
    {
      key: "targetBy",
      header: "Target By",
      cell: (r) => (
        <span className="block max-w-36 truncate" title={r.targetBy ?? ""}>
          {r.targetBy ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Case Status",
      cell: (r) => <StatusBadge type="case" value={r.status} />,
    },
    {
      key: "approvalStatus",
      header: "Approval Status",
      cell: (r) => <StatusBadge type="approval" value={r.approvalStatus} />,
    },
    {
      key: "investigationDate",
      header: "Investigation Date",
      cell: (r) => (
        <span className="tabular-nums text-zinc-500">
          {r.investigationDate ? formatDate(r.investigationDate) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (r) => (
        <div className="relative z-10 flex items-center gap-2">
          <LinkButton href={`/unilever/${r.id}`} variant="ghost" size="sm">
            View
          </LinkButton>
          <LinkButton href={`/unilever/${r.id}/edit`} variant="ghost" size="sm">
            Edit
          </LinkButton>
        </div>
      ),
    },
  ];
}

export async function UnileverView({ searchParams }: UnileverViewProps) {
  const q = str(searchParams.q);
  const page = Math.max(1, Number.parseInt(str(searchParams.page) ?? "1", 10) || 1);
  const status = str(searchParams.status);
  const targetBy = str(searchParams.target_by);
  const targetNature = str(searchParams.target_nature);
  const brand = str(searchParams.brand);

  const hasActiveFilters = Boolean(q || status || targetBy || targetNature || brand);

  const [{ rows, total, page: currentPage, totalPages }, options, stats] = await Promise.all([
    listUnileverCases({
      q,
      status: status || undefined,
      targetBy: targetBy || undefined,
      targetNature: targetNature || undefined,
      brand: brand || undefined,
      page,
      perPage: PER_PAGE,
    }),
    listUnileverBrands(),
    getUnileverStats(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Unilever Cases"
        description="Independent Unilever case-management module."
        actions={<LinkButton href="/unilever/new">New Unilever Case</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Unilever Cases" value={stats.total} accent="text-zinc-900" href="/unilever" />
        <StatCard label="Open" value={stats.open} accent="text-emerald-700" href="/unilever?status=open" />
        <StatCard label="Close 1" value={stats.close_1} accent="text-zinc-600" href="/unilever?status=close_1" />
        <StatCard label="Closed" value={stats.close} accent="text-zinc-600" href="/unilever?status=close" />
      </div>

      <UnileverFilters brands={options.map((b) => b.name)} />

      <Card>
        {rows.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={
                <span className="flex h-5 w-5 items-center justify-center">
                  <ChevronRightIcon className="h-5 w-5 -rotate-90" />
                </span>
              }
              title="No cases match the current filters"
              description="Try adjusting your search or clearing the filters."
            />
          ) : (
            <EmptyState
              title="No Unilever Cases yet"
              description="Create your first Unilever case to get started."
              action={<LinkButton href="/unilever/new">+ New Unilever Case</LinkButton>}
            />
          )
        ) : (
          <DataTable
            columns={columns()}
            rows={rows}
            rowHref={(row) => `/unilever/${row.id}`}
          />
        )}
      </Card>

      <Pagination page={currentPage} totalPages={totalPages} total={total} />
    </div>
  );
}