"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CASE_STATUSES, UNILEVER_TARGET_BY, UNILEVER_TARGET_NATURES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { CloseIcon } from "@/components/icons";

type FilterKey = "status" | "targetBy" | "targetNature" | "brand";

interface Draft {
  q: string;
  status: string;
  targetBy: string;
  targetNature: string;
  brand: string;
}

const EMPTY_DRAFT: Draft = {
  q: "",
  status: "",
  targetBy: "",
  targetNature: "",
  brand: "",
};

function draftFromParams(params: { get(name: string): string | null }): Draft {
  return {
    q: params.get("q") ?? "",
    status: params.get("status") ?? "",
    targetBy: params.get("target_by") ?? "",
    targetNature: params.get("target_nature") ?? "",
    brand: params.get("brand") ?? "",
  };
}

function statusLabel(value: string): string {
  return CASE_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function UnileverFilters({ brands }: { brands: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const active = draftFromParams(params);
  const [search, setSearch] = useState(active.q);
  const [draft, setDraft] = useState<Draft>(active);
  const [open, setOpen] = useState(false);

  const chips: { key: FilterKey; label: string; value: string }[] = [];
  if (active.status) {
    chips.push({ key: "status", label: "Status", value: statusLabel(active.status) });
  }
  if (active.targetBy) {
    chips.push({ key: "targetBy", label: "Targeted by", value: active.targetBy });
  }
  if (active.targetNature) {
    chips.push({ key: "targetNature", label: "Nature", value: active.targetNature });
  }
  if (active.brand) {
    chips.push({ key: "brand", label: "Brand", value: active.brand });
  }

  function pushFilters(next: Draft) {
    const query = new URLSearchParams();
    if (next.q.trim()) query.set("q", next.q.trim());
    if (next.status) query.set("status", next.status);
    if (next.targetBy) query.set("target_by", next.targetBy);
    if (next.targetNature) query.set("target_nature", next.targetNature);
    if (next.brand) query.set("brand", next.brand);
    query.set("page", "1");
    router.push(`${pathname}?${query.toString()}`);
    setOpen(false);
  }

  function clearAll() {
    setSearch("");
    setDraft({ ...EMPTY_DRAFT });
    setOpen(false);
    router.push(pathname);
  }

  function openModal() {
    setDraft({ ...draftFromParams(params), q: search });
    setOpen(true);
  }

  function cancelModal() {
    setDraft(draftFromParams(params));
    setOpen(false);
  }

  function applySearch() {
    pushFilters({ ...draftFromParams(params), q: search });
  }

  function removeFilter(key: FilterKey) {
    pushFilters({ ...draftFromParams(params), [key]: "" });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xl">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch();
            }}
            placeholder="Search CMG ref, client ref, target, brand…"
            aria-label="Search Unilever cases"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={openModal}
          aria-haspopup="dialog"
          aria-label={chips.length ? `Filters, ${chips.length} active` : "Filters"}
        >
          Filters{chips.length ? ` (${chips.length})` : ""}
        </Button>
        {chips.length > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Active filters
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeFilter(chip.key)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100"
              aria-label={`Remove ${chip.label} filter`}
            >
              <span className="text-zinc-400">{chip.label}:</span>
              <span className="max-w-40 truncate">{chip.value}</span>
              <CloseIcon className="h-3 w-3 text-zinc-400" />
            </button>
          ))}
        </div>
      ) : null}

      <Modal
        open={open}
        onClose={cancelModal}
        title="Filter Unilever cases"
        description="Narrow results by status, target and brand."
        size="2xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={cancelModal}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={clearAll}>
              Clear
            </Button>
            <Button type="button" onClick={() => pushFilters(draft)}>
              Apply filters
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
              aria-label="Status"
            >
              <option value="">All statuses</option>
              {CASE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target By">
            <Select
              value={draft.targetBy}
              onChange={(event) => setDraft((prev) => ({ ...prev, targetBy: event.target.value }))}
              aria-label="Target By"
            >
              <option value="">All targeted by</option>
              {UNILEVER_TARGET_BY.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target Nature">
            <Select
              value={draft.targetNature}
              onChange={(event) => setDraft((prev) => ({ ...prev, targetNature: event.target.value }))}
              aria-label="Target Nature"
            >
              <option value="">All natures</option>
              {UNILEVER_TARGET_NATURES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand">
            <Select
              value={draft.brand}
              onChange={(event) => setDraft((prev) => ({ ...prev, brand: event.target.value }))}
              aria-label="Brand"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
