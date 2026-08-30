import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { queryOne } from "@/lib/db/client";
import { recordAudit } from "@/lib/auth/audit";
import type { SessionUser, User } from "@/types";

const COOKIE_NAME = "cmg_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured. Set it in .env.local.");
  }
  return new TextEncoder().encode(secret);
}

interface SessionToken {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

function publicUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    team_id: user.team_id,
    mustChangePassword: user.must_change_password,
  };
}

export async function createSession(user: User): Promise<void> {
  const tokenId = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setJti(tokenId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  await queryOne(
    `INSERT INTO sessions (user_id, token_id, expires_at)
     VALUES ($1, $2, to_timestamp($3))`,
    [user.id, tokenId, expiresAt]
  );
}

/** Verifies the session cookie against signature, expiry, DB registry and user state. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let payload: SessionToken;
  try {
    const { payload: verified } = await jwtVerify(token, getSecret());
    payload = verified as unknown as SessionToken;
  } catch {
    return null;
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  const session = await queryOne<{ revoked_at: Date | null; expires_at: Date }>(
    `SELECT revoked_at, expires_at FROM sessions WHERE token_id = $1`,
    [payload.jti]
  );
  if (!session || session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const user = await queryOne<User>(
    `SELECT * FROM users WHERE id = $1 AND is_active = TRUE`,
    [userId]
  );
  if (!user) return null;

  return publicUser(user);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      const jti = payload.jti;
      if (jti) {
        await queryOne(`UPDATE sessions SET revoked_at = NOW() WHERE token_id = $1`, [
          jti,
        ]);
      }
    } catch {
      // Invalid/expired token — nothing to revoke.
    }
  }
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Revokes every session belonging to a user (used on deactivation / password reset). */
export async function revokeAllUserSessions(userId: number): Promise<void> {
  await queryOne(
    `UPDATE sessions SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/** Revokes all of a user's sessions except the one identified by currentJti. */
export async function revokeOtherSessions(
  userId: number,
  currentJti: string
): Promise<void> {
  await queryOne(
    `UPDATE sessions SET revoked_at = NOW()
     WHERE user_id = $1 AND token_id <> $2 AND revoked_at IS NULL`,
    [userId, currentJti]
  );
}

/** Extracts the jti from the current session cookie (null if invalid). */
export async function getCurrentTokenId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.jti ?? null;
  } catch {
    return null;
  }
}

export async function logLoginSuccess(
  userId: number,
  ipAddress?: string
): Promise<void> {
  await recordAudit(userId, "login", "User logged in", ipAddress);
  await queryOne(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
}

export async function logLogout(userId: number, ipAddress?: string): Promise<void> {
  await recordAudit(userId, "logout", "User logged out", ipAddress);
}

export { publicUser, COOKIE_NAME };