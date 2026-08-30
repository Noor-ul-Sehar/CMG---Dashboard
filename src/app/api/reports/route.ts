import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { parseReportParams } from "@/lib/api/report-params";
import { getReportResult } from "@/lib/services/report-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireCapability("reports.view");
    const url = new URL(request.url);
    const filters = parseReportParams(url.searchParams);
    const result = await getReportResult(filters);
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err);
  }
}