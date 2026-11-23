"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { AlertIcon } from "@/components/icons";
import type { TeamRow } from "@/lib/services/org-service";
import { apiFetch } from "@/lib/api/client";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftQ, setDraftQ] = useState("");
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
      const res = await apiFetch(
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
      await apiFetch(`/api/teams/${team.id}`, {
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

  const columns: Column<TeamRow>[] = [
    {
      key: "name",
      header: "Team",
      cell: (t) => <span className="font-medium text-zinc-900">{t.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (t) => (
        <span className="block truncate text-zinc-600">{t.description ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) =>
        t.isActive ? (
          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Active</Badge>
        ) : (
          <Badge className="bg-zinc-100 text-zinc-600 ring-zinc-500/20">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (t) =>
        canManage ? (
          <div className="relative z-10 flex items-center gap-2">
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
        <Button type="button" onClick={openCreate} disabled={!canManage} title={canManage ? undefined : "You do not have permission to create teams"}>
          New Team
        </Button>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter teams"
        description="Leave blank to show all teams. Apply to update the list."
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
        <Field label="Search" hint="Matches team name or description.">
          <Input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search teams…"
            aria-label="Search teams"
          />
        </Field>
      </Modal>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(t) => t.id}
        empty={
          teams.length === 0
            ? "No teams yet. Create your first team to get started."
            : "No teams match your search."
        }
      />

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? `Edit ${modal.team.name}` : "New Team"}
        size="lg"
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