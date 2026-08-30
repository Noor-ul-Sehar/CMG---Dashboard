import { NextResponse } from "next/server";
import { destroySession, getSessionUser, logLogout } from "@/lib/auth/session";

export async function POST() {
  const user = await getSessionUser();
  if (user) {
    await logLogout(user.id);
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}