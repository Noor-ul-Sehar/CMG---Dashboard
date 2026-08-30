import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { readImportFile, removeImportFile } from "@/lib/import/storage";
import { confirmImport } from "@/lib/services/import-service";
import type { MasterDecisions } from "@/types";

export async function POST(request: Request) {
  try {
    await requireCapability("import");
  } catch (err) {
    return apiErrorResponse(err);
  }
  let body: { token?: unknown; masterDecisions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json(
      { error: "Import session token is required." },
      { status: 400 }
    );
  }

  const stored = await readImportFile(token);
  if (!stored) {
    return NextResponse.json(
      { error: "Import session not found or expired. Please re-upload the file." },
      { status: 404 }
    );
  }
  if (!stored.mapping) {
    return NextResponse.json(
      { error: "Column mapping has not been validated yet." },
      { status: 400 }
    );
  }

  try {
    const user = await requireCapability("import");
    const masterDecisions =
      (body.masterDecisions as MasterDecisions | undefined) ?? {};
    const result = await confirmImport(
      token,
      stored.filename,
      stored.headers,
      stored.rows,
      stored.mapping,
      user.id,
      masterDecisions
    );
    await removeImportFile(token);
    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err);
  }
}