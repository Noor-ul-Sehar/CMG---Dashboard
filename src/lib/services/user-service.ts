import { db, query, queryOne } from "@/lib/db/client";
import { recordAudit } from "@/lib/auth/audit";
import { hashPassword, checkPasswordStrength } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { USER_ROLES } from "@/lib/constants";
import type { User, UserRole } from "@/types";

export class UserValidationError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super("Invalid user input.");
    this.errors = errors;
  }
}

/** Public user shape — password hashes are never selected or returned. */
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  team_id: number | null;
  teamName: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: Date;
  last_login_at: Date | null;
}

const PUBLIC_SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.team_id AS "teamId",
         t.name AS "teamName", u.is_active AS "isActive",
         u.must_change_password AS "mustChangePassword",
         u.created_at AS "createdAt", u.last_login_at AS "lastLoginAt"
  FROM users u
  LEFT JOIN teams t ON t.id = u.team_id
`;

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as UserRole,
    team_id: row.teamId == null ? null : Number(row.teamId),
    teamName: row.teamName == null ? null : String(row.teamName),
    is_active: Boolean(row.isActive),
    must_change_password: Boolean(row.mustChangePassword),
    created_at: row.createdAt as Date,
    last_login_at: row.lastLoginAt == null ? null : (row.lastLoginAt as Date),
  };
}

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await query<Record<string, unknown>>(
    PUBLIC_SELECT + ` ORDER BY u.name ASC`
  );
  return rows.map(toPublicUser);
}

export async function getUserById(id: number): Promise<PublicUser | null> {
  const row = await queryOne<Record<string, unknown>>(
    PUBLIC_SELECT + ` WHERE u.id = $1`,
    [id]
  );
  return row ? toPublicUser(row) : null;
}

export function validateUserInput(input: {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  teamId?: unknown;
  isActive?: unknown;
  password?: unknown;
  requirePassword?: boolean;
}): {
  name: string;
  email: string;
  role: UserRole;
  teamId: number | null;
  isActive: boolean;
  password: string | null;
} {
  const errors: Record<string, string> = {};

  const name = String(input.name ?? "").trim();
  if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  const email = String(input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  const role = String(input.role ?? "").trim() as UserRole;
  if (!USER_ROLES.some((r) => r.value === role)) {
    errors.role = "Please select a valid role.";
  }

  let teamId: number | null = null;
  if (input.teamId != null && input.teamId !== "") {
    teamId = Number(input.teamId);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      errors.teamId = "Invalid team selected.";
    }
  }

  const isActive = input.isActive == null ? true : Boolean(input.isActive);

  let password: string | null = null;
  if (input.requirePassword) {
    const pw = String(input.password ?? "");
    const strengthError = checkPasswordStrength(pw);
    if (strengthError) {
      errors.password = strengthError;
    } else {
      password = pw;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new UserValidationError(errors);
  }
  return { name, email, role, teamId, isActive, password };
}

export async function createUser(
  input: {
    name?: unknown;
    email?: unknown;
    role?: unknown;
    teamId?: unknown;
    password?: unknown;
  },
  actorId: number,
  ipAddress?: string
): Promise<PublicUser> {
  const data = validateUserInput({ ...input, requirePassword: true });

  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM users WHERE email = $1`,
    [data.email]
  );
  if (existing) {
    throw new UserValidationError({
      email: "A user with this email address already exists.",
    });
  }

  const passwordHash = await hashPassword(data.password!);

  const client = await db.connect();
  let newUser: PublicUser;
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: number }>(
      `INSERT INTO users (name, email, password_hash, role, team_id, is_active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
      [data.name, data.email, passwordHash, data.role, data.teamId, true]
    );
    const id = result.rows[0].id;
    await client.query("COMMIT");
    newUser = (await getUserById(id))!;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await recordAudit(
    actorId,
    "user_created",
    `Created user ${newUser.name} <${newUser.email}> with role ${newUser.role}`,
    ipAddress
  );
  return newUser;
}

export async function updateUser(
  id: number,
  input: {
    name?: unknown;
    email?: unknown;
    role?: unknown;
    teamId?: unknown;
    isActive?: unknown;
  },
  actorId: number,
  ipAddress?: string
): Promise<PublicUser> {
  const data = validateUserInput({ ...input });

  const existing = await queryOne<User>(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  );
  if (!existing) {
    throw new UserValidationError({ user: "User not found." });
  }

  if (existing.email !== data.email) {
    const dup = await queryOne<{ id: number }>(
      `SELECT id FROM users WHERE email = $1 AND id <> $2`,
      [data.email, id]
    );
    if (dup) {
      throw new UserValidationError({
        email: "A user with this email address already exists.",
      });
    }
  }

  await query(
    `UPDATE users SET name = $1, email = $2, role = $3, team_id = $4, is_active = $5
     WHERE id = $6`,
    [data.name, data.email, data.role, data.teamId, data.isActive, id]
  );

  if (!data.isActive) {
    await revokeAllUserSessions(id);
    await recordAudit(
      actorId,
      "user_deactivated",
      `Deactivated user ${data.name} <${data.email}>`,
      ipAddress
    );
  } else {
    await recordAudit(
      actorId,
      "user_updated",
      `Updated user ${data.name} <${data.email}> (role ${data.role})`,
      ipAddress
    );
  }
  if (existing.role !== data.role) {
    await recordAudit(
      actorId,
      "role_changed",
      `Role changed for ${data.email}: ${existing.role} → ${data.role}`,
      ipAddress
    );
  }

  return (await getUserById(id))!;
}

/** Admin-initiated password reset for another user. */
export async function resetUserPassword(
  id: number,
  newPassword: string,
  actorId: number,
  ipAddress?: string
): Promise<void> {
  const user = await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!user) {
    throw new UserValidationError({ user: "User not found." });
  }

  const strengthError = checkPasswordStrength(newPassword);
  if (strengthError) {
    throw new UserValidationError({ password: strengthError });
  }

  const passwordHash = await hashPassword(newPassword);
  await query(
    `UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3`,
    [passwordHash, true, id]
  );
  await revokeAllUserSessions(id);
  await recordAudit(
    actorId,
    "password_reset",
    `Password reset for user ${user.email} (change required on next login)`,
    ipAddress
  );
}

/** Logs in a user (email + password). Throws a generic error on any failure. */
export async function authenticateUser(
  email: string,
  password: string
): Promise<User> {
  const user = await queryOne<User>(
    `SELECT * FROM users WHERE lower(email) = lower($1)`,
    [email]
  );
  if (!user || !user.is_active) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const { verifyPassword } = await import("@/lib/auth/password");
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return user;
}