import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { createTeam, OrgValidationError } from "@/lib/services/org-service";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    await requireCapability("teams.manage");
    const team = await createTeam(body);
    return NextResponse.json({ id: team.id }, { status: 201 });
  } catch (err) {
    if (err instanceof OrgValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    return apiErrorResponse(err);
  }
}