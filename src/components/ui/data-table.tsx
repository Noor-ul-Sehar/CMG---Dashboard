import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  columns,
  rows,
  empty = "No records to display.",
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  /**
   * When provided, an invisible stretched link is layered over each row so
   * the whole row is clickable. Cell links/buttons must add `relative z-10`
   * to sit above the overlay. Works fully server-side (no client JS).
   */
  rowHref?: (row: T) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center px-6 py-12 text-sm text-zinc-500">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200/70 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/80 text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 ${col.headerClassName ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`relative border-b border-zinc-100 last:border-0 ${
                rowHref
                  ? "cursor-pointer transition-colors hover:bg-zinc-50/80"
                  : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 align-middle text-zinc-700 ${col.className ?? ""}`}
                >
                  {col.cell(row)}
                </td>
              ))}
              {rowHref ? (
                <td className="absolute inset-0">
                  <a
                    href={rowHref(row)}
                    className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-[-2px]"
                    aria-label="Open record"
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}