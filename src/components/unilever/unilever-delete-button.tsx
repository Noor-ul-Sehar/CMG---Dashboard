"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api/client";

export function UnileverDeleteButton({ caseId }: { caseId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("Delete this Unilever case? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/unilever/${caseId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Unable to delete the case.");
        return;
      }
      router.push("/unilever/cases");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={busy}>
        <TrashIcon className="h-4 w-4" />
        {busy ? "Deleting…" : "Delete Case"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}