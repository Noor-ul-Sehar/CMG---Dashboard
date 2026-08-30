import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { suggestMapping, type ColumnMappingSuggestion } from "@/lib/import/fields";
import { newImportToken, writeImportFile } from "@/lib/import/storage";
import {
  ImportFileError,
  cellToDisplay,
  fetchImportReferenceNames,
  parseImportBuffer,
} from "@/lib/services/import-service";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireCapability("import");
  } catch (err) {
    return apiErrorResponse(err);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart upload with a file field named 'file'." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. The maximum upload size is 20 MB." },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseImportBuffer(buffer, file.name);
  } catch (err) {
    if (err instanceof ImportFileError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("parseImportBuffer failed:", err);
    return NextResponse.json(
      { error: "Unable to parse the uploaded file." },
      { status: 500 }
    );
  }

  const token = newImportToken();
  await writeImportFile(token, {
    filename: parsed.filename,
    headers: parsed.headers,
    rows: parsed.rows,
    mapping: null,
    truncated: parsed.truncated,
  });

  const previewRows = parsed.rows.slice(0, 10).map((row) => {
    const out: Record<string, string> = {};
    for (const header of parsed.headers) {
      out[header] = cellToDisplay(row[header]);
    }
    return out;
  });

  // Intelligent auto-mapping: header meaning + actual sample values +
  // the existing master/reference data (teams, target-by, brands, …).
  let autoMapping: ColumnMappingSuggestion[];
  try {
    const refs = await fetchImportReferenceNames();
    autoMapping = suggestMapping(parsed.headers, previewRows, refs);
  } catch (err) {
    console.error("auto-mapping failed:", err);
    autoMapping = parsed.headers.map((header) => ({
      header,
      fieldKey: null,
      detectedMeaning: "Auto-mapping unavailable",
      destination: "Skip column",
      destinationSection: "",
      confidence: 0,
      sampleValue: previewRows.find((r) => (r[header] ?? "").trim() !== "")?.[header] ?? "",
      needsConfirmation: true,
      candidateKeys: [],
    }));
  }

  return NextResponse.json({
    token,
    filename: parsed.filename,
    sheetName: parsed.sheetName,
    headers: parsed.headers,
    totalRows: parsed.rows.length,
    truncated: parsed.truncated,
    previewRows,
    autoMapping,
  });
}
