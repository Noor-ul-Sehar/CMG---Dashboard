import { query, queryOne } from "@/lib/db/client";

export interface TeamRow {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  caseCount: number;
}

export interface InvestigatorRow {
  id: number;
  name: string;
  email: string | null;
  teamId: number | null;
  teamName: string | null;
  isActive: boolean;
  caseCount: number;
}

export class OrgValidationError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super("Validation failed");
    this.name = "OrgValidationError";
    this.errors = errors;
  }
}

function isDuplicate(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
}

function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateTeamInput(body: Record<string, unknown>, { nameRequired = true } = {}) {
  const errors: Record<string, string> = {};
  const name = normalizeName(body.name);
  if (nameRequired && !name) {
    errors.name = "Team name is required.";
  } else if (name.length > 100) {
    errors.name = "Team name is too long (max 100 characters).";
  }
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
  if (Object.keys(errors).length > 0) throw new OrgValidationError(errors);
  return { name, description, isActive };
}

function validateInvestigatorInput(body: Record<string, unknown>, { nameRequired = true } = {}) {
  const errors: Record<string, string> = {};
  const name = normalizeName(body.name);
  if (nameRequired && !name) {
    errors.name = "Investigator name is required.";
  } else if (name.length > 100) {
    errors.name = "Investigator name is too long (max 100 characters).";
  }
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }
  const teamId =
    body.teamId === null || body.teamId === undefined || body.teamId === ""
      ? null
      : Number(body.teamId);
  if (teamId !== null && (!Number.isInteger(teamId) || teamId <= 0)) {
    errors.teamId = "Invalid team selected.";
  }
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
  if (Object.keys(errors).length > 0) throw new OrgValidationError(errors);
  return { name, email, teamId, isActive };
}

// ------------------------------------------------------------------
// TEAMS
// ------------------------------------------------------------------

export async function listTeamsWithCounts(): Promise<TeamRow[]> {
  return query<TeamRow>(
    `SELECT t.id, t.name, t.description, t.is_active AS "isActive",
            count(c.id)::int AS "caseCount"
     FROM teams t
     LEFT JOIN cases c ON c.team_id = t.id
     GROUP BY t.id
     ORDER BY t.name`
  );
}

export async function createTeam(body: Record<string, unknown>): Promise<{ id: number }> {
  const input = validateTeamInput(body);
  try {
    const result = await query<{ id: number }>(
      `INSERT INTO teams (name, description) VALUES ($1, $2) RETURNING id`,
      [input.name, input.description]
    );
    return result[0];
  } catch (err) {
    if (isDuplicate(err)) {
      throw new OrgValidationError({ name: "A team with this name already exists." });
    }
    throw err;
  }
}

export async function updateTeam(
  id: number,
  body: Record<string, unknown>
): Promise<{ id: number }> {
  const input = validateTeamInput(body);
  const existing = await queryOne<{ id: number }>(`SELECT id FROM teams WHERE id = $1`, [id]);
  if (!existing) throw new OrgValidationError({ name: "Team not found." });

  try {
    await query(
      `UPDATE teams SET name = $1, description = $2, is_active = $3 WHERE id = $4`,
      [input.name, input.description, input.isActive, id]
    );
    return { id };
  } catch (err) {
    if (isDuplicate(err)) {
      throw new OrgValidationError({ name: "A team with this name already exists." });
    }
    throw err;
  }
}

// ------------------------------------------------------------------
// INVESTIGATORS
// ------------------------------------------------------------------

export async function listInvestigatorsWithCounts(): Promise<InvestigatorRow[]> {
  return query<InvestigatorRow>(
    `SELECT i.id, i.name, i.email, i.team_id AS "teamId",
            t.name AS "teamName", i.is_active AS "isActive",
            count(c.id)::int AS "caseCount"
     FROM investigators i
     LEFT JOIN teams t ON t.id = i.team_id
     LEFT JOIN cases c ON c.investigator_id = i.id
     GROUP BY i.id, t.name
     ORDER BY i.name`
  );
}

export async function createInvestigator(
  body: Record<string, unknown>
): Promise<{ id: number }> {
  const input = validateInvestigatorInput(body);
  try {
    const result = await query<{ id: number }>(
      `INSERT INTO investigators (name, email, team_id) VALUES ($1, $2, $3) RETURNING id`,
      [input.name, input.email, input.teamId]
    );
    return result[0];
  } catch (err) {
    if (isDuplicate(err)) {
      throw new OrgValidationError({ name: "An investigator with this name already exists." });
    }
    throw err;
  }
}

export async function updateInvestigator(
  id: number,
  body: Record<string, unknown>
): Promise<{ id: number }> {
  const input = validateInvestigatorInput(body);
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM investigators WHERE id = $1`,
    [id]
  );
  if (!existing) throw new OrgValidationError({ name: "Investigator not found." });

  try {
    await query(
      `UPDATE investigators SET name = $1, email = $2, team_id = $3, is_active = $4 WHERE id = $5`,
      [input.name, input.email, input.teamId, input.isActive, id]
    );
    return { id };
  } catch (err) {
    if (isDuplicate(err)) {
      throw new OrgValidationError({ name: "An investigator with this name already exists." });
    }
    throw err;
  }
}