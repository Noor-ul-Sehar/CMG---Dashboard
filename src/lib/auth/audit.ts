import { query } from "@/lib/db/client";

export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "user_created"
  | "user_updated"
  | "user_deactivated"
  | "user_activated"
  | "role_changed"
  | "password_changed"
  | "password_reset"
  | "session_revoked"
  | "report_exported";

/** Records a security/admin event. Never logs passwords or tokens. */
export async function recordAudit(
  userId: number | null,
  action: AuditAction | string,
  description?: string,
  ipAddress?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, description, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [userId, action, description ?? null, ipAddress ?? null]
    );
  } catch (err) {
    console.error("recordAudit failed:", err);
  }
}