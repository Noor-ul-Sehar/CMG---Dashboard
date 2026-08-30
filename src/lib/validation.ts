import {
  APPROVAL_STATUSES,
  CASE_STATUSES,
  MARKET_CASE_BRANDS,
  MARKET_CASE_TARGET_NATURES,
  UNILEVER_TARGET_BY,
  UNILEVER_TARGET_NATURES,
} from "@/lib/constants";
import type { CaseInput, CaseStatus, ReportStatus } from "@/types";

export class CaseValidationError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super("Validation failed");
    this.name = "CaseValidationError";
    this.errors = errors;
  }
}

export class DuplicateReferenceError extends Error {
  reference: string;
  existing: {
    id: number;
    cmgReference: string;
    title: string | null;
    targetName: string | null;
    status: string;
  };
  constructor(
    reference: string,
    existing: {
      id: number;
      cmgReference: string;
      title: string | null;
      targetName: string | null;
      status: string;
    }
  ) {
    super(`CMG reference ${reference} is already in use.`);
    this.name = "DuplicateReferenceError";
    this.reference = reference;
    this.existing = existing;
  }
}

export function normalizeReference(ref: string): string {
  return ref.trim().toUpperCase();
}

function isValidDate(value: string | null): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const t = value.trim();
  return t === "" ? null : t;
}

function inList<T extends string>(
  value: string,
  list: { value: T; label: string }[]
): value is T {
  return list.some((s) => s.value === value);
}

export type ValidatedCaseInput = CaseInput & {
  cmgReference: string;
  status: CaseStatus;
  reportStatus: ReportStatus;
};

const MAX_REF_LENGTH = 100;

/** Normalizes one recordal entry; returns null when the entry is fully empty. */
function validateRecordal(
  raw: unknown,
  errors: Record<string, string>,
  field: string
): { recordalDate: string | null; brandCmgCaseRef: string | null; brandCaseRef: string | null } | null {
  const obj = raw as Record<string, unknown> | null;
  if (!obj || typeof obj !== "object") {
    errors.recordals = "Recordals must be a list of entries.";
    return null;
  }
  const str = (k: string) => (typeof obj[k] === "string" ? obj[k].trim() : "");

  const recordalDate = str("recordalDate");
  const brandCmgCaseRef = str("brandCmgCaseRef");
  const brandCaseRef = str("brandCaseRef");

  if (!recordalDate && !brandCmgCaseRef && !brandCaseRef) return null;

  if (recordalDate && !isValidDate(recordalDate)) {
    errors.recordals = `Recordal ${field}: please enter a valid date (YYYY-MM-DD).`;
  }
  for (const [key, label] of [
    ["brandCmgCaseRef", "Brand CMG Case Ref #"],
    ["brandCaseRef", "Brand Case Ref #"],
  ] as const) {
    const v = str(key);
    if (v.length > MAX_REF_LENGTH) {
      errors.recordals = `Recordal ${field}: ${label} is too long (max ${MAX_REF_LENGTH} characters).`;
    }
  }

  return {
    recordalDate: recordalDate || null,
    brandCmgCaseRef: brandCmgCaseRef || null,
    brandCaseRef: brandCaseRef || null,
  };
}

/** Validates raw form input. Returns normalized data or a field error map. */
export function validateCaseInput(
  input: Record<string, unknown>
):
  | { ok: true; data: ValidatedCaseInput }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const cmgReference = normalizeReference(
    typeof input.cmgReference === "string" ? input.cmgReference : ""
  );
  if (!cmgReference) {
    errors.cmgReference = "CMG Reference Number is required.";
  } else if (cmgReference.length > 100) {
    errors.cmgReference = "CMG Reference Number is too long (max 100 characters).";
  }

  const str = (key: string): string | null => {
    const v = input[key];
    return typeof v === "string" ? v : null;
  };

  const status = str("status") ?? "open";
  if (!inList(status, CASE_STATUSES)) {
    errors.status = "Invalid case status selected.";
  }

  const reportStatus = str("reportStatus") ?? "pending_approval";
  if (!inList(reportStatus, APPROVAL_STATUSES)) {
    errors.reportStatus = "Invalid approval status selected.";
  }

  const investigationDate = str("investigationDate");
  if (investigationDate && !isValidDate(investigationDate)) {
    errors.investigationDate = "Please enter a valid date (YYYY-MM-DD).";
  }

  const parseId = (key: string): number | null => {
    const v = str(key);
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  };

  const brandNames = Array.isArray(input.brandNames)
    ? [
        ...new Set(
          input.brandNames
            .map((v) => (typeof v === "string" ? v.trim() : ""))
            .filter((v) => v !== "")
        ),
      ]
    : [];
  const invalidBrands = brandNames.filter((b) => !MARKET_CASE_BRANDS.includes(b));
  if (invalidBrands.length > 0) {
    errors.brandNames =
      `${invalidBrands.join(", ")} is not in the approved brand list. ` +
      "Please choose from the brand selector.";
  }

  const rawTargetNature = str("targetNature")?.trim() ?? "";
  if (rawTargetNature && !MARKET_CASE_TARGET_NATURES.includes(rawTargetNature)) {
    errors.targetNature = "Please choose a valid target nature from the list.";
  }

  const recordals: ValidatedCaseInput["recordals"] = [];
  if (input.recordals !== undefined) {
    if (!Array.isArray(input.recordals)) {
      errors.recordals = "Recordals must be a list of entries.";
    } else {
      input.recordals.forEach((raw, i) => {
        if (errors.recordals) return;
        const entry = validateRecordal(raw, errors, `#${i + 1}`);
        if (entry) recordals.push(entry);
      });
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      cmgReference,
      clientReference: emptyToNull(str("clientReference")),
      title: emptyToNull(str("title")),
      targetName: emptyToNull(str("targetName")),
      targetNature: emptyToNull(str("targetNature")),
      targetOwner: emptyToNull(str("targetOwner")),
      city: emptyToNull(str("city")),
      targetById: parseId("targetById"),
      brandNames,
      recordals,
      status: status as CaseStatus,
      investigationDate: emptyToNull(investigationDate),
      notes: emptyToNull(str("notes")),
      reportStatus: reportStatus as ReportStatus,
    },
  };
}

export function validateRemark(
  comment: unknown,
  type: unknown
): { ok: true; comment: string; type: string } | { ok: false; error: string } {
  const text = typeof comment === "string" ? comment.trim() : "";
  if (!text) {
    return { ok: false, error: "Remark text is required." };
  }
  if (text.length > 2000) {
    return { ok: false, error: "Remark is too long (max 2000 characters)." };
  }
  const remarkType = typeof type === "string" ? type : "note";
  return { ok: true, comment: text, type: remarkType };
}

export type ValidatedUnileverCaseInput = {
  cmgReference: string;
  clientReference: string | null;
  targetName: string | null;
  targetNature: string | null;
  targetBy: string | null;
  brandNames: string[];
  status: string;
  approvalStatus: string;
  investigationDate: string | null;
  notes: string | null;
};

/**
 * Validates raw Unilever case form input. Brands are free-form but
 * de-duplicated; Target By must come from the restricted Unilever list.
 */
export function validateUnileverCaseInput(
  input: Record<string, unknown>
):
  | { ok: true; data: ValidatedUnileverCaseInput }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const cmgReference = normalizeReference(
    typeof input.cmgReference === "string" ? input.cmgReference : ""
  );
  if (!cmgReference) {
    errors.cmgReference = "CMG Reference Number is required.";
  } else if (cmgReference.length > 100) {
    errors.cmgReference = "CMG Reference Number is too long (max 100 characters).";
  }

  const str = (key: string): string | null => {
    const v = input[key];
    return typeof v === "string" ? v : null;
  };

  const targetName = str("targetName")?.trim() ?? "";
  if (!targetName) {
    errors.targetName = "Target Name is required.";
  } else if (targetName.length > 200) {
    errors.targetName = "Target Name is too long (max 200 characters).";
  }

  const rawTargetNature = str("targetNature")?.trim() ?? "";
  if (rawTargetNature && !UNILEVER_TARGET_NATURES.includes(rawTargetNature)) {
    errors.targetNature = "Please choose a valid target nature from the list.";
  }

  const targetBy = str("targetBy")?.trim() ?? "";
  if (targetBy && !UNILEVER_TARGET_BY.includes(targetBy)) {
    errors.targetBy =
      `"${targetBy}" is not available for Unilever cases. ` +
      "Choose from the Unilever Target By list.";
  }

  const status = str("status") ?? "open";
  if (!inList(status, CASE_STATUSES)) {
    errors.status = "Invalid case status selected.";
  }

  const approvalStatus = str("approvalStatus") ?? "pending_approval";
  if (!inList(approvalStatus, APPROVAL_STATUSES)) {
    errors.approvalStatus = "Invalid approval status selected.";
  }

  const investigationDate = str("investigationDate");
  if (investigationDate && !isValidDate(investigationDate)) {
    errors.investigationDate = "Please enter a valid date (YYYY-MM-DD).";
  }

  const brandNames = Array.isArray(input.brandNames)
    ? [
        ...new Set(
          input.brandNames
            .map((v) => (typeof v === "string" ? v.trim().replace(/,+$/g, "") : ""))
            .map((v) => v.trim())
            .filter((v) => v !== "")
        ),
      ]
    : [];

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      cmgReference,
      clientReference: emptyToNull(str("clientReference")),
      targetName: targetName || null,
      targetNature: emptyToNull(str("targetNature")),
      targetBy: targetBy || null,
      brandNames,
      status,
      approvalStatus,
      investigationDate: emptyToNull(investigationDate),
      notes: emptyToNull(str("notes")),
    },
  };
}

/** Unique-value error for the Unilever module (own constraint). */
export class UnileverDuplicateReferenceError extends Error {
  reference: string;
  constructor(reference: string) {
    super(`CMG reference ${reference} is already in use within Unilever.`);
    this.name = "UnileverDuplicateReferenceError";
    this.reference = reference;
  }
}