import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { createCase } from "@/lib/services/case-service";
import {
  CaseValidationError,
  DuplicateReferenceError,
  validateCaseInput,
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

  const validation = validateCaseInput(body);
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const initialRemark = typeof body.initialRemark === "string" ? body.initialRemark : "";

  try {
    const created = await createCase(validation.data, user.id, initialRemark);
    return NextResponse.json(
      { id: created.id, cmgReference: created.cmgReference },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof CaseValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    if (err instanceof DuplicateReferenceError) {
      return NextResponse.json(
        {
          error: "This CMG reference number is already in use.",
          existing: err.existing,
        },
        { status: 409 }
      );
    }
    return apiErrorResponse(err);
  }
}