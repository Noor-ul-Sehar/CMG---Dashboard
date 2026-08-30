import { db, queryOne } from "@/lib/db/client";
import { storage } from "@/lib/storage/storage";
import { canDeleteDocuments } from "@/lib/permissions";
import type { CaseDocument, UserRole } from "@/types";

export class DocumentValidationError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super("Invalid document upload.");
    this.errors = errors;
  }
}

export class DocumentNotFoundError extends Error {
  constructor() {
    super("Document not found.");
  }
}

export class PermissionDeniedError extends Error {
  constructor() {
    super("You do not have permission to delete documents.");
  }
}

export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "zip",
  "7z",
]);

/** Minimal magic-byte sniffing for the types we care most about. */
function matchesMagic(extension: string, data: Buffer): boolean {
  const magicChecks: Record<string, Buffer[]> = {
    pdf: [Buffer.from("%PDF-")],
    png: [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    jpg: [Buffer.from([0xff, 0xd8, 0xff])],
    gif: [Buffer.from("GIF8")],
    zip: [Buffer.from("PK")],
    docx: [Buffer.from("PK")],
    xlsx: [Buffer.from("PK")],
  };
  const needles = magicChecks[extension];
  if (!needles) return true; // no sniffing for the rest
  return needles.some((needle) => data.subarray(0, needle.length).equals(needle));
}

function validateFile(file: File, data: Buffer): { name: string; type: string } {
  const errors: Record<string, string> = {};

  const originalName = file.name.trim();
  if (!originalName || originalName === "." || originalName === "..") {
    errors.file = "Please choose a file to upload.";
  }

  if (file.size <= 0) {
    errors.file = "The selected file is empty.";
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    errors.file = `File is too large. Maximum size is ${Math.round(MAX_DOCUMENT_SIZE / 1024 / 1024)} MB.`;
  }

  const extension = originalName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    errors.file =
      "This file type is not allowed. Upload PDF, Office documents, images, CSV/TXT or ZIP archives.";
  }
  if (ALLOWED_EXTENSIONS.has(extension) && !matchesMagic(extension, data)) {
    errors.file = "The file content does not match its file type.";
  }

  if (Object.keys(errors).length > 0) {
    throw new DocumentValidationError(errors);
  }
  return { name: originalName, type: extension };
}

/**
 * Stores a document and records a `document_uploaded` activity entry.
 * Files are written to private storage (not public/). The returned record
 * is safe to return to the client.
 */
export async function uploadCaseDocument(
  caseId: number,
  userId: number,
  file: File,
  description?: string
): Promise<CaseDocument> {
  const exists = await queryOne<{ id: number }>(
    `SELECT id FROM cases WHERE id = $1`,
    [caseId]
  );
  if (!exists) {
    throw new Error("Case not found");
  }

  const data = Buffer.from(await file.arrayBuffer());
  const { name, type } = validateFile(file, data);

  const stored = await storage.save({
    caseId,
    originalName: name,
    mimeType: file.type,
    data,
  });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<CaseDocument>(
      `INSERT INTO case_documents
         (case_id, name, description, file_type, file_size, file_path, uploaded_by)
       VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7)
       RETURNING id, case_id AS "caseId", name, description, file_type AS "fileType",
                 file_size AS "fileSize", reference, file_path AS "filePath",
                 uploaded_by AS "uploadedBy", created_at AS "createdAt"`,
      [caseId, name, description ?? "", type, data.length, stored.relativePath, userId]
    );
    const doc = result.rows[0];

    await client.query(
      `INSERT INTO activity_logs (case_id, user_id, action, description)
       VALUES ($1, $2, 'document_uploaded', $3)`,
      [caseId, userId, `Document uploaded: ${name}`]
    );
    await client.query(`UPDATE cases SET last_updated = NOW() WHERE id = $1`, [caseId]);
    await client.query("COMMIT");
    return doc;
  } catch (err) {
    await client.query("ROLLBACK");
    await storage.remove(stored.relativePath).catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export interface StoredCaseDocument {
  record: CaseDocument;
  data: Buffer;
}

/** Loads a document's metadata and bytes, scoped to a specific case. */
export async function getStoredDocument(
  caseId: number,
  docId: number
): Promise<StoredCaseDocument | null> {
  const record = await queryOne<CaseDocument>(
    `SELECT d.id, d.case_id AS "caseId", d.name, d.description, d.file_type AS "fileType",
            d.file_size AS "fileSize", d.reference, d.file_path AS "filePath",
            d.uploaded_by AS "uploadedBy", u.name AS "uploadedByName",
            d.created_at AS "createdAt"
     FROM case_documents d
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.id = $1 AND d.case_id = $2`,
    [docId, caseId]
  );
  if (!record || !record.filePath) return null;
  const data = await storage.read(record.filePath).catch(() => null);
  if (!data) return null;
  return { record, data };
}

/**
 * Deletes a document. Only permitted roles may delete. Records a
 * `document_deleted` activity entry before the row is removed.
 */
export async function deleteCaseDocument(
  caseId: number,
  docId: number,
  role: UserRole,
  userId: number
): Promise<void> {
  if (!canDeleteDocuments(role)) {
    throw new PermissionDeniedError();
  }

  const record = await queryOne<CaseDocument>(
    `SELECT id, name, file_path AS "filePath" FROM case_documents WHERE id = $1 AND case_id = $2`,
    [docId, caseId]
  );
  if (!record) {
    throw new DocumentNotFoundError();
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO activity_logs (case_id, user_id, action, description)
       VALUES ($1, $2, 'document_deleted', $3)`,
      [caseId, userId, `Document deleted: ${record.name}`]
    );
    await client.query(`DELETE FROM case_documents WHERE id = $1`, [docId]);
    await client.query(`UPDATE cases SET last_updated = NOW() WHERE id = $1`, [caseId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (record.filePath) {
    await storage.remove(record.filePath);
  }
}