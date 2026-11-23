"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  APPROVAL_STATUSES,
  CASE_STATUSES,
  MARKET_CASE_BRANDS,
  MARKET_CASE_TARGET_NATURES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { AlertIcon } from "@/components/icons";
import type { CaseWithRefs, RecordalInput } from "@/types";

interface ExistingCaseInfo {
  id: number;
  cmgReference: string;
  title: string | null;
  targetName: string | null;
  status: string;
}

interface Props {
  mode: "new" | "edit";
  caseData?: CaseWithRefs | null;
  targetBy: { id: number; name: string }[];
  targetNatures: { id?: number; name: string }[];
  brands: { id?: number; name: string }[];
  recordals?: RecordalInput[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormState {
  cmgReference: string;
  clientReference: string;
  title: string;
  targetName: string;
  targetNature: string;
  targetById: string;
  targetOwner: string;
  city: string;
  brandNames: string[];
  recordals: RecordalInput[];
  status: string;
  investigationDate: string;
  notes: string;
  reportStatus: string;
}

function emptyFrom(c?: CaseWithRefs | null): FormState {
  const initialBrands =
    c && c.brands?.length > 0
      ? [...c.brands]
      : c?.brand
        ? [c.brand]
        : [];
  return {
    cmgReference: c?.cmgReference ?? "",
    clientReference: c?.clientReference ?? "",
    title: c?.title ?? "",
    targetName: c?.targetName ?? "",
    targetNature: c?.targetNature ?? "",
    targetById: c?.targetById?.toString() ?? "",
    targetOwner: c?.targetOwner ?? "",
    city: c?.city ?? "",
    brandNames: initialBrands,
    recordals: [],
    status: c?.status ?? "open",
    investigationDate: c?.investigationDate ?? "",
    notes: c?.notes ?? "",
    reportStatus: c?.reportStatus ?? "pending_approval",
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

function BrandPicker({
  selected,
  onAdd,
  onRemove,
  options,
  disabled,
}: {
  selected: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  options: { id?: number; name: string }[];
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedLower = new Set(selected.map((s) => s.toLowerCase()));
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");

  const canonicalIndex = (name: string) => {
    const i = MARKET_CASE_BRANDS.indexOf(name);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const available = options
    .filter((o) => !selectedLower.has(o.name.toLowerCase()))
    .filter((o) => !query || normalize(o.name).includes(normalize(query)))
    .sort(
      (a, b) =>
        canonicalIndex(a.name) - canonicalIndex(b.name) ||
        a.name.localeCompare(b.name)
    );

  const exactMatch = options.find(
    (o) =>
      !selectedLower.has(o.name.toLowerCase()) &&
      normalize(o.name) === normalize(query.trim())
  );

  return (
    <div>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search brand…"
          disabled={disabled}
          aria-label="Search brands"
        />
        {open && available.length > 0 ? (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg">
            {available.map((b) => (
              <li key={b.id ?? b.name}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onAdd(b.name);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {selected.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700"
          >
            {name}
            <button
              type="button"
              onClick={() => onRemove(name)}
              disabled={disabled}
              aria-label={`Remove ${name}`}
              className="text-zinc-400 hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2"
        disabled={disabled || !exactMatch}
        onClick={() => {
          if (exactMatch) {
            onAdd(exactMatch.name);
            setQuery("");
            setOpen(false);
          }
        }}
      >
        + Add Brand
      </Button>
    </div>
  );
}

export function CaseForm({
  mode,
  caseData,
  targetBy,
  targetNatures,
  brands,
  recordals,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyFrom(caseData),
    recordals: recordals ?? [],
  }));
  const [initialRemark, setInitialRemark] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<ExistingCaseInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const originalReference = caseData?.cmgReference ?? "";
  const recordalsLoaded = mode === "new" || recordals !== undefined;

  const sortedNatures = [...targetNatures].sort((a, b) => {
    const ia = MARKET_CASE_TARGET_NATURES.indexOf(a.name);
    const ib = MARKET_CASE_TARGET_NATURES.indexOf(b.name);
    const da = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const db = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
    return da - db || a.name.localeCompare(b.name);
  });

  const setField = useCallback(
    (key: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (key === "cmgReference") {
        setErrors((prev) => ({ ...prev, cmgReference: "" }));
      }
    },
    []
  );

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
      fetch(`/api/cases/check-reference?ref=${encodeURIComponent(normalized)}`, {
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

  function addBrand(name: string) {
    setForm((prev) => {
      const trimmed = name.trim();
      const exists = prev.brandNames.some(
        (b) => b.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists || !trimmed) return prev;
      return { ...prev, brandNames: [...prev.brandNames, trimmed] };
    });
  }

  function removeBrand(name: string) {
    setForm((prev) => ({
      ...prev,
      brandNames: prev.brandNames.filter(
        (b) => b.toLowerCase() !== name.toLowerCase()
      ),
    }));
  }

  function updateRecordal(index: number, patch: Partial<RecordalInput>) {
    setForm((prev) => {
      const next = prev.recordals.map((r, i) => (i === index ? { ...r, ...patch } : r));
      return { ...prev, recordals: next };
    });
  }

  function removeRecordal(index: number) {
    setForm((prev) => ({
      ...prev,
      recordals: prev.recordals.filter((_, i) => i !== index),
    }));
  }

  function addRecordal() {
    setForm((prev) => ({
      ...prev,
      recordals: [
        ...prev.recordals,
        { recordalDate: "", brandCmgCaseRef: "", brandCaseRef: "" },
      ],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const payload: Record<string, unknown> = {
      cmgReference: form.cmgReference,
      clientReference: form.clientReference,
      title: form.title,
      targetName: form.targetName,
      targetNature: form.targetNature,
      targetById: form.targetById || null,
      targetOwner: form.targetOwner,
      city: form.city,
      brandNames: form.brandNames.map((b) => b.trim()).filter(Boolean),
      ...(recordalsLoaded ? { recordals: form.recordals } : {}),
      status: form.status,
      investigationDate: form.investigationDate,
      notes: form.notes,
      reportStatus: form.reportStatus,
    };
    if (mode === "new") {
      payload.initialRemark = initialRemark;
    }

    setSubmitting(true);
    try {
      const res = await fetch(mode === "edit" ? `/api/cases/${caseData?.id}` : "/api/cases", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        router.refresh();
        if (onSuccess) onSuccess();
        else router.push(`/market-cases/all-cases/${data.id}`);
        return;
      }
      if (res.status === 409) {
        setDuplicate(data.existing as ExistingCaseInfo);
        setErrors((prev) => ({ ...prev, cmgReference: "This CMG reference number is already in use." }));
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
            hint="Must be unique. Checked against the database automatically."
          >
            <div className="relative">
              <Input
                value={form.cmgReference}
                onChange={(e) => onReferenceChange(e.target.value)}
                onBlur={() => checkReference(form.cmgReference)}
                placeholder="CMG-2025-0001"
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
                  This CMG reference number is already in use.
                </p>
                <p className="mt-1 text-red-600">
                  Existing case: {duplicate.cmgReference}
                  {duplicate.title ? ` — ${duplicate.title}` : ""}
                  {duplicate.targetName ? ` · ${duplicate.targetName}` : ""}
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

          <Field label="Case Title">
            <Input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Short case summary"
              disabled={submitting}
            />
          </Field>

          <GroupLabel>Target</GroupLabel>

          <Field label="Target Name" required hint="Type the target name manually.">
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
              {sortedNatures.map((t) => (
                <option key={t.id ?? t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Target By" hint="Who the case is targeted by — separate from the case officer.">
            <Select
              value={form.targetById}
              onChange={(e) => setField("targetById", e.target.value)}
              disabled={submitting}
            >
              <option value="">Not specified</option>
              {targetBy.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Target Owner">
            <Input
              value={form.targetOwner}
              onChange={(e) => setField("targetOwner", e.target.value)}
              placeholder="Owner / operator"
              disabled={submitting}
            />
          </Field>

          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              placeholder="City"
              disabled={submitting}
            />
          </Field>

          <GroupLabel>Brands</GroupLabel>

          <Field
            label="Brands"
            hint="Search and select one or more brands from the approved list. A case can have any number of brands; duplicates are prevented."
            error={errors.brandNames}
          >
            <BrandPicker
              selected={form.brandNames}
              onAdd={addBrand}
              onRemove={removeBrand}
              options={brands}
              disabled={submitting}
            />
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

          <Field label="Approval Status" error={errors.reportStatus}>
            <Select value={form.reportStatus} onChange={(e) => setField("reportStatus", e.target.value)} disabled={submitting}>
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

          {mode === "new" ? (
            <Field
              label="Initial Remarks"
              hint="Optional. Will be stored as the first remark with its own timestamp and user."
            >
              <Textarea
                rows={3}
                value={initialRemark}
                onChange={(e) => setInitialRemark(e.target.value)}
                placeholder="First remark on this case"
                disabled={submitting}
              />
            </Field>
          ) : null}
        </CardBody>
      </Card>

      {recordalsLoaded ? <Card className="mt-6">
        <CardBody>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Recordals</h3>
              <p className="mt-0.5 text-sm text-zinc-500">
                Each recordal records a brand registration or filing with its own
                reference numbers.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addRecordal}
              disabled={submitting}
            >
              + Add Recordal
            </Button>
          </div>

          {form.recordals.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
              No recordals added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {form.recordals.map((r, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 sm:grid-cols-3"
                >
                  <Field label={`Recordal ${index + 1} Date`}>
                    <Input
                      type="date"
                      value={r.recordalDate ?? ""}
                      onChange={(e) => updateRecordal(index, { recordalDate: e.target.value })}
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Brand CMG Case Ref #">
                    <Input
                      value={r.brandCmgCaseRef ?? ""}
                      onChange={(e) => updateRecordal(index, { brandCmgCaseRef: e.target.value })}
                      placeholder="e.g. CMG-2025-0042"
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Brand Case Ref #">
                    <Input
                      value={r.brandCaseRef ?? ""}
                      onChange={(e) => updateRecordal(index, { brandCaseRef: e.target.value })}
                      placeholder="e.g. BR-2025-1001"
                      disabled={submitting}
                    />
                  </Field>
                  <div className="sm:col-span-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecordal(index)}
                      disabled={submitting}
                    >
                      Remove recordal
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card> : null}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onCancel ? onCancel() : router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || duplicateBlocked}>
          {submitting ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Case"}
        </Button>
      </div>
    </form>
  );
}