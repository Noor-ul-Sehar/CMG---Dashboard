"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PAGE_TITLES } from "@/lib/navigation";
import { USER_ROLES } from "@/lib/constants";
import { MenuIcon, SearchIcon } from "@/components/icons";
import type { SessionUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api/client";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Header({
  user,
  onMenu,
}: {
  user: SessionUser;
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const meta = PAGE_TITLES[pathname] ?? {
    title: "CMG Dashboard",
    description: "Case Management",
  };

  const roleLabel =
    USER_ROLES.find((r) => r.value === user.role)?.label ?? user.role;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/market-cases/search-cases?q=${encodeURIComponent(q)}` : "/market-cases/search-cases");
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-zinc-900">
          {meta.title}
        </h1>
        <p className="hidden truncate text-xs text-zinc-500 sm:block">
          {meta.description}
        </p>
      </div>

      <form onSubmit={submit} className="relative hidden md:block" role="search">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cases, targets, brands..."
          aria-label="Search cases"
          className="w-72 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm shadow-zinc-900/[0.02] placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </form>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-3 rounded-lg border-l border-zinc-200 pl-4 hover:bg-zinc-50"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-medium leading-tight text-zinc-900">
              {user.name}
            </span>
            <span className="block text-xs leading-tight text-zinc-500">
              {roleLabel}
            </span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-semibold text-white shadow-sm shadow-indigo-900/20">
            {initials(user.name)}
          </span>
        </button>

        {menuOpen ? (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl shadow-zinc-900/10"
            >
              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/change-password");
                }}
                className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Change Password
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}