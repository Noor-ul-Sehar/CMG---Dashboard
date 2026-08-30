/**
 * Defines which case fields can be imported from an Excel/CSV file and how a
 * file column is intelligently mapped to the correct CMG field.
 *
 * Mapping uses BOTH the column header meaning AND the actual sample values:
 *   - header synonyms (e.g. "CMG Ref", "Reference No" -> cmg_reference)
 *   - data content (dates -> date fields, known status values -> status,
 *     known target-by names, brand-like values, city codes…)
 *
 * The result is a per-column suggestion carrying a destination field, a
 * confidence score, the detected meaning and a sample value so the user can
 * review — and correct — every mapping before import. Columns that cannot be
 * mapped confidently are flagged for confirmation instead of being silently
 * skipped.
 */

import {
  APPROVAL_STATUSES,
  CASE_STATUSES,
} from "@/lib/constants";

export type ImportFieldType =
  | "text"
  | "date"
  | "status"
  | "report_status"
  | "target_by";

export interface ImportTargetField {
  key: string;
  label: string;
  type: ImportFieldType;
  required?: boolean;
  /** Human description of what this field holds — shown as "detected meaning". */
  meaning: string;
  /** UI section of the case detail where this field is displayed. */
  section: string;
  synonyms: string[];
}

export const IMPORT_FIELDS: ImportTargetField[] = [
  {
    key: "cmg_reference",
    label: "CMG Reference Number",
    type: "text",
    required: true,
    meaning: "Unique CMG case reference number",
    section: "Case Identification",
    synonyms: [
      "cmgref", "cmgreference", "cmgreferenceno", "cmgreferencenumber", "cmgreference#",
      "cmgnumber", "cmgno", "cmgrefno", "casecmg", "cmgcase", "cmgcasereference",
      "reference", "referenceno", "referencenumber", "ref", "refno", "refnumber",
      "caseref", "casereference", "casereferenceno", "casereferencenumber", "caseid", "caseno",
    ],
  },
  {
    key: "client_reference",
    label: "Client Reference Number",
    type: "text",
    meaning: "Client's own reference number for this case",
    section: "Case Identification",
    synonyms: [
      "clientref", "clientreference", "clientreferenceno", "clientreferencenumber",
      "clientrefno", "clientrefnumber", "clientno", "clientcase", "filereference", "fileref", "fileno",
    ],
  },
  {
    key: "title",
    label: "Case Title",
    type: "text",
    meaning: "Short case summary / title",
    section: "Case Identification",
    synonyms: ["title", "casetitle", "casename", "subject", "summary", "description"],
  },
  {
    key: "target_name",
    label: "Target Name",
    type: "text",
    meaning: "Name of the target company / subject",
    section: "Target Information",
    synonyms: [
      "target", "targetname", "subjectname", "defendant", "respondent", "company",
      "companyname", "entity", "entityname", "businessname", "firm", "firmname",
    ],
  },
  {
    key: "target_by",
    label: "Target By",
    type: "target_by",
    meaning: "Person / team that initiated or requested the target action",
    section: "Target Information",
    synonyms: [
      "targetby", "targetedby", "targeted", "requestedby", "reportedby", "initiatedby",
      "by", "targetingby", "targetofficer", "officerincharge",
    ],
  },
  {
    key: "target_nature",
    label: "Target Nature",
    type: "text",
    meaning: "What the target deals in (e.g. Garments, Electronics, Market Case)",
    section: "Target Information",
    synonyms: [
      "nature", "targetnature", "natureofcase", "natureofwork", "natureofbusiness",
      "dealing", "commodity", "trade", "category", "market", "marketcase",
    ],
  },
  {
    key: "target_owner",
    label: "Target Owner",
    type: "text",
    meaning: "Owner / operator of the target",
    section: "Target Information",
    synonyms: ["targetowner", "owner", "operator", "proprietor"],
  },
  {
    key: "city",
    label: "City",
    type: "text",
    meaning: "City of the target / case",
    section: "Target Information",
    synonyms: ["city", "town", "citycountry", "district"],
  },
  {
    key: "brand",
    label: "Brand",
    type: "text",
    meaning: "Brand(s) involved in the case (separate multiple brands with commas)",
    section: "Brands",
    synonyms: ["brand", "brandname", "brands", "trademark", "label"],
  },
  {
    key: "status",
    label: "Case Status",
    type: "status",
    meaning: "Current case status",
    section: "Status & Dates",
    synonyms: ["status", "casestatus", "currentstatus", "state", "casecondition"],
  },
  {
    key: "investigation_date",
    label: "Investigation Date",
    type: "date",
    meaning: "Date of investigation",
    section: "Status & Dates",
    synonyms: [
      "investigationdate", "dateofinvestigation", "investigationstarted", "investigatedon",
      "inspectiondate", "surveyeddate",
    ],
  },
  {
    key: "notes",
    label: "Notes / Remarks",
    type: "text",
    meaning: "Internal notes or remarks",
    section: "Case Notes",
    synonyms: ["notes", "note", "remarks", "comments", "internalnotes"],
  },
  {
    key: "report_status",
    label: "Approval Status",
    type: "report_status",
    meaning: "Approval status of the case report",
    section: "Approval Status",
    synonyms: [
      "approvalstatus", "reportstatus", "reportingstatus", "approval", "report",
      "reportstatusandreview", "approvalstatusreport",
    ],
  },
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const SYNONYM_MAP = new Map<string, string>();
for (const field of IMPORT_FIELDS) {
  for (const synonym of field.synonyms) {
    SYNONYM_MAP.set(normalize(synonym), field.key);
  }
}

/** Known city names / airport-style codes used for content-based detection. */
const CITY_HINTS = new Set([
  "KHI", "LHE", "LHR", "ISB", "PEW", "KAR", "RWP", "FSD", "MUX", "GUJ", "HYD",
  "SKT", "SWT", "UBQ", "QTA", "UET", "LAHORE", "KARACHI", "ISLAMABAD", "RAWALPINDI",
  "PESHAWAR", "QUETTA", "FAISALABAD", "MULTAN", "HYDERABAD", "SUKKUR", "SIALKOT",
  "GUJRANWALA", "Gujranwala", "SARGODHA", "BAHAWALPUR", "SAHIWAL", "DUBAI",
  "SHARJAH", "ABU DHABI", "LONDON", "NEW YORK", "SHENZHEN", "GUANGZHOU", "ISTANBUL",
]);

/** Names that could map to a reference number column. */
const REFERENCE_LIKE = /^[A-Z0-9][A-Z0-9.\/_-]*[-_#][A-Z0-9.\/_-]+$/i;

const ENUM_LISTS: Record<string, { value: string; label: string }[]> = {
  status: CASE_STATUSES,
  report_status: APPROVAL_STATUSES,
};

export interface ReferenceNames {
  targetBy: string[];
  brands: string[];
}

/** Per-column automatic mapping suggestion shown in the mapping preview. */
export interface ColumnMappingSuggestion {
  header: string;
  /** Destination field key, or null when nothing confident was found. */
  fieldKey: string | null;
  /** Human description of what the importer believes the column means. */
  detectedMeaning: string;
  /** Display label of the destination field. */
  destination: string;
  /** UI section where the destination field lives. */
  destinationSection: string;
  /** 0..1 confidence in the suggested mapping. */
  confidence: number;
  /** First non-empty sample value used to judge content. */
  sampleValue: string;
  /** True when the mapping is uncertain and needs user confirmation. */
  needsConfirmation: boolean;
  /** Ordered candidate fields for the correction dropdown (best first). */
  candidateKeys: string[];
}

function looksLikeDate(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) return true;
  if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(value)) return true;
  if (/^\d{4}-\d{1,2}-\d{1,2}[T ]\d{1,2}:\d{2}/.test(value)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(value) && /\d{4}/.test(value)) {
    return true;
  }
  return false;
}

/** How strongly the header name alone points at a field. */
function headerScore(header: string, field: ImportTargetField): number {
  const h = normalize(header);
  if (!h) return 0;
  if (SYNONYM_MAP.get(h) === field.key) return 4;
  for (const synonym of field.synonyms) {
    const s = normalize(synonym);
    if (!s || s.length < 3) continue;
    if (h.includes(s)) return 3;
    if (s.includes(h) && h.length >= 3) return 2;
  }
  return 0;
}

/** How strongly the actual cell values point at a field. */
function dataScore(
  field: ImportTargetField,
  samples: string[],
  refs: ReferenceNames
): number {
  const nonEmpty = samples.filter((s) => s.trim() !== "");
  if (nonEmpty.length === 0) return 0;
  const hits = (pred: (v: string) => boolean) =>
    nonEmpty.filter(pred).length / nonEmpty.length;

  const ratio = (values: string[]) => {
    const d = hits((v) => values.some((n) => n.toLowerCase() === v.toLowerCase()));
    return d;
  };

  switch (field.type) {
    case "date": {
      const d = hits(looksLikeDate);
      return d >= 0.5 ? 3 : d > 0 ? 1 : 0;
    }
    case "status":
    case "report_status": {
      const list = ENUM_LISTS[field.type] ?? [];
      const d = hits(
        (v) =>
          list.some(
            (l) => l.value === v.toLowerCase() || l.label.toLowerCase() === v.toLowerCase()
          )
      );
      return d >= 0.5 ? 3 : d > 0 ? 1.5 : 0;
    }
    case "target_by":
      return ratio(refs.targetBy) >= 0.5 ? 3 : ratio(refs.targetBy) > 0 ? 1.5 : 0;
    default:
      break;
  }

  if (field.key === "brand") {
    const d = hits(
      (v) =>
        refs.brands.some((b) => b.toLowerCase() === v.toLowerCase()) ||
        /^[A-Za-z][A-Za-z0-9 &.'-]{1,40}$/.test(v)
    );
    return d >= 0.5 ? 2.5 : d > 0 ? 1 : 0;
  }
  if (field.key === "cmg_reference") {
    const d = hits((v) => REFERENCE_LIKE.test(v.trim()) || /^CMG/i.test(v.trim()));
    return d >= 0.5 ? 2 : d > 0 ? 1 : 0;
  }
  if (field.key === "client_reference") {
    const d = hits((v) => /^[A-Z0-9][A-Z0-9.\/_-]*[\/_-][A-Z0-9.\/_-]+$/i.test(v.trim()));
    return d >= 0.5 ? 1.5 : d > 0 ? 0.5 : 0;
  }
  if (field.key === "city") {
    const d = hits(
      (v) =>
        CITY_HINTS.has(v.trim().toUpperCase()) ||
        /^[A-Z]{2,5}$/.test(v.trim())
    );
    return d >= 0.5 ? 3 : d > 0 ? 1 : 0;
  }
  if (field.key === "target_name") {
    const d = hits(
      (v) =>
        /(cos?\.?|co\b|corp|corporation|ltd|llc|inc|fans|stores?|shop|market|goods|enterprise|traders|wala|store)/i.test(
          v.trim()
        )
    );
    return d >= 0.5 ? 2 : d > 0 ? 1 : 0;
  }
  return 0;
}

function confidenceFrom(hScore: number, dScore: number): number {
  if (hScore >= 4) return Math.min(0.97, 0.9 + dScore * 0.015);
  if (hScore === 3) return Math.min(0.9, 0.82 + dScore * 0.015);
  if (hScore === 2) return Math.min(0.85, 0.78 + dScore * 0.015);
  if (hScore === 1) return Math.min(0.8, 0.72 + dScore * 0.02);
  if (dScore >= 2.5) return 0.78;
  if (dScore >= 1.5) return 0.7;
  if (dScore >= 0.5) return 0.6;
  return 0.35;
}

function describeContent(header: string, samples: string[], refs: ReferenceNames): string {
  const nonEmpty = samples.filter((s) => s.trim() !== "");
  const dateRatio = nonEmpty.filter((v) => looksLikeDate(v)).length / Math.max(nonEmpty.length, 1);
  if (dateRatio >= 0.5) return "Values look like dates";
  const cityRatio =
    nonEmpty.filter((v) => CITY_HINTS.has(v.trim().toUpperCase()) || /^[A-Z]{2,5}$/.test(v.trim())).length /
    Math.max(nonEmpty.length, 1);
  if (cityRatio >= 0.5) return "Values look like city names / codes";
  if (nonEmpty.every((v) => /^[A-Za-z0-9][A-Za-z0-9.\/_-]*[-_#][A-Za-z0-9.\/_-]+$/.test(v.trim()))) {
    return "Values look like reference numbers";
  }
  const brandRatio =
    nonEmpty.filter((v) => refs.brands.some((b) => b.toLowerCase() === v.toLowerCase())).length /
    Math.max(nonEmpty.length, 1);
  if (brandRatio >= 0.5) return "Values match existing brand names";
  const targetByRatio =
    nonEmpty.filter((v) => refs.targetBy.some((t) => t.toLowerCase() === v.toLowerCase())).length /
    Math.max(nonEmpty.length, 1);
  if (targetByRatio >= 0.5) return "Values match existing Target By names";
  return `Unrecognised column "${header}"`;
}

/**
 * Auto-suggests a mapping for each detected column, using the header meaning
 * combined with the actual sample values. Uncertain results are flagged so the
 * user can confirm them instead of the column being silently skipped.
 */
export function suggestMapping(
  headers: string[],
  sampleRows: Record<string, string>[],
  refs: ReferenceNames
): ColumnMappingSuggestion[] {
  const used = new Set<string>();
  const suggestions: ColumnMappingSuggestion[] = [];

  for (const header of headers) {
    const samples = sampleRows.map((r) => r[header] ?? "").filter((s) => s !== undefined);
    const sampleValue = samples.find((s) => s.trim() !== "") ?? "";

    interface Candidate {
      field: ImportTargetField;
      hScore: number;
      dScore: number;
      total: number;
    }

    const candidates: Candidate[] = IMPORT_FIELDS.filter(
      (f) => !used.has(f.key) || f.key === (SYNONYM_MAP.get(normalize(header)) ?? "")
    )
      .map((field) => {
        const hScore = headerScore(header, field);
        const dScore = dataScore(field, samples, refs);
        return { field, hScore, dScore, total: hScore + dScore * 0.6 };
      })
      .filter((c) => c.hScore > 0 || c.dScore >= 0.5)
      .sort((a, b) => b.total - a.total || b.hScore - a.hScore);

    let best: Candidate | null = null;
    for (const c of candidates) {
      if (!used.has(c.field.key)) {
        best = c;
        break;
      }
    }
    if (!best) best = candidates[0] ?? null;

    const field = best?.field ?? null;
    const hScore = best?.hScore ?? 0;
    const dScore = best?.dScore ?? 0;

    if (field) {
      used.add(field.key);
    }

    const confidence = field ? confidenceFrom(hScore, dScore) : 0.3;
    const needsConfirmation = field ? confidence < 0.8 : true;

    suggestions.push({
      header,
      fieldKey: field?.key ?? null,
      detectedMeaning: field ? field.meaning : describeContent(header, samples, refs),
      destination: field?.label ?? "Skip column",
      destinationSection: field?.section ?? "",
      confidence: Math.round(confidence * 100) / 100,
      sampleValue,
      needsConfirmation,
      candidateKeys: candidates.map((c) => c.field.key),
    });
  }

  return suggestions;
}

export function getField(key: string): ImportTargetField | undefined {
  return IMPORT_FIELDS.find((f) => f.key === key);
}