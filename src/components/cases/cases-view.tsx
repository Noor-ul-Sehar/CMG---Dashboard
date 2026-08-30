import { getCaseFilterOptions, searchCases } from "@/lib/services/case-service";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { EmptyState } from "@/components/ui/states";
import { CaseFilters } from "./case-filters";
import { Pagination } from "./pagination";
import { ChevronRightIcon } from "@/components/icons";
import type { CaseWithRefs } from "@/types";

export interface CasesViewProps {
  title: string;
  description: string;
  statusMode: "all" | "open" | "closed" | "close1";
  searchParams: Record<string, string | string[] | undefined>;
  showNewButton?: boolean;
}

function str(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const PER_PAGE = 20;

function BrandsCell({ row }: { row: CaseWithRefs }) {
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

function columns(): Column<CaseWithRefs>[] {
  return [
    {
      key: "ref",
      header: "CMG Reference #",
      cell: (r) => (
        <a
          href={`/cases/${r.id}`}
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
      key: "reportStatus",
      header: "Approval Status",
      cell: (r) => <StatusBadge type="approval" value={r.reportStatus} />,
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
          <LinkButton href={`/cases/${r.id}`} variant="ghost" size="sm">
            View
          </LinkButton>
          <LinkButton href={`/cases/${r.id}/edit`} variant="ghost" size="sm">
            Edit
          </LinkButton>
        </div>
      ),
    },
  ];
}

export async function CasesView({
  title,
  description,
  statusMode,
  searchParams,
  showNewButton = false,
}: CasesViewProps) {
  const q = str(searchParams.q);
  const page = Math.max(1, Number.parseInt(str(searchParams.page) ?? "1", 10) || 1);
  const targetByF = str(searchParams.target_by);
  const targetNature = str(searchParams.target_nature);
  const brand = str(searchParams.brand);

  const status =
    statusMode === "all" ? (str(searchParams.status) || undefined) : undefined;
  const statusIn =
    statusMode === "open"
      ? ["open"]
      : statusMode === "closed"
        ? ["close"]
        : statusMode === "close1"
          ? ["close_1"]
          : undefined;

  const hasActiveFilters = Boolean(
    q ||
      status ||
      targetByF ||
      targetNature ||
      brand
  );

  const [{ rows, total, page: currentPage, totalPages }, options] = await Promise.all([
    searchCases({
      q,
      status,
      statusIn,
      targetBy: targetByF || null,
      targetNature: targetNature || null,
      brand: brand || null,
      page,
      perPage: PER_PAGE,
    }),
    getCaseFilterOptions(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          showNewButton ? (
            <LinkButton href="/cases/new">New Market Case</LinkButton>
          ) : undefined
        }
      />

      <CaseFilters
        mode={statusMode === "all" ? "all" : "locked"}
        targetBy={options.targetBy}
        targetNatures={options.targetNatures}
        brands={options.brands}
      />

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
          ) : statusMode === "all" ? (
            <EmptyState
              title="No Market Cases yet"
              description="Create your first Market Case to get started."
              action={<LinkButton href="/cases/new">+ New Market Case</LinkButton>}
            />
          ) : (
            <EmptyState
              title={`No ${title} yet`}
              description="Cases will appear here when their status matches."
            />
          )
        ) : (
          <DataTable
            columns={columns()}
            rows={rows}
            rowHref={(row) => `/cases/${row.id}`}
          />
        )}
      </Card>

      <Pagination page={currentPage} totalPages={totalPages} total={total} />
    </div>
  );
}