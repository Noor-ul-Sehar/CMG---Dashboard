import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import {
  deleteUnileverCase,
  getUnileverCaseById,
  updateUnileverCase,
} from "@/lib/services/unilever-service";
import {
  UnileverDuplicateReferenceError,
  validateUnileverCaseInput,
} from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
  }
  try {
    await requireCapability("cases.view");
  } catch (err) {
    return apiErrorResponse(err);
  }
  const theCase = await getUnileverCaseById(id);
  if (!theCase) {
    return NextResponse.json({ error: "Unilever case not found." }, { status: 404 });
  }
  return NextResponse.json(theCase);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
  }

  try {
    await requireCapability("cases.edit");
  } catch (err) {
    return apiErrorResponse(err);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const theCase = await getUnileverCaseById(id);
  if (!theCase) {
    return NextResponse.json({ error: "Unilever case not found." }, { status: 404 });
  }

  const present = (key: string) => body[key] !== undefined;
  const input: Record<string, unknown> = {
    cmgReference: present("cmgReference") ? body.cmgReference : theCase.cmgReference,
    clientReference: present("clientReference") ? body.clientReference : theCase.clientReference,
    targetName: present("targetName") ? body.targetName : theCase.targetName,
    targetNature: present("targetNature") ? body.targetNature : theCase.targetNature,
    targetBy: present("targetBy") ? body.targetBy : theCase.targetBy,
    brandNames: present("brandNames") ? body.brandNames : theCase.brands,
    status: present("status") ? body.status : theCase.status,
    approvalStatus: present("approvalStatus") ? body.approvalStatus : theCase.approvalStatus,
    investigationDate: present("investigationDate")
      ? body.investigationDate
      : theCase.investigationDate,
    notes: present("notes") ? body.notes : theCase.notes,
  };

  const validation = validateUnileverCaseInput(input);
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    const updated = await updateUnileverCase(id, validation.data);
    return NextResponse.json({ id: updated.id, cmgReference: updated.cmgReference });
  } catch (err) {
    if (err instanceof UnileverDuplicateReferenceError) {
      return NextResponse.json(
        { error: "This CMG reference number is already in use within Unilever." },
        { status: 409 }
      );
    }
    return apiErrorResponse(err);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
  }
  try {
    await requireCapability("cases.edit");
  } catch (err) {
    return apiErrorResponse(err);
  }
  const deleted = await deleteUnileverCase(id);
  if (!deleted) {
    return NextResponse.json({ error: "Unilever case not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}