import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/guard";
import { requireCapability } from "@/lib/auth";
import { parseCaseSearchParams } from "@/lib/search/params";
import { getCaseFilterOptions, searchCases } from "@/lib/services/case-service";
import { getSearchIntelligence } from "@/lib/services/search-service";

/**
 * Live search/filter endpoint. Uses the exact same parser, conditions and
 * intelligence as the server-rendered first page, so there is one source of
 * truth for every search path.
 */
export async function GET(request: NextRequest) {
  try {
    await requireCapability("cases.view");

    const filters = parseCaseSearchParams(request.nextUrl.searchParams);
    const [options, result] = await Promise.all([
      getCaseFilterOptions(),
      searchCases(filters),
    ]);
    const intelligence = await getSearchIntelligence(filters, options);

    return NextResponse.json(
      { ...result, ...intelligence },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}
