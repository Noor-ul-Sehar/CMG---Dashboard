import Link from "next/link";
import type { ReactNode } from "react";
import { ProgressiveRows } from "@/components/ui/progressive-rows";

const INITIAL_ROWS = 10;

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  empty = "No records to display.",
  rowHref,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  /**
   * When provided, an invisible stretched link is layered over each row so
   * the whole row is clickable. Cell links/buttons must add `relative z-10`
   * to sit above the overlay.
   */
  rowHref?: (row: T) => string;
  rowKey?: (row: T) => string | number;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        </div>
        <div className="text-sm text-zinc-500">{empty}</div>
      </div>
    );
  }

  const headerCells = columns.map((col) => (
    <th
      key={col.key}
      className={`min-w-0 break-words border-r border-zinc-700/60 px-3 py-2.5 text-[10px] font-semibold uppercase leading-4 tracking-wider text-zinc-100 last:border-r-0 ${
        col.headerClassName ?? ""
      }`}
    >
      {col.header}
    </th>
  ));

  const desktopRows = rows.map((row, i) => (
    <tr
      key={rowKey ? rowKey(row) : i}
      className={`relative transition-colors duration-150 even:bg-zinc-50/50 ${
        rowHref ? "cursor-pointer hover:bg-indigo-50/60" : "hover:bg-zinc-50"
      }`}
    >
      {columns.map((col) => (
        <td
          key={col.key}
          className={`min-w-0 break-words border-r border-zinc-100 px-3 py-2 align-middle leading-5 text-zinc-700 last:border-r-0 ${
            col.className ?? ""
          }`}
        >
          {col.cell(row)}
          {rowHref && col.key === columns[0]?.key ? (
            <a
              href={rowHref(row)}
              className="absolute inset-0 z-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500"
              aria-label="Open record"
            />
          ) : null}
        </td>
      ))}
    </tr>
  ));

  const mobileColumns = columns.filter((column) => !column.hideOnMobile);
  const mobileRows = rows.map((row, i) => (
    <div
      key={rowKey ? rowKey(row) : i}
      className={`relative px-3 py-3 ${rowHref ? "cursor-pointer" : ""}`}
    >
      {rowHref ? (
        <Link
          href={rowHref(row)}
          className="absolute inset-0 z-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500"
          aria-label="Open record"
        />
      ) : null}
      <dl className="space-y-1.5">
        {mobileColumns.map((col) => (
          <div key={col.key} className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {col.header}
            </dt>
            <dd className="min-w-0 break-words text-right text-[13px] leading-5 text-zinc-800 [&_a]:relative [&_a]:z-10 [&_button]:relative [&_button]:z-10">
              {col.cell(row)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  ));

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-black/5">
      <ProgressiveRows
        initialCount={INITIAL_ROWS}
        total={rows.length}
        headerCells={headerCells}
        desktopRows={desktopRows}
        mobileRows={mobileRows}
      />
    </div>
  );
}
