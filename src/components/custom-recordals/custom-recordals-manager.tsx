"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/states";
import { AlertIcon, PlusIcon, TrashIcon } from "@/components/icons";
import type { CustomRecordal } from "@/types";
import { apiFetch } from "@/lib/api/client";

interface FormState {
  recordalDate: string;
  clientRef: string;
  cmgRef: string;
  brand: string;
}

const emptyForm: FormState = { recordalDate: "", clientRef: "", cmgRef: "", brand: "" };

export function CustomRecordalsManager({
  canManage = false,
}: {
  canManage?: boolean;
}) {
  const [recordals, setRecordals] = useState<CustomRecordal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftQ, setDraftQ] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; recordal: CustomRecordal } | null
  >(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomRecordal | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/custom-recordals", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? "Unable to load custom recordals.");
        return;
      }
      setRecordals(data.recordals ?? []);
      setLoadError(null);
    } catch {
      setLoadError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return recordals;
    return recordals.filter(
      (r) =>
        (r.recordalDate ?? "").toLowerCase().includes(term) ||
        r.clientRef.toLowerCase().includes(term) ||
        r.cmgRef.toLowerCase().includes(term) ||
        r.brand.toLowerCase().includes(term)
    );
  }, [recordals, q]);

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setServerError(null);
    setModal({ mode: "create" });
  }

  function openEdit(recordal: CustomRecordal) {
    setForm({
      recordalDate: recordal.recordalDate ?? "",
      clientRef: recordal.clientRef,
      cmgRef: recordal.cmgRef,
      brand: recordal.brand,
    });
    setErrors({});
    setServerError(null);
    setModal({ mode: "edit", recordal });
  }

  async function save() {
    setBusy(true);
    setServerError(null);
    const isEdit = modal?.mode === "edit";
    const payload = {
      recordalDate: form.recordalDate || null,
      clientRef: form.clientRef,
      cmgRef: form.cmgRef,
      brand: form.brand,
    };
    try {
      const res = await apiFetch(
        isEdit && modal ? `/api/custom-recordals/${modal.recordal.id}` : "/api/custom-recordals",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.error ?? "Unable to save the recordal.");
        return;
      }
      setModal(null);
      await load();
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const res = await apiFetch(`/api/custom-recordals/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setServerError(data.error ?? "Unable to delete the recordal.");
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      await load();
    } catch {
      setServerError("Unable to reach the server. Please try again.");
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading custom recordals…" />;
  }

  if (loadError) {
    return (
      <ErrorState message={loadError} retry={load} />
    );
  }

  function openFilters() {
    setDraftQ(q);
    setFiltersOpen(true);
  }

  function applyFilters() {
    setQ(draftQ);
    setFiltersOpen(false);
  }

  function clearFilters() {
    setDraftQ("");
    setQ("");
    setFiltersOpen(false);
  }

  const columns: Column<CustomRecordal>[] = [
    {
      key: "recordalDate",
      header: "Recordal Date",
      cell: (r) => <span className="whitespace-nowrap text-zinc-700">{r.recordalDate ?? "—"}</span>,
    },
    {
      key: "clientRef",
      header: "Client Reference #",
      cell: (r) => <span className="font-medium text-zinc-900">{r.clientRef}</span>,
    },
    {
      key: "cmgRef",
      header: "CMG Reference #",
      cell: (r) => <span className="text-zinc-700">{r.cmgRef}</span>,
    },
    {
      key: "brand",
      header: "Brand",
      cell: (r) => <span className="text-zinc-700">{r.brand}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (r) =>
        canManage ? (
          <div className="relative z-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setServerError(null);
                setDeleteTarget(r);
              }}
              className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      {serverError ? (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={openFilters}
          aria-haspopup="dialog"
        >
          Filters{q ? " (1)" : ""}
        </Button>
        <Button
          type="button"
          onClick={openCreate}
          disabled={!canManage}
          title={canManage ? undefined : "You do not have permission to add custom recordals"}
        >
          <PlusIcon className="h-4 w-4" />
          Add Custom Recordal
        </Button>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter custom recordals"
        description="Leave blank to show all recordals. Apply to update the list."
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear
            </Button>
            <Button type="button" variant="secondary" onClick={() => setFiltersOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyFilters}>
              Apply
            </Button>
          </>
        }
      >
        <Field label="Search" hint="Matches date, client reference, CMG reference, or brand.">
          <Input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search by date, reference or brand…"
            aria-label="Search custom recordals"
          />
        </Field>
      </Modal>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        empty={
          recordals.length === 0 ? (
            <EmptyState
              title="No Custom Recordals yet"
              description="Add a recordal to begin."
              action={
                <Button type="button" onClick={openCreate} disabled={!canManage}>
                  <PlusIcon className="h-4 w-4" />
                  Add Custom Recordal
                </Button>
              }
            />
          ) : (
            "No custom recordals match your search."
          )
        }
      />

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={
          modal?.mode === "edit"
            ? "Edit Custom Recordal"
            : "Add New Custom Recordal"
        }
        size="lg"
        description="Custom recordals are independent — they are not linked to Market Cases."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : modal?.mode === "edit" ? "Save Changes" : "Add Custom Recordal"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Recordal Date" hint="Date of the recordal (optional)." error={errors.recordalDate}>
            <Input
              type="date"
              value={form.recordalDate}
              onChange={(e) => setForm((p) => ({ ...p, recordalDate: e.target.value }))}
              disabled={busy}
            />
          </Field>
          <Field label="Client Reference #" required error={errors.clientRef}>
            <Input
              value={form.clientRef}
              onChange={(e) => setForm((p) => ({ ...p, clientRef: e.target.value }))}
              placeholder="e.g. CLIENT-001"
              disabled={busy}
            />
          </Field>
          <Field label="CMG Reference #" required error={errors.cmgRef}>
            <Input
              value={form.cmgRef}
              onChange={(e) => setForm((p) => ({ ...p, cmgRef: e.target.value }))}
              placeholder="e.g. CMG-REF-001"
              disabled={busy}
            />
          </Field>
          <Field label="Brand" required error={errors.brand}>
            <Input
              value={form.brand}
              onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
              placeholder="e.g. Acme"
              disabled={busy}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Custom Recordal"
        description="This action cannot be undone."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? "Deleting…" : "Delete Recordal"}
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <p className="text-sm text-zinc-600">
            Are you sure you want to delete{" "}
            <span className="font-medium text-zinc-900">{deleteTarget.brand}</span>{" "}
            (CMG Reference <span className="font-medium text-zinc-900">{deleteTarget.cmgRef}</span>)?
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
