import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/services/user-service";
import { createSession, logLoginSuccess, publicUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/auth/audit";

function getIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    // Deliberately generic — do not reveal what was missing.
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  let user;
  try {
    user = await authenticateUser(email, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_CREDENTIALS") {
      let existing: { id: number } | null = null;
      try {
        existing = await import("@/lib/db/client").then(({ queryOne }) =>
          queryOne<{ id: number }>(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email])
        );
      } catch (auditError) {
        console.error("login audit lookup failed:", auditError);
      }
      try {
        await recordAudit(
          existing?.id ?? null,
          "login_failed",
          `Failed login attempt for ${email}`,
          getIp(request)
        );
      } catch (auditError) {
        console.error("login audit failed:", auditError);
      }
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }
    console.error("login failed:", err);
    return NextResponse.json(
      { error: "Unable to log in. Please try again." },
      { status: 500 }
    );
  }

  try {
    await createSession(user);
  } catch (err) {
    console.error("session setup failed:", err);
    return NextResponse.json(
      { error: "Unable to log in. Please try again." },
      { status: 500 }
    );
  }

  try {
    await logLoginSuccess(user.id, getIp(request));
  } catch (err) {
    console.error("login success logging failed:", err);
  }

  return NextResponse.json({ user: publicUser(user) });
}