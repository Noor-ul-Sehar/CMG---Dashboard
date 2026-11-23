"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getField, type ColumnMappingSuggestion } from "@/lib/import/fields";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { AlertIcon, UploadIcon } from "@/components/icons";
import type {
  ConfirmImportResult,
  ImportRowResult,
  ImportValidationSummary,
} from "@/types";

interface UploadResult {
  token: string;
  filename: string;
  sheetName: string;
  headers: string[];
  totalRows: number;
  truncated: boolean;
  previewRows: Record<string, string>[];
  autoMapping: ColumnMappingSuggestion[];
}

type Phase = "upload" | "preview" | "result";

const IMPORTANT_FIELDS = [
  "cmg_reference",
  "client_reference",
  "target_name",
  "target_nature",
  "target_by",
  "brand",
  "investigation_date",
  "status",
  "report_status",
  "notes",
];

function CountCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    default: "text-zinc-900",
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${tones[tone]}`}>
        {value}
      </p>
    </Card>
  );
}

function ProblemRow({ problem }: { problem: ImportRowResult }) {
  const reason =
    problem.status === "duplicate"
      ? "CMG Reference # already exists."
      : problem.errors?.length
        ? problem.errors.join(" · ")
        : "Could not import this row.";
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-zinc-100 py-2 text-sm last:border-0">
      <span className="w-10 shrink-0 tabular-nums text-zinc-400">#{problem.row}</span>
      <span className="min-w-0 flex-1 text-zinc-700">
        {problem.cmgReference ?? "—"}
      </span>
      <Badge
        className={
          problem.status === "duplicate"
            ? "bg-amber-50 text-amber-700 ring-amber-600/20"
            : "bg-red-50 text-red-700 ring-red-600/20"
        }
      >
        {problem.status === "duplicate" ? "Skipped" : "Failed"}
      </Badge>
      <span className="w-full text-xs text-zinc-600 sm:w-auto sm:flex-1 sm:text-right">
        {reason}
      </span>
    </li>
  );
}

export function ImportWizard() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<ImportValidationSummary | null>(null);
  const [result, setResult] = useState<ConfirmImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = fileInputRef.current;
    return () => {
      if (input) input.value = "";
    };
  }, []);

  function reset() {
    setPhase("upload");
    setError(null);
    setUpload(null);
    setFieldMapping({});
    setSummary(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to upload the file.");
        return;
      }
      const u = data as UploadResult;

      // Automatic column recognition: use the auto-suggested destination field.
      const mapping: Record<string, string> = {};
      for (const s of u.autoMapping) {
        if (s.fieldKey) mapping[s.fieldKey] = s.header;
      }
      setUpload(u);
      setFieldMapping(mapping);

      if (!mapping.cmg_reference) {
        setPhase("preview");
        return;
      }

      // Validate behind the scenes so the preview can show readiness.
      const vres = await fetch("/api/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: u.token, mapping }),
      });
      const vdata = await vres.json();
      if (vres.ok) {
        setSummary(vdata.summary as ImportValidationSummary);
      }
      setPhase("preview");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!upload) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: upload.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to complete the import.");
        return;
      }
      setResult(data as ConfirmImportResult);
      setPhase("result");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {phase === "upload" ? (
        <Card>
          <CardHeader
            title="1. Upload File"
            subtitle="Choose an Excel (.xlsx) or CSV file containing Market Case rows."
          />
          <CardBody>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-100 ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <UploadIcon className="h-8 w-8 text-zinc-400" />
              <p className="mt-3 text-sm font-medium text-zinc-700">
                {busy ? "Uploading and reading file…" : "Choose a file to upload"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                .xlsx or .csv · up to 20 MB · first row must be column headers
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
            <p className="mt-4 rounded-md bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
              Each spreadsheet row becomes one complete Market Case. Columns are
              recognized automatically — no manual mapping needed.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {phase === "preview" && upload ? (
        <Card>
          <CardHeader
            title="2. Preview"
            subtitle="The file has been read. Review and import in one click."
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  File
                </p>
                <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                  {upload.filename}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Rows
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {upload.totalRows}
                  {upload.truncated ? " (file truncated)" : ""}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Recognized columns
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {Object.keys(fieldMapping).length}
                </p>
              </div>
            </div>

            {!fieldMapping.cmg_reference ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  The CMG Reference Number column could not be recognized
                  automatically. Check that the sheet has a column named e.g.
                  “CMG Reference” and try again.
                </span>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Recognized columns
              </p>
              <div className="flex flex-wrap gap-2">
                {IMPORTANT_FIELDS.map((key) => {
                  const header = fieldMapping[key];
                  if (!header) return null;
                  const label = getField(key)?.label ?? key;
                  return (
                    <Badge key={key} className="bg-zinc-100 text-zinc-700 ring-zinc-500/20">
                      {label} ← {header}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {summary ? (
              <div className="flex flex-wrap gap-4 rounded-md bg-zinc-50 px-4 py-3 text-sm">
                <span className="text-zinc-700">
                  <span className="font-semibold text-emerald-700">
                    {summary.newCount}
                  </span>{" "}
                  ready to import
                </span>
                <span className="text-zinc-700">
                  <span className="font-semibold text-amber-700">
                    {summary.duplicateCount}
                  </span>{" "}
                  skipped (already exist)
                </span>
                <span className="text-zinc-700">
                  <span className="font-semibold text-red-700">
                    {summary.invalidCount}
                  </span>{" "}
                  failed
                </span>
              </div>
            ) : null}

            {summary && summary.problems.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Rows needing attention
                </p>
                <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200/70 px-4">
                  {summary.problems.map((problem) => (
                    <ProblemRow key={problem.row} problem={problem} />
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
              <Button onClick={handleImport} disabled={busy || !fieldMapping.cmg_reference}>
                {busy ? "Importing…" : "Import Market Cases"}
              </Button>
              <Button type="button" variant="secondary" onClick={reset} disabled={busy}>
                Choose a different file
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {phase === "result" && result ? (
        <Card>
          <CardHeader
            title="Import Complete"
            subtitle={`${upload?.filename ?? "Your file"} was processed.`}
          />
          <CardBody className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <CountCard label="Successfully imported" value={result.imported} tone="green" />
              <CountCard label="Skipped" value={result.duplicates} tone="amber" />
              <CountCard label="Failed" value={result.invalid} tone="red" />
              <CountCard label="Total rows" value={result.total} tone="default" />
            </div>

            {summary && summary.problems.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Skipped / failed rows
                </p>
                <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200/70 px-4">
                  {summary.problems.map((p) => (
                    <ProblemRow key={p.row} problem={p} />
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
              <LinkButton href="/market-cases/all-cases">View Imported Cases</LinkButton>
              <LinkButton href={`/market-cases/import-data/batches/${result.batchId}`} variant="secondary">
                View Import Report
              </LinkButton>
              <Button type="button" variant="ghost" onClick={reset}>
                Import another file
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}