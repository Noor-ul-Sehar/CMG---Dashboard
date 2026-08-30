import { queryOne } from "@/lib/db/client";
import type { SessionUser, User } from "@/types";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import type { Capability } from "@/lib/permissions";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Resolves the authenticated user, or throws a 401 AuthError. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Authentication required.", 401);
  }
  return user;
}

/**
 * Resolves the authenticated user and enforces a capability, or throws
 * a 401/403 AuthError. Authorization is always enforced server-side.
 */
export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, capability)) {
    throw new AuthError("You do not have permission to perform this action.", 403);
  }
  return user;
}

/** Server-component guard: redirects unauthenticated users to /login. */
export async function requirePageUser(): Promise<SessionUser | null> {
  const { redirect } = await import("next/navigation");
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Deprecated placeholder kept for backwards compatibility during the
 * transition. Do not use in new code.
 * @deprecated use requireUser() / requireCapability()
 */
export async function getCurrentUser(): Promise<User> {
  const user = await requireUser();
  return (await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [user.id]))!;
}

export { getSessionUser } from "@/lib/auth/session";
export type { SessionUser };