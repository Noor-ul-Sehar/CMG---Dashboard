import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { AuthError } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { apiErrorResponse } from "@/lib/api/guard";
import { getCaseById, getCaseRecordals, updateCase } from "@/lib/services/case-service";
import {
  DuplicateReferenceError,
  validateCaseInput,
} from "@/lib/validation";
import type { CaseWithRefs } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

/** Fields the reporting role may update without full case-editing rights. */
const REPORTING_FIELDS = ["reportStatus"] as const;

function reportingOnlyChanged(
  existing: CaseWithRefs,
  body: Record<string, unknown>
): boolean {
  const existingAny = existing as unknown as Record<string, unknown>;
  // Only keys the client actually sent are compared, so a reporting-only
  // update cannot be tripped up by merged-but-unchanged fields.
  for (const key of Object.keys(body)) {
    if ((REPORTING_FIELDS as readonly string[]).includes(key)) continue;
    if (existingAny[key] !== body[key]) return false;
  }
  return true;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
  }

  // Authenticate before doing any request-specific work.
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return apiErrorResponse(err);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const canEdit = can(user, "cases.edit");
    const canUpdateReporting = can(user, "cases.updateReporting");
    if (!canEdit && !canUpdateReporting) {
      throw new AuthError(
        "You do not have permission to update this case.",
        403
      );
    }

    const theCase = await getCaseById(id);
    if (!theCase) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const existingRecordals = await getCaseRecordals(id);

    // PATCH semantics: a field the client did NOT send must be preserved
    // from the existing record. Without this, an omitted field (e.g. an
    // approval-only update from the reporting role) would silently clear
    // other case data.
    const present = (key: string) => body[key] !== undefined;
    const input: Record<string, unknown> = {
      cmgReference: present("cmgReference") ? body.cmgReference : theCase.cmgReference,
      clientReference: present("clientReference") ? body.clientReference : theCase.clientReference,
      title: present("title") ? body.title : theCase.title,
      targetName: present("targetName") ? body.targetName : theCase.targetName,
      targetNature: present("targetNature") ? body.targetNature : theCase.targetNature,
      targetOwner: present("targetOwner") ? body.targetOwner : theCase.targetOwner,
      city: present("city") ? body.city : theCase.city,
      targetById: present("targetById") ? body.targetById : theCase.targetById,
      brandNames: present("brandNames") ? body.brandNames : theCase.brands,
      recordals: present("recordals") ? body.recordals : existingRecordals,
      status: present("status") ? body.status : theCase.status,
      investigationDate: present("investigationDate")
        ? body.investigationDate
        : theCase.investigationDate,
      notes: present("notes") ? body.notes : theCase.notes,
      reportStatus: present("reportStatus") ? body.reportStatus : theCase.reportStatus,
    };

    const validation = validateCaseInput(input);
    if (!validation.ok) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    if (!canEdit) {
      // Reporting-only users may change reporting fields, nothing else.
      if (!canUpdateReporting || !reportingOnlyChanged(theCase, body)) {
        throw new AuthError(
          "You do not have permission to update this case.",
          403
        );
      }
    }

    const updated = await updateCase(id, validation.data, user.id);
    return NextResponse.json({ id: updated.id, cmgReference: updated.cmgReference });
  } catch (err) {
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