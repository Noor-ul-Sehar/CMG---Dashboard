import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { listUsers, createUser } from "@/lib/services/user-service";

function getIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

export async function GET() {
  try {
    await requireCapability("users.manage");
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireCapability("users.manage");
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const user = await createUser(body, actor.id, getIp(request));
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}