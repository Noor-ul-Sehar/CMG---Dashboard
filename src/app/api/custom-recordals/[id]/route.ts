import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import {
  CustomRecordalNotFoundError,
  CustomRecordalValidationError,
  deleteCustomRecordal,
  updateCustomRecordal,
  validateCustomRecordalInput,
} from "@/lib/services/custom-recordal-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid custom recordal ID." },
      { status: 400 }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  try {
    await requireCapability("customRecordals.manage");
    const input = validateCustomRecordalInput({
      recordalDate: body.recordalDate,
      clientRef: body.clientRef,
      cmgRef: body.cmgRef,
      brand: body.brand,
    });
    await updateCustomRecordal(id, input);
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof CustomRecordalValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    if (err instanceof CustomRecordalNotFoundError) {
      return NextResponse.json(
        { error: "Custom recordal not found." },
        { status: 404 }
      );
    }
    return apiErrorResponse(err);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid custom recordal ID." },
      { status: 400 }
    );
  }
  try {
    await requireCapability("customRecordals.manage");
    await deleteCustomRecordal(id);
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof CustomRecordalNotFoundError) {
      return NextResponse.json(
        { error: "Custom recordal not found." },
        { status: 404 }
      );
    }
    return apiErrorResponse(err);
  }
}
