"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { AlertIcon, SearchIcon } from "@/components/icons";
import type { InvestigatorRow, TeamRow } from "@/lib/services/org-service";

interface InvestigatorFormState {
  name: string;
  email: string;
  teamId: string;
  isActive: boolean;
}

const emptyForm: InvestigatorFormState = {
  name: "",
  email: "",
  teamId: "",
  isActive: true,
};

export function InvestigatorsManager({
  investigators,
  teams,
  canManage = false,
}: {
  investigators: InvestigatorRow[];
  teams: TeamRow[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; investigator: InvestigatorRow } | null
  >(null);
  const [form, setForm] = useState<InvestigatorFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return investigators;
    return investigators.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        (i.email ?? "").toLowerCase().includes(term) ||
        (i.teamName ?? "").toLowerCase().includes(term)
    );
  }, [investigators, q]);

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setServerError(null);
    setModal({ mode: "create" });
  }

  function openEdit(investigator: InvestigatorRow) {
    setForm({
      name: investigator.name,
      email: investigator.email ?? "",
      teamId: investigator.teamId?.toString() ?? "",
      isActive: investigator.isActive,
    });
    setErrors({});
    setServerError(null);
    setModal({ mode: "edit", investigator });
  }

  async function save() {
    setBusy(true);
    setServerError(null);
    const isEdit = modal?.mode === "edit";
    const payload = {
      name: form.name,
      email: form.email,
      teamId: form.teamId === "" ? null : Number(form.teamId),
      isActive: form.isActive,
    };
    try {
      const res = await fetch(
        isEdit && modal ? `/api/investigators/${modal.investigator.id}` : "/api/investigators",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.error ?? "Unable to save the investigator.");
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

  async function toggleActive(investigator: InvestigatorRow) {
    try {
      await fetch(`/api/investigators/${investigator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: investigator.name,
          email: investigator.email,
          teamId: investigator.teamId,
          isActive: !investigator.isActive,
        }),
      });
      router.refresh();
    } catch {
      setServerError("Unable to update the investigator.");
    }
  }

  return (
    <div className="space-y-5">
      {serverError ? (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search investigators…"
            className="w-72 pl-9"
            aria-label="Search investigators"
          />
        </div>
        <Button type="button" onClick={openCreate} disabled={!canManage} title={canManage ? undefined : "You do not have permission to manage investigators"}>
          New Investigator
        </Button>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            {investigators.length === 0
              ? "No investigators yet. Add your first investigator."
              : "No investigators match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Team</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{i.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{i.email ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{i.teamName ?? "Unassigned"}</td>
                    <td className="px-4 py-3">
                      {i.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Active</Badge>
                      ) : (
                        <Badge className="bg-zinc-100 text-zinc-600 ring-zinc-500/20">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(i)}
                              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(i)}
                              className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
                            >
                              {i.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={
          modal?.mode === "edit" ? `Edit ${modal.investigator.name}` : "New Investigator"
        }
        description="Investigators are organizational reference data and are not assigned to Market Cases."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : modal?.mode === "edit" ? "Save Changes" : "Create Investigator"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Full name"
              disabled={busy}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="name@cmg.internal"
              disabled={busy}
            />
          </Field>
          <Field label="Team" error={errors.teamId}>
            <Select
              value={form.teamId}
              onChange={(e) => setForm((p) => ({ ...p, teamId: e.target.value }))}
              disabled={busy}
            >
              <option value="">Unassigned</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
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
            Deactivating is safe — investigators are reference data and are not
            assigned to Market Cases.
          </p>
        </div>
      </Modal>
    </div>
  );
}