import Link from "next/link";
import { getDashboardStats } from "@/lib/services/dashboard-service";
import { listMasterOptions } from "@/lib/services/master-service";
import { CaseFormModal } from "@/components/cases/case-form-modal";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
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
import { RecentCasesTable } from "./_components/recent-cases-table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>>;
  let targetBy: Awaited<ReturnType<typeof listMasterOptions>>;
  let targetNatures: Awaited<ReturnType<typeof listMasterOptions>>;
  let brands: Awaited<ReturnType<typeof listMasterOptions>>;
  try {
    [stats, targetBy, targetNatures, brands] = await Promise.all([
      getDashboardStats(),
      listMasterOptions("target_by"),
      listMasterOptions("target_natures"),
      listMasterOptions("brands"),
    ]);
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
        <CaseFormModal
          mode="new"
          targetBy={targetBy}
          targetNatures={targetNatures}
          brands={brands}
          label="New Market Case"
          className="justify-start px-4 py-3 text-sm"
          icon={<PlusIcon className="h-4 w-4" />}
        />
        <LinkButton href="/market-cases/search-cases" variant="secondary" className="justify-start px-4 py-3 text-sm">
          <SearchIcon className="h-4 w-4" />
          Search Cases
        </LinkButton>
        <LinkButton href="/custom-recordals/records" variant="secondary" className="justify-start px-4 py-3 text-sm">
          <LayersIcon className="h-4 w-4" />
          Custom Recordals
        </LinkButton>
        <LinkButton href="/market-cases/reporting-export" variant="secondary" className="justify-start px-4 py-3 text-sm">
          <FileTextIcon className="h-4 w-4" />
          Reports
        </LinkButton>
        <LinkButton href="/unilever/cases" variant="secondary" className="justify-start px-4 py-3 text-sm">
          <PackageIcon className="h-4 w-4" />
          Unilever Cases
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Cases" value={stats.total_cases} accent="text-zinc-900" href="/market-cases/all-cases" />
        <StatCard label="Open" value={stats.open_cases} accent="text-emerald-700" href="/market-cases/open-cases" />
        <StatCard label="Close 1" value={stats.close_1_cases} accent="text-zinc-600" href="/market-cases/close-1-cases" />
        <StatCard label="Closed" value={stats.closed_cases} accent="text-zinc-600" href="/market-cases/closed-cases" />
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
                href="/market-cases/all-cases"
                className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-900 focus-visible:outline-offset-2"
              >
                View all
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            }
          />
          <RecentCasesTable rows={stats.recent_cases} />
        </Card>

        <Card>
          <CardHeader
            title="Pending Approval"
            subtitle="Cases currently awaiting approval"
            action={
              <Link
                href="/market-cases/all-cases"
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
                    href={`/market-cases/all-cases/${c.id}`}
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