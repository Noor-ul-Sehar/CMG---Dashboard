import { db, queryOne } from "@/lib/db/client";
import { statusLabel } from "@/lib/constants";

export class ReviewValidationError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super("Invalid review input.");
    this.errors = errors;
  }
}

export const REVIEW_CHOICES = [
  "pending_review",
  "reviewed",
  "approved",
  "rejected",
] as const;

export function validateReview(input: {
  reviewStatus?: unknown;
  reviewComment?: unknown;
}): { status: string; comment: string } {
  const errors: Record<string, string> = {};

  const status = String(input.reviewStatus ?? "").trim();
  if (!REVIEW_CHOICES.includes(status as (typeof REVIEW_CHOICES)[number])) {
    errors.reviewStatus = "Please select a valid review status.";
  }

  const comment = String(input.reviewComment ?? "").trim();
  if (comment.length > 4000) {
    errors.reviewComment = "Review comment must be 4000 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    throw new ReviewValidationError(errors);
  }
  return { status, comment };
}

/**
 * Adds a review to a case and records a `review_added` activity entry.
 * Each review is appended — previous reviews are never modified.
 */
export async function addReview(
  caseId: number,
  userId: number,
  reviewStatus: string,
  reviewComment: string
): Promise<void> {
  const exists = await queryOne<{ id: number }>(
    `SELECT id FROM cases WHERE id = $1`,
    [caseId]
  );
  if (!exists) {
    throw new Error("Case not found");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO reviews (case_id, reviewer_id, review_status, review_comment, reviewed_at)
       VALUES ($1, $2, $3::review_status, NULLIF($4, ''), NOW())`,
      [caseId, userId, reviewStatus, reviewComment]
    );
    await client.query(
      `INSERT INTO activity_logs (case_id, user_id, action, description)
       VALUES ($1, $2, 'review_added', $3)`,
      [
        caseId,
        userId,
        reviewComment
          ? `Review (${statusLabel(reviewStatus)}): ${reviewComment.slice(0, 80)}`
          : `Review marked as ${statusLabel(reviewStatus)}`,
      ]
    );
    await client.query(`UPDATE cases SET last_updated = NOW() WHERE id = $1`, [caseId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}