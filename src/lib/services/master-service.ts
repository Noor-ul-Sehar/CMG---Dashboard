import { query, queryOne } from "@/lib/db/client";

/** A row in one of the reference/master lists. */
export interface MasterRow {
  id: number;
  name: string;
  isActive: boolean;
  caseCount: number;
}

export class MasterValidationError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super("Validation failed");
    this.name = "MasterValidationError";
    this.errors = errors;
  }
}

export type MasterList =
  | "target_by"
  | "target_natures"
  | "targets"
  | "brands"
  | "clients";

interface MasterConfig {
  label: string;
  table: string;
  /** FROM-table alias is always `m`. */
  countExpr: string;
  /** Extra join (or empty) appended after `FROM <table> m`. */
  join: string;
  /** Label used in duplicate errors. */
  duplicateError: string;
}

const MASTER_CONFIG: Record<MasterList, MasterConfig> = {
  target_by: {
    label: "Target By",
    table: "target_by",
    join: "LEFT JOIN cases c ON c.target_by_id = m.id",
    countExpr: "count(c.id)",
    duplicateError: "A Target By entry with this name already exists.",
  },
  target_natures: {
    label: "Target Nature",
    table: "target_natures",
    join: "LEFT JOIN cases c ON c.target_nature_id = m.id",
    countExpr: "count(c.id)",
    duplicateError: "A target nature with this name already exists.",
  },
  targets: {
    label: "Target",
    table: "targets",
    join: "LEFT JOIN cases c ON c.target_id = m.id",
    countExpr: "count(c.id)",
    duplicateError: "A target with this name already exists.",
  },
  brands: {
    label: "Brand",
    table: "brands",
    join: "LEFT JOIN case_brands cb ON cb.brand_id = m.id",
    countExpr: "count(DISTINCT cb.case_id)",
    duplicateError: "A brand with this name already exists.",
  },
  clients: {
    label: "Client",
    table: "clients",
    join: "LEFT JOIN cases c ON c.client = m.name",
    countExpr: "count(c.id)",
    duplicateError: "A client with this name already exists.",
  },
};

export const MASTER_LIST_KEYS = Object.keys(MASTER_CONFIG) as MasterList[];

function assertList(list: string): MasterConfig {
  const cfg = MASTER_CONFIG[list as MasterList];
  if (!cfg) throw new Error("Unknown master data list.");
  return cfg;
}

function isDuplicate(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
}

function validateInput(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const errors: Record<string, string> = {};
  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length > 100) {
    errors.name = "Name is too long (max 100 characters).";
  }
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
  if (Object.keys(errors).length > 0) throw new MasterValidationError(errors);
  return { name, isActive };
}

/** Lists all rows of a master list with their case reference count. */
export async function listMaster(list: string): Promise<MasterRow[]> {
  const cfg = assertList(list);
  return query<MasterRow>(
    `SELECT m.id, m.name, m.is_active AS "isActive",
            ${cfg.countExpr}::int AS "caseCount"
     FROM ${cfg.table} m ${cfg.join}
     GROUP BY m.id
     ORDER BY m.name`
  );
}

export async function createMaster(
  list: string,
  body: Record<string, unknown>
): Promise<{ id: number }> {
  const cfg = assertList(list);
  const input = validateInput(body);
  try {
    const result = await query<{ id: number }>(
      `INSERT INTO ${cfg.table} (name) VALUES ($1) RETURNING id`,
      [input.name]
    );
    return result[0];
  } catch (err) {
    if (isDuplicate(err)) {
      throw new MasterValidationError({ name: cfg.duplicateError });
    }
    throw err;
  }
}

export async function updateMaster(
  list: string,
  id: number,
  body: Record<string, unknown>
): Promise<{ id: number }> {
  const cfg = assertList(list);
  const input = validateInput(body);
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM ${cfg.table} WHERE id = $1`,
    [id]
  );
  if (!existing) throw new MasterValidationError({ name: "Record not found." });

  try {
    await query(
      `UPDATE ${cfg.table} SET name = $1, is_active = $2 WHERE id = $3`,
      [input.name, input.isActive, id]
    );
    return { id };
  } catch (err) {
    if (isDuplicate(err)) {
      throw new MasterValidationError({ name: cfg.duplicateError });
    }
    throw err;
  }
}

/** Active reference lists used to populate case-form dropdowns. */
export async function listMasterOptions(list: string): Promise<{ id: number; name: string }[]> {
  const cfg = assertList(list);
  return query<{ id: number; name: string }>(
    `SELECT id, name FROM ${cfg.table} WHERE is_active ORDER BY name`
  );
}
