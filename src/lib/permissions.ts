import type { SessionUser, UserRole } from "@/types";

export type Capability =
  | "cases.view"
  | "cases.create"
  | "cases.edit"
  | "cases.assign"
  | "cases.updateReporting"
  | "remarks.add"
  | "reviews.add"
  | "documents.upload"
  | "documents.delete"
  | "import"
  | "export"
  | "teams.manage"
  | "investigators.manage"
  | "users.manage"
  | "reports.view"
  | "customRecordals.view"
  | "customRecordals.manage";

const ALL_CAPABILITIES: Capability[] = [
  "cases.view",
  "cases.create",
  "cases.edit",
  "cases.assign",
  "cases.updateReporting",
  "remarks.add",
  "reviews.add",
  "documents.upload",
  "documents.delete",
  "import",
  "export",
  "teams.manage",
  "investigators.manage",
  "users.manage",
  "reports.view",
  "customRecordals.view",
  "customRecordals.manage",
];

const ROLE_CAPABILITIES: Record<UserRole, Capability[]> = {
  admin: ALL_CAPABILITIES,
  manager: [
    "cases.view",
    "cases.create",
    "cases.edit",
    "cases.assign",
    "cases.updateReporting",
    "remarks.add",
    "reviews.add",
    "documents.upload",
    "documents.delete",
    "import",
    "export",
    "teams.manage",
    "investigators.manage",
    "reports.view",
    "customRecordals.view",
    "customRecordals.manage",
  ],
  team_member: [
    "cases.view",
    "cases.create",
    "cases.edit",
    "cases.assign",
    "remarks.add",
    "documents.upload",
    "reports.view",
    "customRecordals.view",
  ],
  reporting: [
    "cases.view",
    "cases.updateReporting",
    "remarks.add",
    "export",
    "reports.view",
    "customRecordals.view",
  ],
  viewer: ["cases.view", "reports.view", "customRecordals.view"],
};

export function capabilitiesForRole(role: UserRole): Capability[] {
  return ROLE_CAPABILITIES[role] ?? [];
}

/** Role-level capability check. */
export function roleHasCapability(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

/** User-level capability check. */
export function can(user: Pick<SessionUser, "role">, capability: Capability): boolean {
  return roleHasCapability(user.role, capability);
}

export function canManageTeams(user: Pick<SessionUser, "role">): boolean {
  return can(user, "teams.manage") && can(user, "investigators.manage");
}

export function canManageUsers(user: Pick<SessionUser, "role">): boolean {
  return can(user, "users.manage");
}

/** Whether a given role may delete case documents. */
export function canDeleteDocuments(role: UserRole): boolean {
  return roleHasCapability(role, "documents.delete");
}

/** Used by the profile page to decide which actions to render. */
export function profileCapabilities(user: Pick<SessionUser, "role">) {
  return {
    canEditCase: can(user, "cases.edit"),
    canAddRemark: can(user, "remarks.add"),
    canAddReview: can(user, "reviews.add"),
    canUploadDocument: can(user, "documents.upload"),
    canDeleteDocument: can(user, "documents.delete"),
  };
}