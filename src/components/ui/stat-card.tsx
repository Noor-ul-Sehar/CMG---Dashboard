import Link from "next/link";
import { Card } from "./card";

export function StatCard({
  label,
  value,
  sub,
  accent = "text-zinc-900",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  /** When provided the card becomes a clickable link into a filtered view. */
  href?: string;
}) {
  const inner = (
    <Card
      className={`relative overflow-hidden px-5 py-4 ${
        href ? "h-full transition-colors hover:border-zinc-300 hover:bg-zinc-50/70" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-200"
      />
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-zinc-500">{sub}</p> : null}
    </Card>
  );

  if (!href) return inner;

  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2"
      aria-label={`${label}: ${value}. View cases.`}
    >
      {inner}
    </Link>
  );
}