import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white shadow-sm shadow-zinc-900/10 hover:bg-zinc-800 active:bg-zinc-950",
  secondary:
    "border border-zinc-300 bg-white text-zinc-700 shadow-sm shadow-zinc-900/[0.03] hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
};

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}) {
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  );
}