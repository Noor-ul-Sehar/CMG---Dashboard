import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { addRemark } from "@/lib/services/case-service";
import { validateRemark } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
  }

  let body: { comment?: unknown; type?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validation = validateRemark(body.comment, body.type);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const user = await requireCapability("remarks.add");
    await addRemark(id, user.id, validation.comment, validation.type);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}