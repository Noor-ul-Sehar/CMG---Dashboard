"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REMARK_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/form";
import { apiFetch } from "@/lib/api/client";

export function AddRemarkForm({ caseId }: { caseId: number }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [type, setType] = useState("note");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Remark text is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/cases/${caseId}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to add the remark.");
        return;
      }
      setComment("");
      setType("note");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}
      <Textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add an update, note, or remark to this case…"
        disabled={submitting}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-40"
          disabled={submitting}
          aria-label="Remark type"
        >
          {REMARK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={submitting || !comment.trim()}>
          {submitting ? "Adding…" : "Add Remark"}
        </Button>
      </div>
    </form>
  );
}