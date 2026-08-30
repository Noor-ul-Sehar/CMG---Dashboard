import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import {
  createCustomRecordal,
  CustomRecordalValidationError,
  listCustomRecordals,
  validateCustomRecordalInput,
} from "@/lib/services/custom-recordal-service";

export async function GET() {
  try {
    await requireCapability("customRecordals.view");
    const recordals = await listCustomRecordals();
    return NextResponse.json({ recordals });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
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
    const recordal = await createCustomRecordal(input);
    return NextResponse.json({ id: recordal.id }, { status: 201 });
  } catch (err) {
    if (err instanceof CustomRecordalValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    return apiErrorResponse(err);
  }
}
