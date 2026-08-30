import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { updateUser, UserValidationError } from "@/lib/services/user-service";

type RouteContext = { params: Promise<{ id: string }> };

function getIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireCapability("users.manage");
    const { id: rawId } = await context.params;
    const id = Number.parseInt(rawId, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const user = await updateUser(id, body, actor.id, getIp(request));
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof UserValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    return apiErrorResponse(err);
  }
}