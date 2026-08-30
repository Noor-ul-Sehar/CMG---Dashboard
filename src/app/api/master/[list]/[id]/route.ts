import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import {
  MasterValidationError,
  updateMaster,
} from "@/lib/services/master-service";

type RouteContext = { params: Promise<{ list: string; id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { list, id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    await requireCapability("teams.manage");
    await updateMaster(list, id, body);
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof MasterValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    return apiErrorResponse(err);
  }
}
