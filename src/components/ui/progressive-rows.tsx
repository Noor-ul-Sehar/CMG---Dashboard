"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const LOAD_STEP = 10;

export function ProgressiveRows({
  initialCount,
  total,
  headerCells,
  desktopRows,
  mobileRows,
}: {
  initialCount: number;
  total: number;
  headerCells: ReactNode[];
  desktopRows: ReactNode[];
  mobileRows: ReactNode[];
}) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [previousTotal, setPreviousTotal] = useState(total);
  const sentinelRef = useRef<HTMLDivElement>(null);

  if (previousTotal !== total) {
    setPreviousTotal(total);
    setVisibleCount(initialCount);
  }

  useEffect(() => {
    if (visibleCount >= total) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + LOAD_STEP, total));
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [total, visibleCount]);

  return (
    <>
      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <thead>
            <tr className="bg-zinc-950 text-left">{headerCells}</tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">{desktopRows.slice(0, visibleCount)}</tbody>
        </table>
      </div>

      <div className="divide-y divide-zinc-100 md:hidden">
        {mobileRows.slice(0, visibleCount)}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500">
        <span>
          Showing {Math.min(visibleCount, total)} of {total}
        </span>
        {visibleCount < total ? <span>Scroll for more</span> : null}
      </div>
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
    </>
  );
}
