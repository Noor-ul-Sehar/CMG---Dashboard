"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/form";
import { DownloadIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { CaseDocument } from "@/types";
import { apiFetch } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/client-url";

export function DocumentsPanel({
  caseId,
  documents,
  canUpload,
  canDelete,
}: {
  caseId: number;
  documents: CaseDocument[];
  canUpload: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErrors({ file: "Choose a file to upload." });
      return;
    }
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("description", description);
      const res = await apiFetch(`/api/cases/${caseId}/documents`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setError(data.error ?? "Unable to upload the document.");
        return;
      }
      setFile(null);
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(doc: CaseDocument) {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/api/cases/${caseId}/documents/${doc.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Unable to delete the document.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {canUpload ? (
        <form onSubmit={upload} className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <Field label="Document" required error={errors.file}>
                <Input
                  type="file"
                  ref={fileRef}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={busy}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.7z"
                  className="file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-700"
                />
              </Field>
            </div>
            <Button type="submit" size="sm" disabled={busy || !file}>
              <UploadIcon className="mr-1.5 h-4 w-4" />
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description / evidence reference…"
            disabled={busy}
          />
          <p className="text-xs text-zinc-500">
            Allowed: PDF, Office documents, images, CSV/TXT and ZIP archives. Max 25 MB.
          </p>
        </form>
      ) : null}

      {documents.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-zinc-500">
          No documents uploaded yet. Files stored here are private to authorized users.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">{d.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {d.fileType ? d.fileType.toUpperCase() : "FILE"}
                  {d.fileSize != null ? ` · ${formatBytes(d.fileSize)}` : ""}
                  {d.description ? ` · ${d.description}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Uploaded {formatDateTime(d.createdAt)}
                  {d.uploadedByName ? ` by ${d.uploadedByName}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={apiUrl(`/api/cases/${caseId}/documents/${d.id}`)}
                  className="inline-flex items-center text-sm font-medium text-zinc-600 hover:text-zinc-900"
                  title="Download document"
                >
                  <DownloadIcon className="mr-1 h-4 w-4" />
                  Open
                </a>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => remove(d)}
                    className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-800"
                    title="Delete document"
                  >
                    <TrashIcon className="mr-1 h-4 w-4" />
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}