"use client";

import { useMemo, useState } from "react";
import { CASE_STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import type { CaseWithRefs } from "@/types";

const columns: Column<CaseWithRefs>[] = [
  {
    key: "ref",
    header: "CMG Ref.",
    cell: (c) => (
      <span className="font-medium tabular-nums text-zinc-900">{c.cmgReference}</span>
    ),
  },
  {
    key: "case",
    header: "Case",
    cell: (c) => <span className="text-zinc-700">{c.title ?? "Untitled"}</span>,
  },
  {
    key: "target",
    header: "Target",
    cell: (c) => <span className="text-zinc-700">{c.targetName ?? "—"}</span>,
  },
  {
    key: "nature",
    header: "Nature",
    cell: (c) => <span className="text-zinc-700">{c.targetNature ?? "—"}</span>,
  },
  {
    key: "brands",
    header: "Brands",
    cell: (c) => (
      <span className="text-zinc-700">
        {c.brands.length ? c.brands.join(", ") : (c.brand ?? "—")}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (c) => <StatusBadge type="case" value={c.status} />,
  },
];

export function ReferenceNumberList({
  cases,
  brands,
  targetNatures,
}: {
  cases: CaseWithRefs[];
  brands: string[];
  targetNatures: string[];
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [brand, setBrand] = useState("");
  const [nature, setNature] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cases.filter((c) => {
      if (needle) {
        const haystack = [
          c.cmgReference,
          c.title ?? "",
          c.targetName ?? "",
          c.clientReference ?? "",
          ...(c.brands ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (status && c.status !== status) return false;
      if (brand && !(c.brand === brand || (c.brands ?? []).includes(brand))) return false;
      if (nature && c.targetNature !== nature) return false;
      return true;
    });
  }, [cases, q, status, brand, nature]);

  const activeFilterCount = [q, status, brand, nature].filter((value) => value !== "").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {filtered.length} reference number{filtered.length === 1 ? "" : "s"}
        </p>
        <Button type="button" variant="secondary" onClick={() => setFiltersOpen(true)}>
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter reference numbers"
        description="Narrow the list. Filters apply as you type."
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQ("");
                setStatus("");
                setBrand("");
                setNature("");
              }}
            >
              Clear
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Search">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reference, title, target…"
              aria-label="Search reference numbers"
            />
          </Field>
          <Field label="Case Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Case Status"
            >
              <option value="">All statuses</option>
              {CASE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand">
            <Select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand">
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target Nature">
            <Select value={nature} onChange={(e) => setNature(e.target.value)} aria-label="Target Nature">
              <option value="">All natures</option>
              {targetNatures.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <DataTable
        columns={columns}
        rows={filtered}
        rowHref={(c) => `/market-cases/all-cases/${c.id}`}
        empty={
          <EmptyState
            title="No reference numbers found"
            description="Try adjusting the search or filters."
          />
        }
      />
    </div>
  );
}
