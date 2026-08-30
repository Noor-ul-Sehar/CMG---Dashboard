import { query, queryOne } from "@/lib/db/client";
import type { CustomRecordal, CustomRecordalInput } from "@/types";

const MAX_LENGTH = 100;

export class CustomRecordalValidationError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super("Validation failed.");
    this.name = "CustomRecordalValidationError";
    this.errors = errors;
  }
}

export function validateCustomRecordalInput(
  input: {
    recordalDate?: unknown;
    clientRef?: unknown;
    cmgRef?: unknown;
    brand?: unknown;
  },
  { requireAll = true }: { requireAll?: boolean } = {}
): CustomRecordalInput {
  const errors: Record<string, string> = {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const recordalDate = str(input.recordalDate);
  const clientRef = str(input.clientRef);
  const cmgRef = str(input.cmgRef);
  const brand = str(input.brand);

  if (input.recordalDate !== undefined && recordalDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(recordalDate)) {
      errors.recordalDate = "Recordal Date must be a valid date (YYYY-MM-DD).";
    } else {
      const d = new Date(`${recordalDate}T00:00:00Z`);
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== recordalDate) {
        errors.recordalDate = "Recordal Date must be a valid date.";
      }
    }
  }

  if (requireAll || input.clientRef !== undefined) {
    if (!clientRef) errors.clientRef = "Client Reference # is required.";
    else if (clientRef.length > MAX_LENGTH)
      errors.clientRef = `Client Reference # is too long (max ${MAX_LENGTH} characters).`;
  }
  if (requireAll || input.cmgRef !== undefined) {
    if (!cmgRef) errors.cmgRef = "CMG Reference # is required.";
    else if (cmgRef.length > MAX_LENGTH)
      errors.cmgRef = `CMG Reference # is too long (max ${MAX_LENGTH} characters).`;
  }
  if (requireAll || input.brand !== undefined) {
    if (!brand) errors.brand = "Brand is required.";
    else if (brand.length > MAX_LENGTH)
      errors.brand = `Brand is too long (max ${MAX_LENGTH} characters).`;
  }

  if (Object.keys(errors).length > 0) {
    throw new CustomRecordalValidationError(errors);
  }

  return {
    recordalDate: recordalDate || null,
    clientRef,
    cmgRef,
    brand,
  };
}

export async function listCustomRecordals(): Promise<CustomRecordal[]> {
  return query<CustomRecordal>(
    `SELECT id, to_char(recordal_date, 'YYYY-MM-DD') AS "recordalDate",
            client_reference_number AS "clientRef", cmg_reference_number AS "cmgRef", brand,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM custom_recordals
     ORDER BY created_at DESC, id DESC`
  );
}

export async function getCustomRecordalById(
  id: number
): Promise<CustomRecordal | null> {
  return queryOne<CustomRecordal>(
    `SELECT id, to_char(recordal_date, 'YYYY-MM-DD') AS "recordalDate",
            client_reference_number AS "clientRef", cmg_reference_number AS "cmgRef", brand,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM custom_recordals
     WHERE id = $1`,
    [id]
  );
}

export async function createCustomRecordal(
  input: CustomRecordalInput
): Promise<CustomRecordal> {
  const row = await queryOne<CustomRecordal>(
    `INSERT INTO custom_recordals (recordal_date, client_reference_number, cmg_reference_number, brand)
     VALUES ($1, $2, $3, $4)
     RETURNING id, to_char(recordal_date, 'YYYY-MM-DD') AS "recordalDate",
               client_reference_number AS "clientRef", cmg_reference_number AS "cmgRef", brand,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [input.recordalDate, input.clientRef, input.cmgRef, input.brand]
  );
  if (!row) throw new Error("Failed to create the custom recordal.");
  return row;
}

export async function updateCustomRecordal(
  id: number,
  input: CustomRecordalInput
): Promise<CustomRecordal> {
  const row = await queryOne<CustomRecordal>(
    `UPDATE custom_recordals
     SET recordal_date = $1, client_reference_number = $2, cmg_reference_number = $3, brand = $4
     WHERE id = $5
     RETURNING id, to_char(recordal_date, 'YYYY-MM-DD') AS "recordalDate",
               client_reference_number AS "clientRef", cmg_reference_number AS "cmgRef", brand,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [input.recordalDate, input.clientRef, input.cmgRef, input.brand, id]
  );
  if (!row) throw new CustomRecordalNotFoundError();
  return row;
}

export class CustomRecordalNotFoundError extends Error {
  constructor() {
    super("Custom recordal not found.");
    this.name = "CustomRecordalNotFoundError";
  }
}

export async function deleteCustomRecordal(id: number): Promise<void> {
  const result = await query<{ id: number }>(
    `DELETE FROM custom_recordals WHERE id = $1 RETURNING id`,
    [id]
  );
  if (result.length === 0) throw new CustomRecordalNotFoundError();
}