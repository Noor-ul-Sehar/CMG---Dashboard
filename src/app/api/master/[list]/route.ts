import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import {
  createMaster,
  MasterValidationError,
} from "@/lib/services/master-service";

type RouteContext = { params: Promise<{ list: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { list } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    await requireCapability("teams.manage");
    const created = await createMaster(list, body);
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof MasterValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    return apiErrorResponse(err);
  }
}
