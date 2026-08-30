import { NextResponse } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import { queryOne } from "@/lib/db/client";
import { recordAudit } from "@/lib/auth/audit";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentTokenId, revokeOtherSessions } from "@/lib/auth/session";
import type { User } from "@/types";

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  const dbUser = await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [user.id]);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!currentPassword || !(await verifyPassword(currentPassword, dbUser.password_hash))) {
    return NextResponse.json(
      { errors: { currentPassword: "Current password is incorrect." } },
      { status: 400 }
    );
  }

  const strengthError = checkPasswordStrength(newPassword);
  if (strengthError) {
    return NextResponse.json({ errors: { newPassword: strengthError } }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await queryOne(
    `UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2`,
    [passwordHash, user.id]
  );

  const currentJti = await getCurrentTokenId();
  if (currentJti) {
    await revokeOtherSessions(user.id, currentJti);
  }

  await recordAudit(user.id, "password_changed", "User changed their own password");

  return NextResponse.json({ ok: true });
}