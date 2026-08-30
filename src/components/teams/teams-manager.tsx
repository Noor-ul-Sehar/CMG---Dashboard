"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { AlertIcon, SearchIcon } from "@/components/icons";
import type { TeamRow } from "@/lib/services/org-service";

interface TeamFormState {
  name: string;
  description: string;
  isActive: boolean;
}

const emptyForm: TeamFormState = { name: "", description: "", isActive: true };

export function TeamsManager({
  teams,
  canManage = false,
}: {
  teams: TeamRow[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; team: TeamRow } | null>(null);
  const [form, setForm] = useState<TeamFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        (t.description ?? "").toLowerCase().includes(term)
    );
  }, [teams, q]);

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setServerError(null);
    setModal({ mode: "create" });
  }

  function openEdit(team: TeamRow) {
    setForm({ name: team.name, description: team.description ?? "", isActive: team.isActive });
    setErrors({});
    setServerError(null);
    setModal({ mode: "edit", team });
  }

  async function save() {
    setBusy(true);
    setServerError(null);
    const isEdit = modal?.mode === "edit";
    const payload = {
      name: form.name,
      description: form.description,
      isActive: form.isActive,
    };
    try {
      const res = await fetch(
        isEdit && modal ? `/api/teams/${modal.team.id}` : "/api/teams",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.error ?? "Unable to save the team.");
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

  async function toggleActive(team: TeamRow) {
    try {
      await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: team.name,
          description: team.description,
          isActive: !team.isActive,
        }),
      });
      router.refresh();
    } catch {
      setServerError("Unable to update the team.");
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
            placeholder="Search teams…"
            className="w-72 pl-9"
            aria-label="Search teams"
          />
        </div>
        <Button type="button" onClick={openCreate} disabled={!canManage} title={canManage ? undefined : "You do not have permission to create teams"}>
          New Team
        </Button>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            {teams.length === 0
              ? "No teams yet. Create your first team to get started."
              : "No teams match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Team</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Description</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{t.name}</td>
                    <td className="max-w-xs px-4 py-3 text-zinc-600">
                      <span className="block truncate">{t.description ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
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
                              onClick={() => openEdit(t)}
                              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive(t)}
                              className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
                            >
                              {t.isActive ? "Deactivate" : "Activate"}
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
        title={modal?.mode === "edit" ? `Edit ${modal.team.name}` : "New Team"}
        description="Teams are organizational reference data and are not assigned to Market Cases."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : modal?.mode === "edit" ? "Save Changes" : "Create Team"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Team Name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Counterfeit Goods"
              disabled={busy}
            />
          </Field>
          <Field label="Description" hint="Short description of what the team handles.">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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
            Deactivating a team is safe — teams are reference data and are not
            assigned to Market Cases.
          </p>
        </div>
      </Modal>
    </div>
  );
}