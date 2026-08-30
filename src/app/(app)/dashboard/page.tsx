import Link from "next/link";
import { getDashboardStats } from "@/lib/services/dashboard-service";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import {
  ChevronRightIcon,
  FileTextIcon,
  LayersIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/icons";
import { CASE_STATUS_COLORS } from "@/lib/constants";
import type { CaseWithRefs } from "@/types";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>>;
  try {
    stats = await getDashboardStats();
  } catch (err) {
    return (
      <ErrorState
        title="Unable to load dashboard data"
        message={
          err instanceof Error
            ? err.message
            : "Check that the database is running and seeded."
        }
      />
    );
  }

  const total = stats.total_cases || 1;
  const statusColors: Record<string, string> = CASE_STATUS_COLORS;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Create, manage, search and report on your cases — all from one place."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <LinkButton href="/cases/new" variant="primary" className="justify-start px-4 py-3 text-sm">
          <PlusIcon className="h-4 w-4" />
          New Market Case
        </LinkButton>
        <LinkButton href="/search" variant="secondary" className="justify-start px-4 py-3 text-sm">
          <SearchIcon className="h-4 w-4" />
          Search Cases
        </LinkButton>
        <LinkButton href="/custom-recordals" variant="secondary" className="justify-start px-4 py-3 text-sm">
          <LayersIcon className="h-4 w-4" />
          Custom Recordals
        </LinkButton>
        <LinkButton href="/reports" variant="secondary" className="justify-start px-4 py-3 text-sm">
          <FileTextIcon className="h-4 w-4" />
          Reports
        </LinkButton>
        <LinkButton href="/unilever" variant="secondary" className="justify-start px-4 py-3 text-sm">
          <PackageIcon className="h-4 w-4" />
          Unilever Cases
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Cases" value={stats.total_cases} accent="text-zinc-900" href="/cases" />
        <StatCard label="Open" value={stats.open_cases} accent="text-emerald-700" href="/cases/open" />
        <StatCard label="Close 1" value={stats.close_1_cases} accent="text-zinc-600" href="/cases/close-1" />
        <StatCard label="Closed" value={stats.closed_cases} accent="text-zinc-600" href="/cases/closed" />
      </div>

      <Card>
        <CardHeader title="Cases by Status" subtitle="Current state of every case" />
        <CardBody>
          {stats.cases_by_status.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">No cases found.</p>
          ) : (
            <div>
              <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-zinc-100">
                {stats.cases_by_status.map((s) => {
                  const colorClass = statusColors[s.status] ?? "";
                  const bg =
                    colorClass.match(/bg-[a-z]+-50/)?.[0].replace("-50", "-500") ??
                    "bg-zinc-400";
                  return (
                    <div
                      key={s.status}
                      className={bg}
                      style={{ width: `${(s.count / total) * 100}%` }}
                      title={`${s.status}: ${s.count}`}
                    />
                  );
                })}
              </div>
              <ul className="space-y-2">
                {stats.cases_by_status.map((s) => (
                  <li
                    key={s.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <StatusBadge type="case" value={s.status} />
                    <span className="font-medium tabular-nums text-zinc-900">
                      {s.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Cases"
            subtitle="Most recently updated cases"
            action={
              <Link
                href="/cases"
                className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2"
              >
                View all
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            }
          />
          <DataTable
            columns={recentColumns}
            rows={stats.recent_cases}
            empty="No cases found."
            rowHref={(row) => `/cases/${row.id}`}
          />
        </Card>

        <Card>
          <CardHeader
            title="Pending Approval"
            subtitle="Cases currently awaiting approval"
            action={
              <Link
                href="/cases"
                className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2"
              >
                View all
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            }
          />
          {stats.important_pending.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              No pending approvals. All cases are up to date.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {stats.important_pending.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <Link
                    href={`/cases/${c.id}`}
                    className="block rounded-md -mx-1 px-1 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium tabular-nums text-zinc-900">
                        {c.cmgReference}
                      </span>
                      <StatusBadge type="case" value={c.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {c.targetName ?? "No target"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-xs text-zinc-400">
        Showing live data. KPI cards and rows link to their matching case views.
      </p>
    </div>
  );
}