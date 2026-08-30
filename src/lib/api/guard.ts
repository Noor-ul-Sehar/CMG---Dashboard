import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

/** Standard error → JSON response mapping for API routes. */
export function apiErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const maybeValidation = err as { errors?: Record<string, string> };
  if (maybeValidation?.errors && typeof maybeValidation.errors === "object") {
    return NextResponse.json({ errors: maybeValidation.errors }, { status: 400 });
  }
  console.error("API error:", err);
  return NextResponse.json(
    { error: "An unexpected error occurred. Please try again." },
    { status: 500 }
  );
}