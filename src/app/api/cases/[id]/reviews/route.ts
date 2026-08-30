import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/guard";
import { addReview, ReviewValidationError, validateReview } from "@/lib/services/review-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
  }

  let body: { reviewStatus?: unknown; reviewComment?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let review: { status: string; comment: string };
  try {
    review = validateReview(body);
  } catch (err) {
    if (err instanceof ReviewValidationError) {
      return NextResponse.json({ errors: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  try {
    const user = await requireCapability("reviews.add");
    await addReview(id, user.id, review.status, review.comment);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Case not found") {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }
    return apiErrorResponse(err);
  }
}