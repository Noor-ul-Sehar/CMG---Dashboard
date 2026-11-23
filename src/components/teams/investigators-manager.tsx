"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { AlertIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api/client";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftQ, setDraftQ] = useState("");
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
      const res = await apiFetch(
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
      await apiFetch(`/api/investigators/${investigator.id}`, {
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

  const columns: Column<InvestigatorRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (i) => <span className="font-medium text-zinc-900">{i.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (i) => <span className="text-zinc-600">{i.email ?? "—"}</span>,
    },
    {
      key: "team",
      header: "Team",
      cell: (i) => <span className="text-zinc-600">{i.teamName ?? "Unassigned"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (i) =>
        i.isActive ? (
          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Active</Badge>
        ) : (
          <Badge className="bg-zinc-100 text-zinc-600 ring-zinc-500/20">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (i) =>
        canManage ? (
          <div className="relative z-10 flex items-center gap-2">
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
        <Button type="button" onClick={openCreate} disabled={!canManage} title={canManage ? undefined : "You do not have permission to manage investigators"}>
          New Investigator
        </Button>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter investigators"
        description="Leave blank to show all investigators. Apply to update the list."
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
        <Field label="Search" hint="Matches name, email, or team.">
          <Input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search investigators…"
            aria-label="Search investigators"
          />
        </Field>
      </Modal>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(i) => i.id}
        empty={
          investigators.length === 0
            ? "No investigators yet. Add your first investigator."
            : "No investigators match your search."
        }
      />

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={
          modal?.mode === "edit" ? `Edit ${modal.investigator.name}` : "New Investigator"
        }
        size="lg"
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