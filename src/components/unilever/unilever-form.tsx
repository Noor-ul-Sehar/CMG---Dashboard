"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  APPROVAL_STATUSES,
  CASE_STATUSES,
  UNILEVER_TARGET_BY,
  UNILEVER_TARGET_NATURES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { AlertIcon } from "@/components/icons";
import type { UnileverCase } from "@/types";

interface ExistingCaseInfo {
  id: number;
  cmgReference: string;
  targetName: string | null;
  status: string;
}

interface Props {
  mode: "new" | "edit";
  caseData?: UnileverCase | null;
  brands: { id: number; name: string }[];
}

interface FormState {
  cmgReference: string;
  clientReference: string;
  targetName: string;
  targetNature: string;
  targetBy: string;
  brandNames: string[];
  status: string;
  approvalStatus: string;
  investigationDate: string;
  notes: string;
}

function emptyFrom(c?: UnileverCase | null): FormState {
  return {
    cmgReference: c?.cmgReference ?? "",
    clientReference: c?.clientReference ?? "",
    targetName: c?.targetName ?? "",
    targetNature: c?.targetNature ?? "",
    targetBy: c?.targetBy ?? "",
    brandNames: c?.brands?.length ? [...c.brands] : c?.brand ? [c.brand] : [],
    status: c?.status ?? "open",
    approvalStatus: c?.approvalStatus ?? "pending_approval",
    investigationDate: c?.investigationDate ?? "",
    notes: c?.notes ?? "",
  };
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="col-span-full border-b border-zinc-200 pb-2 text-sm font-semibold uppercase tracking-wide text-zinc-900">
      {children}
    </h3>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="col-span-full pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </p>
  );
}

export function UnileverForm({ mode, caseData, brands }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => emptyFrom(caseData));
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<ExistingCaseInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const originalReference = caseData?.cmgReference ?? "";
  const brandNames = brands.map((b) => b.name);

  const setField = useCallback((key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "cmgReference") {
      setErrors((prev) => ({ ...prev, cmgReference: "" }));
    }
  }, []);

  const checkReference = useCallback(
    (ref: string) => {
      const normalized = ref.trim().toUpperCase();
      if (mode === "edit" && normalized === originalReference) {
        setDuplicate(null);
        return;
      }
      if (!normalized) {
        setDuplicate(null);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setChecking(true);
      fetch(`/api/unilever/check-reference?ref=${encodeURIComponent(normalized)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.exists) {
            setDuplicate(data.case as ExistingCaseInfo);
          } else {
            setDuplicate(null);
          }
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    },
    [mode, originalReference]
  );

  const onReferenceChange = useCallback(
    (value: string) => {
      setField("cmgReference", value);
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
      checkTimeout.current = setTimeout(() => checkReference(value), 400);
    },
    [setField, checkReference]
  );

  useEffect(() => {
    return () => {
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
      abortRef.current?.abort();
    };
  }, []);

  function commitTag() {
    const value = tagInput.replace(/,+$/, "").trim();
    if (!value) return;
    setForm((prev) => {
      const exists = prev.brandNames.some(
        (b) => b.toLowerCase() === value.toLowerCase()
      );
      if (exists) return prev;
      return { ...prev, brandNames: [...prev.brandNames, value] };
    });
    setTagInput("");
  }

  function removeBrand(name: string) {
    setForm((prev) => ({
      ...prev,
      brandNames: prev.brandNames.filter(
        (b) => b.toLowerCase() !== name.toLowerCase()
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const payload: Record<string, unknown> = {
      cmgReference: form.cmgReference,
      clientReference: form.clientReference,
      targetName: form.targetName,
      targetNature: form.targetNature,
      targetBy: form.targetBy || null,
      brandNames: form.brandNames,
      status: form.status,
      approvalStatus: form.approvalStatus,
      investigationDate: form.investigationDate,
      notes: form.notes,
    };

    setSubmitting(true);
    try {
      const res = await fetch(
        mode === "edit" ? `/api/unilever/${caseData?.id}` : "/api/unilever",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (res.ok) {
        router.push(`/unilever/${data.id}`);
        router.refresh();
        return;
      }
      if (res.status === 409) {
        setDuplicate(data.existing as ExistingCaseInfo);
        setErrors((prev) => ({
          ...prev,
          cmgReference: "This CMG reference number is already in use within Unilever.",
        }));
      } else if (res.status === 400 && data.errors) {
        setErrors(data.errors as Record<string, string>);
      } else {
        setServerError(data.error ?? "Unable to save the case.");
      }
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const duplicateBlocked = duplicate !== null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <Card>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SectionHeading>Overall Case Details</SectionHeading>

          <GroupLabel>Identification</GroupLabel>

          <Field
            label="CMG Reference Number"
            required
            error={errors.cmgReference}
            hint="Must be unique within the Unilever module."
          >
            <div className="relative">
              <Input
                value={form.cmgReference}
                onChange={(e) => onReferenceChange(e.target.value)}
                onBlur={() => checkReference(form.cmgReference)}
                placeholder="ULV-2026-0001"
                disabled={submitting}
                className={duplicateBlocked ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}
              />
              {checking ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                  checking…
                </span>
              ) : null}
            </div>
            {duplicateBlocked ? (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <p className="font-medium">
                  This CMG reference number is already in use within Unilever.
                </p>
                <p className="mt-1 text-red-600">
                  Existing case: {duplicate.cmgReference}
                  {duplicate.targetName ? ` — ${duplicate.targetName}` : ""}
                </p>
              </div>
            ) : null}
          </Field>

          <Field label="Client Reference Number">
            <Input
              value={form.clientReference}
              onChange={(e) => setField("clientReference", e.target.value)}
              placeholder="Client’s own reference"
              disabled={submitting}
            />
          </Field>

          <GroupLabel>Target</GroupLabel>

          <Field label="Target Name" required error={errors.targetName} hint="Type the target name manually.">
            <Input
              value={form.targetName}
              onChange={(e) => setField("targetName", e.target.value)}
              placeholder="Target name"
              disabled={submitting}
            />
          </Field>

          <Field
            label="Target Nature"
            hint="Select what the target deals in. Single value only."
            error={errors.targetNature}
          >
            <Select
              value={form.targetNature}
              onChange={(e) => setField("targetNature", e.target.value)}
              disabled={submitting}
            >
              <option value="">Not specified</option>
              {UNILEVER_TARGET_NATURES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Target By"
            hint="Restricted to the Unilever investigation team."
            error={errors.targetBy}
          >
            <Select
              value={form.targetBy}
              onChange={(e) => setField("targetBy", e.target.value)}
              disabled={submitting}
            >
              <option value="">Not specified</option>
              {UNILEVER_TARGET_BY.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <GroupLabel>Brands</GroupLabel>

          <Field
            label="Brands"
            hint="Type a Unilever brand and press Enter to add it. Suggestions come from the Unilever brand list."
            error={errors.brandNames}
          >
            <div>
              <div className="relative">
                <Input
                  list="unilever-brand-suggestions"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    if (e.target.value.endsWith(",")) commitTag();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitTag();
                    }
                  }}
                  onBlur={() => setTimeout(commitTag, 120)}
                  placeholder="Search or enter brand…"
                  disabled={submitting}
                  aria-label="Search brands"
                />
                <datalist id="unilever-brand-suggestions">
                  {brandNames.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.brandNames.length === 0 ? (
                  <span className="text-xs text-zinc-400">
                    No brands added yet.
                  </span>
                ) : (
                  form.brandNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeBrand(name)}
                        disabled={submitting}
                        aria-label={`Remove ${name}`}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </Field>

          <GroupLabel>Investigation</GroupLabel>

          <Field label="Investigation Date">
            <Input
              type="date"
              value={form.investigationDate}
              onChange={(e) => setField("investigationDate", e.target.value)}
              disabled={submitting}
            />
          </Field>

          <GroupLabel>Status</GroupLabel>

          <Field label="Case Status" error={errors.status}>
            <Select value={form.status} onChange={(e) => setField("status", e.target.value)} disabled={submitting}>
              {CASE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Approval Status" error={errors.approvalStatus}>
            <Select value={form.approvalStatus} onChange={(e) => setField("approvalStatus", e.target.value)} disabled={submitting}>
              {APPROVAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <GroupLabel>Notes</GroupLabel>

          <Field label="Notes">
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Important points related to this case"
              disabled={submitting}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || duplicateBlocked}>
          {submitting ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Unilever Case"}
        </Button>
      </div>
    </form>
  );
}