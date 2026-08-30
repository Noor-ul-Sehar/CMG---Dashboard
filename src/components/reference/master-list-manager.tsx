"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { AlertIcon, SearchIcon } from "@/components/icons";
import type { MasterRow } from "@/lib/services/master-service";

export function MasterListManager({
  title,
  description,
  rows,
  endpoint,
  canManage = false,
  singular,
  emptyText,
  manageHint,
}: {
  title: string;
  description: string;
  rows: MasterRow[];
  endpoint: string;
  canManage?: boolean;
  singular: string;
  emptyText: string;
  manageHint?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; row: MasterRow } | null>(null);
  const [form, setForm] = useState<{ name: string; isActive: boolean }>({ name: "", isActive: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term));
  }, [rows, q]);

  function openCreate() {
    setForm({ name: "", isActive: true });
    setErrors({});
    setServerError(null);
    setModal({ mode: "create" });
  }

  function openEdit(row: MasterRow) {
    setForm({ name: row.name, isActive: row.isActive });
    setErrors({});
    setServerError(null);
    setModal({ mode: "edit", row });
  }

  async function save() {
    setBusy(true);
    setServerError(null);
    const isEdit = modal?.mode === "edit";
    try {
      const res = await fetch(
        isEdit && modal ? `${endpoint}/${modal.row.id}` : endpoint,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.error ?? "Unable to save the record.");
        return;
      }
      setModal(null);
      router.refresh();
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: MasterRow) {
    try {
      await fetch(`${endpoint}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: row.name, isActive: !row.isActive }),
      });
      router.refresh();
    } catch {
      setServerError("Unable to update the record.");
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
        <Button type="button" size="sm" onClick={openCreate} disabled={!canManage}>
          New {singular}
        </Button>
      </div>

      <div className="space-y-4 p-5">
        {serverError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="w-full pl-9 sm:w-72"
            aria-label={`Search ${title}`}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            {rows.length === 0 ? emptyText : "No records match your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Cases</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{r.name}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-600">{r.caseCount}</td>
                    <td className="px-4 py-3">
                      {r.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Active</Badge>
                      ) : (
                        <Badge className="bg-zinc-100 text-zinc-600 ring-zinc-500/20">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(r)}
                            className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
                          >
                            {r.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {manageHint ? <p className="text-xs text-zinc-500">{manageHint}</p> : null}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? `Edit ${modal.row.name}` : `New ${singular}`}
        description={description}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : modal?.mode === "edit" ? "Save Changes" : `Create ${singular}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={`e.g. ${singular} name`}
              disabled={busy}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              disabled={busy}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Active
          </label>
          <p className="text-xs text-zinc-500">
            Deactivating is safe — existing cases keep their reference. Records
            are never deleted.
          </p>
        </div>
      </Modal>
    </Card>
  );
}
