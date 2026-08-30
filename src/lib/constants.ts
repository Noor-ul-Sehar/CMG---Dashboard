import type {
  CaseStatus,
  RemarkType,
  ReportStatus,
  ReviewStatus,
  UserRole,
} from "@/types";

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "team_member", label: "Team Member" },
  { value: "reporting", label: "Reporting" },
  { value: "viewer", label: "Viewer" },
];

export const CASE_STATUSES: { value: CaseStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "close", label: "Close" },
  { value: "close_1", label: "Close 1" },
];

/** Reporting / approval status — distinct from the operational case status. */
export const APPROVAL_STATUSES: { value: ReportStatus; label: string }[] = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "rejected", label: "Rejected" },
  { value: "approved", label: "Approved" },
];

/** Historical review statuses kept in the reviews table. */
export const REVIEW_STATUSES: { value: ReviewStatus; label: string }[] = [
  { value: "none", label: "None" },
  { value: "pending_review", label: "Pending Review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

/** Statuses offered when recording a new formal review. */
export const REVIEW_FORM_OPTIONS = REVIEW_STATUSES.filter(
  (s) => s.value !== "none"
);

export const REMARK_TYPES: { value: RemarkType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "update", label: "Update" },
  { value: "follow_up", label: "Follow Up" },
  { value: "resolution", label: "Resolution" },
  { value: "escalation", label: "Escalation" },
];

/** Approved CMG Market Case brand master list. */
export const MARKET_CASE_BRANDS: string[] = [
  "ZARA",
  "LEVI'S",
  "UNDER ARMOUR",
  "HUGO BOSS",
  "TORY BURCH",
  "US POLO ASSN.",
  "BEAUTY OF JOSEON",
  "TIRTIR",
  "COSRX",
  "NARS",
];

/** Approved CMG Market Case target nature master list. */
export const MARKET_CASE_TARGET_NATURES: string[] = [
  "Garments",
  "Footwear",
  "Cosmetics",
  "Bags & Accessories",
];

/** People available in the Unilever Target By selection. */
export const UNILEVER_TARGET_BY: string[] = [
  "Muneer",
  "Sir Azeem Ur Rehman",
];

/** Target nature options for Unilever investigations. */
export const UNILEVER_TARGET_NATURES: string[] = [
  "Personal Care",
  "Beauty & Wellbeing",
  "Food & Beverage",
  "Home Care",
  "Garments",
  "Footwear",
  "Cosmetics",
  "Bags & Accessories",
];

/** Approved Unilever brand master list (separate from Market Cases). */
export const UNILEVER_BRANDS: string[] = [
  "Dove",
  "Lifebuoy",
  "Sunsilk",
  "Lux",
  "Surf Excel",
  "Knorr",
  "Lipton",
  "Brooke Bond",
  "Rexona",
  "Vaseline",
  "Closeup",
  "Ponds",
  "Clear",
  "Domex",
  "Cif",
  "Pepsodent",
  "TRESemmé",
  "Hellmann's",
  "Magnum",
  "Ben & Jerry's",
  "Signal",
  "Axe",
  "Lakmé",
  "Fair & Lovely",
  "Rin",
  "Wheel",
  "Comfort",
  "Vim",
  "Cornetto",
  "Clinic Plus",
];

export const statusLabel = (value: string) => {
  const all = [...CASE_STATUSES, ...APPROVAL_STATUSES, ...REVIEW_STATUSES];
  return all.find((s) => s.value === value)?.label ?? value;
};

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  close: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  close_1: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

export const APPROVAL_STATUS_COLORS: Record<ReportStatus, string> = {
  pending_approval: "bg-amber-50 text-amber-700 ring-amber-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  none: "bg-zinc-100 text-zinc-500 ring-zinc-500/20",
  pending_review: "bg-violet-50 text-violet-700 ring-violet-600/20",
  reviewed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
};