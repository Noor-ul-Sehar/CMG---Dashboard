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

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-zinc-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800 bg-zinc-900 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-sm shadow-indigo-900/40">
              CMG
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
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => {
              if (item.href === "/users") return canManageUsers(user);
              return true;
            });
            if (items.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = item.match(pathname);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-indigo-500/15 font-medium text-white"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                        }`}
                      >
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-400"
                          />
                        ) : null}
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 px-5 py-4">
          <p className="text-[11px] text-zinc-600">
            CMG Case Management System
          </p>
        </div>
      </aside>
    </>
  );
}