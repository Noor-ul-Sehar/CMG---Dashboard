import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import {
  DocumentValidationError,
  uploadCaseDocument,
} from "@/lib/services/document-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const description =
    typeof formData.get("description") === "string"
      ? (formData.get("description") as string).trim()
      : "";

  try {
    const user = await requireCapability("documents.upload");
    const doc = await uploadCaseDocument(id, user.id, file, description);
    return NextResponse.json(
      {
        id: doc.id,
        name: doc.name,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof DocumentValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "";
    if (message === "Case not found") {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }
    return apiErrorResponse(err);
  }
}