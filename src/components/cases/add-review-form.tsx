"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REVIEW_FORM_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/form";

export function AddReviewForm({ caseId }: { caseId: number }) {
  const router = useRouter();
  const [status, setStatus] = useState("reviewed");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status, reviewComment: comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setError(data.error ?? "Unable to add the review.");
        return;
      }
      setStatus("reviewed");
      setComment("");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Review notes — findings, decisions, recommended actions…"
        disabled={submitting}
      />
      {errors.reviewComment ? (
        <p className="text-xs text-red-600">{errors.reviewComment}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
          disabled={submitting}
          aria-label="Review status"
        >
          {REVIEW_FORM_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Saving…" : "Save Review"}
        </Button>
      </div>
    </form>
  );
}