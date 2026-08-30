import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import {
  deleteCaseDocument,
  DocumentNotFoundError,
  getStoredDocument,
  PermissionDeniedError,
} from "@/lib/services/document-service";

type RouteContext = { params: Promise<{ id: string; docId: string }> };

function parseIds(rawId: string, rawDocId: string): { id: number; docId: number } | null {
  const id = Number.parseInt(rawId, 10);
  const docId = Number.parseInt(rawDocId, 10);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(docId) || docId <= 0) {
    return null;
  }
  return { id, docId };
}

function contentDisposition(name: string): string {
  const safe = name.replace(/[\r\n"]/g, "_");
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_").slice(0, 200);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/** Authenticated document download. Never publicly reachable. */
export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId, docId: rawDocId } = await context.params;
  const ids = parseIds(rawId, rawDocId);
  if (!ids) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await requireCapability("cases.view");
  } catch (err) {
    return apiErrorResponse(err);
  }

  const result = await getStoredDocument(ids.id, ids.docId);
  if (!result) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const { record, data } = result;
  const mime =
    record.fileType === "pdf"
      ? "application/pdf"
      : record.fileType === "csv"
        ? "text/csv"
        : record.fileType === "txt"
          ? "text/plain"
          : "application/octet-stream";

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": `${mime}; charset=utf-8`,
      "Content-Length": String(data.length),
      "Content-Disposition": contentDisposition(record.name),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

/** Deletes a document, restricted to permitted roles. */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id: rawId, docId: rawDocId } = await context.params;
  const ids = parseIds(rawId, rawDocId);
  if (!ids) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const user = await requireCapability("documents.delete");
    await deleteCaseDocument(ids.id, ids.docId, user.role, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return apiErrorResponse(err);
  }
}