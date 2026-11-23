"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/navigation";
import { CloseIcon } from "@/components/icons";
import { canManageUsers } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth";

export function Sidebar({
  user,
  open,
  onClose,
}: {
  user: SessionUser;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const initials = (user.name ?? user.email ?? "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Mobile overlay with blur */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-zinc-950/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800/80 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 shadow-2xl shadow-black/40 transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-5">
          <Link
            href="/overview/dashboard"
            className="group flex items-center gap-2.5"
            onClick={onClose}
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-700 text-[11px] font-bold text-white shadow-lg shadow-indigo-900/50 ring-1 ring-white/10 transition-transform group-hover:scale-105">
              CMG
              <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">
                CMG Dashboard
              </p>
              <p className="text-[11px] leading-tight text-zinc-500">
                Case Management
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5 [scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.700)_transparent]">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => {
              if (item.href === "/admin/users") return canManageUsers(user);
              return true;
            });
            if (items.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = item.match(pathname);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                          active
                            ? "bg-gradient-to-r from-indigo-500/25 via-indigo-500/10 to-transparent font-medium text-white ring-1 ring-inset ring-indigo-400/20"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                        }`}
                      >
                        {/* Active left bar */}
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-300 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                          />
                        ) : null}
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            active
                              ? "text-indigo-300"
                              : "text-zinc-500 group-hover:text-zinc-300"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer: user card */}
        <div className="border-t border-zinc-800/80 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 px-3 py-2.5 ring-1 ring-inset ring-zinc-800/80">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-semibold text-white ring-2 ring-zinc-900">
              {initials || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-100">
                {user.name ?? "User"}
              </p>
              <p className="truncate text-[11px] text-zinc-500">
                {user.email ?? ""}
              </p>
            </div>
          </div>
          <p className="mt-3 px-2 text-center text-[10px] uppercase tracking-wider text-zinc-700">
            CMG Case Management System
          </p>
        </div>
      </aside>
    </>
  );
}