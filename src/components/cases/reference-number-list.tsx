"use client";

import { useMemo, useState } from "react";
import { CASE_STATUSES } from "@/lib/constants";
import { Input, Select } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import type { CaseWithRefs } from "@/types";

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reference, title, target…"
          aria-label="Search reference numbers"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Case Status">
          <option value="">All statuses</option>
          {CASE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand">
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select value={nature} onChange={(e) => setNature(e.target.value)} aria-label="Target Nature">
          <option value="">All natures</option>
          {targetNatures.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No reference numbers found"
          description="Try adjusting the search or filters."
        />
      ) : (
        <ul className="divide-y divide-zinc-100">
          {filtered.map((c) => (
            <li key={c.id} className="py-3">
              <a
                href={`/cases/${c.id}`}
                className="-mx-1 block rounded-md px-1 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="font-medium tabular-nums text-zinc-900">
                    {c.cmgReference}
                  </span>
                  <StatusBadge type="case" value={c.status} />
                </div>
                <p className="mt-0.5 truncate text-sm text-zinc-600">
                  {c.title ?? "Untitled"} — {c.targetName ?? "No target"}
                  {c.targetNature ? ` · ${c.targetNature}` : ""}
                </p>
                {(c.brands?.length ?? 0) > 0 ? (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {c.brands.join(", ")}
                  </p>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}