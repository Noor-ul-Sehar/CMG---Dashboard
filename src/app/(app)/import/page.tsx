import { query } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ImportWizard } from "@/components/import/import-wizard";
import type { ImportBatch } from "@/types";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, string> = {
  prepared: "bg-blue-50 text-blue-700 ring-blue-600/20",
  imported: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
};

const historyColumns: Column<ImportBatch>[] = [
  {
    key: "file",
    header: "File",
    cell: (b) => (
      <span className="block max-w-56 truncate font-medium text-zinc-900" title={b.filename}>
        {b.filename}
      </span>
    ),
  },
  {
    key: "rows",
    header: "Rows",
    cell: (b) => <span className="tabular-nums text-zinc-700">{b.totalRows}</span>,
  },
  {
    key: "new",
    header: "New",
    cell: (b) => <span className="tabular-nums text-emerald-700">{b.newCount}</span>,
  },
  {
    key: "duplicates",
    header: "Duplicates",
    cell: (b) => <span className="tabular-nums text-amber-700">{b.duplicateCount}</span>,
  },
  {
    key: "invalid",
    header: "Invalid",
    cell: (b) => <span className="tabular-nums text-red-700">{b.invalidCount}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (b) => (
      <Badge className={STATUS_BADGES[b.status] ?? "bg-zinc-100 text-zinc-600 ring-zinc-500/20"}>
        {b.status}
      </Badge>
    ),
  },
  {
    key: "date",
    header: "Date",
    cell: (b) => <span className="tabular-nums text-zinc-500">{formatDateTime(b.createdAt)}</span>,
  },
  {
    key: "report",
    header: "Report",
    cell: (b) => (
      <a
        href={`/market-cases/import-data/batches/${b.id}`}
        className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline"
      >
        View report
      </a>
    ),
  },
];

export default async function ImportPage() {
  const user = await getSessionUser();
  if (!user || !can(user, "import")) {
    redirect("/overview/dashboard");
  }
  let history: ImportBatch[] = [];
  try {
    history = await query<ImportBatch>(`
      SELECT id, filename, status, total_rows AS "totalRows",
             new_count AS "newCount", duplicate_count AS "duplicateCount",
             invalid_count AS "invalidCount", column_mapping AS "columnMapping",
             errors, imported_by AS "importedBy", created_at AS "createdAt",
             completed_at AS "completedAt"
      FROM import_batches
      ORDER BY created_at DESC
      LIMIT 50
    `);
  } catch {
    // History is secondary; the wizard still works.
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        description="Upload an Excel or CSV file of Market Case rows and create the cases in one click."
      />

      <ImportWizard />

      <Card>
        <CardHeader
          title="Import History"
          subtitle="Previous imports and their error reports"
        />
        {history.length === 0 ? (
          <EmptyState
            title="No imports yet"
            description="Completed imports will appear here with their full error reports."
          />
        ) : (
          <DataTable
            columns={historyColumns}
            rows={history}
            rowKey={(b) => b.id}
          />
        )}
      </Card>
    </div>
  );
}