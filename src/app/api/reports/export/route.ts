import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { parseReportParams, describeReportFilters } from "@/lib/api/report-params";
import { getReportResult, REPORT_TYPE_LABELS } from "@/lib/services/report-service";
import {
  buildReportCsv,
  buildReportWorkbook,
  reportFilename,
} from "@/lib/services/export-service";
import { recordAudit } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

function getIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

function attachment(contentType: string, filename: string, body: BodyInit) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  try {
    const user = await requireCapability("export");
    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    if (format !== "xlsx" && format !== "csv") {
      return NextResponse.json(
        { error: 'Invalid format. Use "xlsx" or "csv".' },
        { status: 400 }
      );
    }

    const filters = parseReportParams(url.searchParams);
    const { rows } = await getReportResult(filters);
    const label = REPORT_TYPE_LABELS[filters.type];
    const filename = reportFilename(filters.type, format);

    // Record export activity (report type + filters, no row data).
    await recordAudit(
      user.id,
      "report_exported",
      `${label} (${format}) — ${describeReportFilters(filters)} — ${rows.length} row(s)`,
      getIp(request)
    );

    if (format === "csv") {
      return attachment(
        "text/csv; charset=utf-8",
        filename,
        buildReportCsv(rows)
      );
    }

    const buffer = await buildReportWorkbook(rows, label, `${rows.length} case(s)`);
    return attachment(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename,
      new Uint8Array(buffer) as unknown as BodyInit
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}