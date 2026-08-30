import type { ReactNode } from "react";
import {
  APPROVAL_STATUS_COLORS,
  CASE_STATUS_COLORS,
  REVIEW_STATUS_COLORS,
  statusLabel,
} from "@/lib/constants";

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

type BadgeType = "case" | "approval" | "review";

const colorMaps = {
  case: CASE_STATUS_COLORS,
  approval: APPROVAL_STATUS_COLORS,
  review: REVIEW_STATUS_COLORS,
} as const;

export function StatusBadge({
  type,
  value,
}: {
  type: BadgeType;
  value: string;
}) {
  const map = colorMaps[type];
  const color = (map as Record<string, string>)[value] ?? "bg-zinc-100 text-zinc-600 ring-zinc-500/20";
  const dot =
    (map as Record<string, string>)[value] === undefined
      ? "bg-zinc-400"
      : `bg-current`;
  return (
    <Badge className={color}>
      <span
        aria-hidden="true"
        className={`mr-1 h-1.5 w-1.5 rounded-full ${dot}`}
      />
      {statusLabel(value)}
    </Badge>
  );
}