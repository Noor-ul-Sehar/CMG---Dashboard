import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { createUnileverCase } from "@/lib/services/unilever-service";
import {
  CaseValidationError,
  UnileverDuplicateReferenceError,
  validateUnileverCaseInput,
} from "@/lib/validation";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let user;
  try {
    user = await requireCapability("cases.create");
  } catch (err) {
    return apiErrorResponse(err);
  }

  const validation = validateUnileverCaseInput(body);
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    const created = await createUnileverCase(validation.data, user.id);
    return NextResponse.json(
      { id: created.id, cmgReference: created.cmgReference },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof CaseValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    if (err instanceof UnileverDuplicateReferenceError) {
      return NextResponse.json(
        { error: "This CMG reference number is already in use within Unilever." },
        { status: 409 }
      );
    }
    return apiErrorResponse(err);
  }
}