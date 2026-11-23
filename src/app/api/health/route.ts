import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.AUTH_SECRET),
    database: false,
    usersTable: false,
  };

  if (!checks.databaseUrl || !checks.authSecret) {
    return NextResponse.json(
      { ok: false, checks },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await queryOne("SELECT 1 AS ok");
    checks.database = true;
    const table = await queryOne<{ exists: boolean }>(
      "SELECT to_regclass('public.users') IS NOT NULL AS exists"
    );
    checks.usersTable = Boolean(table?.exists);
  } catch (error) {
    console.error("health check failed:", error);
  }

  const ok = checks.database && checks.usersTable;
  return NextResponse.json(
    { ok, checks },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
