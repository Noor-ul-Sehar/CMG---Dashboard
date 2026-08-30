import { query } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ImportWizard } from "@/components/import/import-wizard";
import type { ImportBatch } from "@/types";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, string> = {
  prepared: "bg-blue-50 text-blue-700 ring-blue-600/20",
  imported: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
};

export default async function ImportPage() {
  const user = await getSessionUser();
  if (!user || !can(user, "import")) {
    redirect("/dashboard");
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">File</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Rows</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">New</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Duplicates</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Invalid</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Report</th>
                </tr>
              </thead>
              <tbody>
                {history.map((b) => (
                  <tr key={b.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                    <td className="max-w-56 truncate px-4 py-3 font-medium text-zinc-900">{b.filename}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">{b.totalRows}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700">{b.newCount}</td>
                    <td className="px-4 py-3 tabular-nums text-amber-700">{b.duplicateCount}</td>
                    <td className="px-4 py-3 tabular-nums text-red-700">{b.invalidCount}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGES[b.status] ?? "bg-zinc-100 text-zinc-600 ring-zinc-500/20"}>
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-500">
                      {formatDateTime(b.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/import/batches/${b.id}`}
                        className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline"
                      >
                        View report
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}