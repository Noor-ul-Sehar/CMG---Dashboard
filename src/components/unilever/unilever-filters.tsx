"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CASE_STATUSES, UNILEVER_TARGET_BY, UNILEVER_TARGET_NATURES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";

export function UnileverFilters({
  brands,
}: {
  brands: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [targetBy, setTargetBy] = useState(params.get("target_by") ?? "");
  const [targetNature, setTargetNature] = useState(params.get("target_nature") ?? "");
  const [brand, setBrand] = useState(params.get("brand") ?? "");

  function apply() {
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (status) next.set("status", status);
    if (targetBy) next.set("target_by", targetBy);
    if (targetNature) next.set("target_nature", targetNature);
    if (brand) next.set("brand", brand);
    next.set("page", "1");
    router.push(`${pathname}?${next.toString()}`);
  }

  function clear() {
    setQ("");
    setStatus("");
    setTargetBy("");
    setTargetNature("");
    setBrand("");
    router.push(pathname);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <div className="sm:col-span-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="Search CMG ref, client ref, target, brand…"
            aria-label="Search Unilever cases"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {CASE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select value={targetBy} onChange={(e) => setTargetBy(e.target.value)} aria-label="Target By">
          <option value="">All targeted by</option>
          {UNILEVER_TARGET_BY.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          value={targetNature}
          onChange={(e) => setTargetNature(e.target.value)}
          aria-label="Target Nature"
        >
          <option value="">All natures</option>
          {UNILEVER_TARGET_NATURES.map((t) => (
            <option key={t} value={t}>
              {t}
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
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" size="sm" onClick={apply}>
          Apply Filters
        </Button>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          Clear
        </button>
      </div>
    </div>
  );
}