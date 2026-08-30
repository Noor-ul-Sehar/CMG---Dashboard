"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { AlertIcon, SearchIcon } from "@/components/icons";
import { USER_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { PublicUser } from "@/lib/services/user-service";
import type { Team } from "@/types";

interface UserFormState {
  name: string;
  email: string;
  role: string;
  teamId: string;
  isActive: boolean;
  password: string;
}

const emptyForm: UserFormState = {
  name: "",
  email: "",
  role: "team_member",
  teamId: "",
  isActive: true,
  password: "",
};

export function UsersManager({
  users,
  teams,
}: {
  users: PublicUser[];
  teams: Team[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; user: PublicUser } | null>(null);
  const [resetModal, setResetModal] = useState<PublicUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [resetPassword, setResetPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.teamName ?? "").toLowerCase().includes(term)
    );
  }, [users, q]);

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setServerError(null);
    setModal({ mode: "create" });
  }

  function openEdit(user: PublicUser) {
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.team_id?.toString() ?? "",
      isActive: user.is_active,
      password: "",
    });
    setErrors({});
    setServerError(null);
    setModal({ mode: "edit", user });
  }

  async function save() {
    setBusy(true);
    setServerError(null);
    const isEdit = modal?.mode === "edit";
    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      teamId: form.teamId === "" ? null : Number(form.teamId),
      isActive: form.isActive,
      ...(isEdit ? {} : { password: form.password }),
    };
    try {
      const res = await fetch(
        isEdit && modal ? `/api/users/${modal.user.id}` : "/api/users",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.error ?? "Unable to save the user.");
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

  async function toggleActive(user: PublicUser) {
    setBusy(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          teamId: user.team_id,
          isActive: !user.is_active,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setServerError(data?.error ?? "Unable to update the user.");
        return;
      }
      router.refresh();
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPasswordSubmit() {
    if (!resetModal) return;
    setBusy(true);
    setServerError(null);
    setErrors({});
    try {
      const res = await fetch(`/api/users/${resetModal.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.error ?? "Unable to reset the password.");
        return;
      }
      setResetModal(null);
      setResetPassword("");
      router.refresh();
    } catch {
      setServerError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
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
            placeholder="Search users…"
            className="w-72 pl-9"
            aria-label="Search users"
          />
        </div>
        <Button type="button" onClick={openCreate}>
          New User
        </Button>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            No users match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Team</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Last Login</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const roleLabel = USER_ROLES.find((r) => r.value === u.role)?.label ?? u.role;
                  return (
                    <tr key={u.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{u.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-zinc-100 text-zinc-700 ring-zinc-500/20">{roleLabel}</Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{u.teamName ?? "—"}</td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Active</Badge>
                        ) : (
                          <Badge className="bg-zinc-100 text-zinc-600 ring-zinc-500/20">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{formatDate(u.last_login_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetModal(u)}
                            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(u)}
                            className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? `Edit ${modal.user.name}` : "New User"}
        description={
          modal?.mode === "edit"
            ? "Update account details and role."
            : "Create a new CMG team member account."
        }
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModal(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : modal?.mode === "edit" ? "Save Changes" : "Create User"}
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
          <Field label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="name@cmg.internal"
              disabled={busy}
            />
          </Field>
          <Field label="Role" required error={errors.role}>
            <Select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              disabled={busy}
            >
              {USER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Team" error={errors.teamId}>
            <Select
              value={form.teamId}
              onChange={(e) => setForm((p) => ({ ...p, teamId: e.target.value }))}
              disabled={busy}
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          {modal?.mode === "create" ? (
            <Field label="Temporary Password" required error={errors.password} hint="At least 8 characters with a letter and a number. The user will be required to change it on first login.">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                autoComplete="new-password"
                disabled={busy}
              />
            </Field>
          ) : null}
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
            Users are deactivated, never deleted, to preserve their historical activity.
          </p>
        </div>
      </Modal>

      <Modal
        open={resetModal !== null}
        onClose={() => setResetModal(null)}
        title={`Reset Password${resetModal ? ` — ${resetModal.name}` : ""}`}
        description="The user will be signed out and required to change this password on next login."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setResetModal(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={resetPasswordSubmit} disabled={busy || resetPassword.length < 8}>
              {busy ? "Resetting…" : "Reset Password"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="New Temporary Password" required error={errors.password} hint="At least 8 characters with a letter and a number.">
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              autoComplete="new-password"
              disabled={busy}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}