import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db/client";
import { formatDateTime } from "@/lib/format";
import { getField } from "@/lib/import/fields";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { DataTable, type Column } from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/link-button";
import type { ImportBatch, ImportRowResult } from "@/types";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, string> = {
  prepared: "bg-blue-50 text-blue-700 ring-blue-600/20",
  imported: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
};

const rowColumns: Column<ImportRowResult>[] = [
  {
    key: "row",
    header: "Row",
    cell: (r) => <span className="tabular-nums text-zinc-700">{r.row}</span>,
  },
  {
    key: "reference",
    header: "CMG Reference",
    cell: (r) => (
      <span className="font-medium tabular-nums text-zinc-900">
        {r.cmgReference ?? "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => {
      if (r.status === "new") {
        return <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">New</Badge>;
      }
      if (r.status === "duplicate") {
        return <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Duplicate</Badge>;
      }
      return <Badge className="bg-red-50 text-red-700 ring-red-600/20">Invalid</Badge>;
    },
  },
  {
    key: "details",
    header: "Details",
    cell: (r) => (
      <div className="text-xs text-zinc-600">
        {r.errors?.length
          ? r.errors.join(" · ")
          : r.status === "duplicate"
            ? r.duplicateOfRow
              ? `Duplicate of row ${r.duplicateOfRow} in this file`
              : "Already exists in the central database"
            : "Imported successfully"}
        {r.warnings?.length ? (
          <span className="mt-0.5 block text-amber-700">{r.warnings.join(" · ")}</span>
        ) : null}
      </div>
    ),
  },
];

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let batch: ImportBatch | null;
  try {
    batch = await queryOne<ImportBatch>(`
      SELECT id, filename, status, total_rows AS "totalRows",
             new_count AS "newCount", duplicate_count AS "duplicateCount",
             invalid_count AS "invalidCount", column_mapping AS "columnMapping",
             errors, imported_by AS "importedBy", created_at AS "createdAt",
             completed_at AS "completedAt"
      FROM import_batches WHERE id = $1
    `, [id]);
  } catch {
    return <ErrorState message="Unable to load the import report." />;
  }
  if (!batch) notFound();

  const results = Array.isArray(batch.errors) ? batch.errors : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Report"
        description={batch.filename}
        actions={
          <LinkButton href="/market-cases/import-data" variant="secondary">
            Back to Import
          </LinkButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Rows</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">{batch.totalRows}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Imported</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700">{batch.newCount}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Duplicates</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-700">{batch.duplicateCount}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Invalid</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-red-700">{batch.invalidCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Row Report" subtitle="Every row classified after validation" />
          <CardBody>
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">No row results recorded.</p>
            ) : (
              <DataTable columns={rowColumns} rows={results} rowKey={(r) => r.row} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Batch Information" />
          <CardBody className="divide-y divide-zinc-100 text-sm">
            <div className="py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Status</dt>
              <dd className="mt-1">
                <Badge className={STATUS_BADGES[batch.status] ?? "bg-zinc-100 text-zinc-600 ring-zinc-500/20"}>
                  {batch.status}
                </Badge>
              </dd>
            </div>
            <div className="py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Created</dt>
              <dd className="mt-0.5 text-zinc-800">{formatDateTime(batch.createdAt)}</dd>
            </div>
            <div className="py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Completed</dt>
              <dd className="mt-0.5 text-zinc-800">
                {batch.completedAt ? formatDateTime(batch.completedAt) : "—"}
              </dd>
            </div>
            <div className="py-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Column Mapping
              </dt>
              <dd className="mt-1">
                {batch.columnMapping && typeof batch.columnMapping === "object" ? (
                  <ul className="space-y-1">
                    {Object.entries(batch.columnMapping as Record<string, string>).map(([key, header]) => (
                      <li key={key} className="text-xs text-zinc-600">
                        <span className="font-medium text-zinc-900">
                          {getField(key)?.label ?? key}
                        </span>{" "}
                        ← {header}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-zinc-500">Not recorded</span>
                )}
              </dd>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}