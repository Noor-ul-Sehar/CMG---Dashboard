import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { readImportFile, updateImportFile } from "@/lib/import/storage";
import {
  analyzeMasterValues,
  fetchExistingReferences,
  fetchImportReferenceNames,
  summarizeValidation,
  validateImportRows,
} from "@/lib/services/import-service";

export async function POST(request: Request) {
  try {
    await requireCapability("import");
  } catch (err) {
    return apiErrorResponse(err);
  }
  let body: { token?: unknown; mapping?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const mapping = (body.mapping ?? {}) as Record<string, string>;

  if (!token) {
    return NextResponse.json(
      { error: "Import session token is required." },
      { status: 400 }
    );
  }
  if (typeof mapping !== "object" || !mapping.cmg_reference) {
    return NextResponse.json(
      { error: "Please map the CMG Reference Number column before continuing." },
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

  try {
    const existingRefs = await fetchExistingReferences();
    const targetByNames = (await fetchImportReferenceNames()).targetBy;
    const results = validateImportRows(stored.rows, mapping, existingRefs, targetByNames);
    const summary = summarizeValidation(results);
    const masterReview = await analyzeMasterValues(stored.rows, mapping);
    await updateImportFile(token, { mapping });
    return NextResponse.json({ summary, masterReview });
  } catch (err) {
    console.error("import validate failed:", err);
    return NextResponse.json(
      { error: "Unable to validate the imported data." },
      { status: 500 }
    );
  }
}