import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { queryOne } from "@/lib/db/client";
import { normalizeReference } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const ref = normalizeReference(request.nextUrl.searchParams.get("ref") ?? "");
  if (!ref) {
    return NextResponse.json(
      { error: "A reference number is required." },
      { status: 400 }
    );
  }
  try {
    await requireCapability("cases.view");
    const existing = await queryOne<{
      id: number;
      cmg_reference: string;
      title: string | null;
      target_name: string | null;
      status: string;
    }>(
      `SELECT id, cmg_reference, title, target_name, status
       FROM cases WHERE cmg_reference = $1`,
      [ref]
    );
    return NextResponse.json({
      exists: Boolean(existing),
      case: existing
        ? {
            id: existing.id,
            cmgReference: existing.cmg_reference,
            title: existing.title,
            targetName: existing.target_name,
            status: existing.status,
          }
        : null,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}