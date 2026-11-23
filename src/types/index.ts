export type UserRole =
  | "admin"
  | "manager"
  | "team_member"
  | "reporting"
  | "viewer";

export type CaseStatus = "open" | "close" | "close_1";

export type ReportStatus = "pending_approval" | "rejected" | "approved";

/** Historical review state kept in the reviews table (no longer a case field). */
export type ReviewStatus =
  | "none"
  | "pending_review"
  | "reviewed"
  | "approved"
  | "rejected";

export type RemarkType =
  | "note"
  | "update"
  | "follow_up"
  | "resolution"
  | "escalation";

export interface Team {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface Investigator {
  id: number;
  name: string;
  email: string | null;
  team_id: number | null;
  is_active: boolean;
  created_at: Date;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  team_id: number | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: Date;
  last_login_at: Date | null;
}

export interface Case {
  id: number;
  cmgReference: string;
  clientReference: string | null;
  title: string | null;

  targetName: string | null;
  targetNature: string | null;
  targetOwner: string | null;
  city: string | null;

  brand: string | null;

  targetById: number | null;
  targetNatureId: number | null;
  targetId: number | null;

  teamId: number | null;
  investigatorId: number | null;

  status: CaseStatus;
  reportStatus: ReportStatus;

  investigationDate: string | null;
  lastUpdated: Date;

  notes: string | null;

  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Case row joined with related team / investigator names for lists & profile. */
export interface CaseWithRefs extends Case {
  teamName: string | null;
  investigatorName: string | null;
  targetBy: string | null;
  brands: string[];
  brandIds: number[];
  remarkCount?: number;
  reviewCount?: number;
  documentCount?: number;
}

/** A Unilever case — a completely independent dataset from Market Cases. */
export interface UnileverCase {
  id: number;
  cmgReference: string;
  clientReference: string | null;
  targetName: string | null;
  targetNature: string | null;
  targetBy: string | null;
  brand: string | null;
  brands: string[];
  status: string;
  approvalStatus: string;
  investigationDate: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Filter options for the Unilever case list. */
export interface UnileverCaseListFilters {
  q?: string;
  status?: string;
  targetBy?: string;
  targetNature?: string;
  brand?: string;
  page?: number;
  perPage?: number;
}

export interface UnileverCaseListResult {
  rows: UnileverCase[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/** A single recordal entry attached to a case. */
export interface CaseRecordal {
  id: number;
  caseId: number;
  recordalDate: string | null;
  brandCmgCaseRef: string | null;
  brandCaseRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Raw recordal input from the form (before save). */
export interface RecordalInput {
  recordalDate?: string | null;
  brandCmgCaseRef?: string | null;
  brandCaseRef?: string | null;
}

/** A single custom recordal — fully independent from Market Cases. */
export interface CustomRecordal {
  id: number;
  recordalDate: string | null;
  clientRef: string;
  cmgRef: string;
  brand: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Input shape for creating or updating a custom recordal. */
export interface CustomRecordalInput {
  recordalDate: string | null;
  clientRef: string;
  cmgRef: string;
  brand: string;
}

export interface Remark {
  id: number;
  caseId: number;
  userId: number | null;
  userName: string | null;
  comment: string;
  type: RemarkType;
  createdAt: Date;
}

export interface Review {
  id: number;
  caseId: number;
  reviewerId: number | null;
  reviewerName: string | null;
  reviewComment: string | null;
  reviewStatus: ReviewStatus;
  reviewedAt: Date;
  createdAt: Date;
}

export interface ActivityLog {
  id: number;
  caseId: number;
  userId: number | null;
  userName: string | null;
  action: string;
  description: string | null;
  createdAt: Date;
}

export interface CaseDocument {
  id: number;
  caseId: number;
  name: string;
  description: string | null;
  fileType: string | null;
  fileSize: number | null;
  reference: string | null;
  filePath: string | null;
  uploadedBy: number | null;
  uploadedByName: string | null;
  createdAt: Date;
}

export interface ImportBatch {
  id: number;
  filename: string;
  status: "prepared" | "imported" | "cancelled" | "failed";
  totalRows: number;
  newCount: number;
  duplicateCount: number;
  invalidCount: number;
  columnMapping: Record<string, string> | null;
  errors: ImportRowResult[] | null;
  importedBy: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ConfirmImportResult {
  batchId: number;
  imported: number;
  duplicates: number;
  invalid: number;
  total: number;
}

/** Result of validating a single imported row. */
export interface ImportRowResult {
  row: number;
  status: "new" | "duplicate" | "invalid";
  cmgReference?: string | null;
  errors?: string[];
  warnings?: string[];
  duplicateOfRow?: number;
  duplicateOfExistingId?: number;
}

export interface ImportValidationSummary {
  total: number;
  newCount: number;
  duplicateCount: number;
  invalidCount: number;
  missingInfoCount: number;
  warningsCount: number;
  problems: ImportRowResult[];
}

/** A candidate existing master-data row for a similar-but-not-equal value. */
export interface MasterValueOption {
  id: number;
  name: string;
}

/**
 * How one distinct imported value should be treated against existing master
 * data. `existing` = exact normalized match (auto-accepted). `ambiguous` =
 * similar but not equal — must be confirmed by the user. `new` = no existing
 * candidate (a new master record will be created).
 */
export interface MasterValueAnalysis {
  fieldKey: string;
  label: string;
  values: {
    value: string;
    status: "existing" | "new" | "ambiguous";
    existingName?: string | null;
    candidates: MasterValueOption[];
  }[];
}

/**
 * Per-value user decision for ambiguous master-data values, keyed by
 * `fieldKey` then the raw file value. A number means "use this existing id";
 * "new" means "create a new master record with the original value".
 */
export type MasterDecision = number | "new";
export type MasterDecisions = Record<string, Record<string, MasterDecision>>;

export interface DashboardStats {
  total_cases: number;
  open_cases: number;
  closed_cases: number;
  close_1_cases: number;
  cases_by_status: { status: string; count: number }[];
  recent_cases: CaseWithRefs[];
  important_pending: CaseWithRefs[];
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  team_id: number | null;
  mustChangePassword?: boolean;
}

/** Input shape for creating or updating a case. */
export interface CaseInput {
  cmgReference: string;
  clientReference: string | null;
  title: string | null;
  targetName: string | null;
  targetNature: string | null;
  targetOwner: string | null;
  city: string | null;
  targetById: number | null;
  brandNames: string[];
  recordals: RecordalInput[];
  status: CaseStatus;
  investigationDate: string | null;
  notes: string | null;
  reportStatus: ReportStatus;
}

export interface CaseFullProfile {
  case: CaseWithRefs;
  recordals: CaseRecordal[];
  remarks: Remark[];
  reviews: Review[];
  activity: ActivityLog[];
  documents: CaseDocument[];
}

export interface CaseListResult {
  rows: CaseWithRefs[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export type CaseSort = "newest" | "oldest" | "az" | "za" | "relevance";

export interface CaseListFilters {
  q?: string;
  status?: string;
  statusIn?: string[];
  targetBy?: string | null;
  targetNature?: string | null;
  brand?: string | null;
  brands?: string[];
  clientReference?: string | null;
  reportStatus?: string | null;
  caseType?: string | null;
  investigator?: string | null;
  team?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sort?: CaseSort;
  page?: number;
  perPage?: number;
}

export interface FacetCount {
  value: string;
  label: string;
  count: number;
}

export interface FilterFacets {
  status: FacetCount[];
  reportStatus: FacetCount[];
  targetBy: FacetCount[];
  targetNature: FacetCount[];
  brand: FacetCount[];
  caseType: FacetCount[];
  investigator: FacetCount[];
  team: FacetCount[];
}

export interface SearchSuggestionCategory {
  label: string;
  value: string;
  type: "brand" | "targetNature" | "targetBy" | "status";
}

export interface SearchSuggestions {
  didYouMean: string | null;
  relatedKeywords: string[];
  categories: SearchSuggestionCategory[];
  popular: string[];
}

export interface SearchResponse extends CaseListResult {
  suggestions: SearchSuggestions;
  facets: FilterFacets;
  normalizedQuery: string;
  expandedTerms: string[];
}