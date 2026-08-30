import ExcelJS from "exceljs";
import type { CaseWithRefs } from "@/types";

interface ReportColumn {
  header: string;
  key: keyof CaseWithRefs;
  width?: number;
}

/**
 * Columns surfaced in exports. Deliberately excludes internal fields
 * (database id, contact info, free-text notes/background/findings,
 * audit metadata) so no sensitive or internal data is exposed.
 */
const REPORT_COLUMNS: ReportColumn[] = [
  { header: "CMG Reference", key: "cmgReference", width: 16 },
  { header: "Client Reference", key: "clientReference", width: 14 },
  { header: "Title", key: "title", width: 34 },
  { header: "Case Status", key: "status", width: 12 },
  { header: "Approval Status", key: "reportStatus", width: 16 },
  { header: "Target Name", key: "targetName", width: 24 },
  { header: "Target By", key: "targetBy", width: 18 },
  { header: "Target Nature", key: "targetNature", width: 18 },
  { header: "Target Owner", key: "targetOwner", width: 18 },
  { header: "Brand", key: "brand", width: 18 },
  { header: "City", key: "city", width: 14 },
  { header: "Investigation Date", key: "investigationDate", width: 14 },
  { header: "Last Updated", key: "lastUpdated", width: 18 },
];

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2937" },
};

/** Flattens a case row to only the exportable columns, in order. */
export function reportRow(row: CaseWithRefs): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const col of REPORT_COLUMNS) {
    const value = row[col.key];
    if (value instanceof Date) {
      out[col.header] = value.toISOString().slice(0, 10);
      continue;
    }
    out[col.header] =
      value === null || value === undefined || value === "" ? null : String(value);
  }
  return out;
}

function csvCell(value: string | null): string {
  if (value === null) return "";
  const text = value.replace(/[\r\n]+/g, " ").replace(/\t/g, " ");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Builds a UTF-8 CSV document (with BOM for Excel compatibility). */
export function buildReportCsv(rows: CaseWithRefs[]): string {
  const header = REPORT_COLUMNS.map((c) => c.header).join(",");
  const body = rows.map((row) => {
    const flat = reportRow(row);
    return REPORT_COLUMNS.map((c) => csvCell(flat[c.header])).join(",");
  });
  return `\uFEFF${header}\n${body.join("\n")}\n`;
}

/** Builds a styled .xlsx workbook with one sheet per report run. */
export async function buildReportWorkbook(
  rows: CaseWithRefs[],
  title: string,
  subtitle?: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CMG Case Management";
  const sheet = workbook.addWorksheet(title.slice(0, 31));

  sheet.columns = REPORT_COLUMNS.map((c) => ({
    header: c.header,
    key: c.header,
    width: c.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle" };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    const flat = reportRow(row);
    sheet.addRow(REPORT_COLUMNS.map((c) => flat[c.header]));
  }

  if (subtitle) {
    const totalRow = sheet.addRow([]);
    totalRow.getCell(1).value = subtitle;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function reportFilename(type: string, extension: "xlsx" | "csv"): string {
  const safe = type.replace(/[^a-z0-9_-]/gi, "_");
  return `cmg_report_${safe}_${new Date().toISOString().slice(0, 10)}.${extension}`;
}
