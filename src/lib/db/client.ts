import { Pool } from "pg";

const globalForDb = globalThis as unknown as { cmgPool?: Pool };

export const db =
  globalForDb.cmgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.cmgPool = db;

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await db.query(text, params as never[]);
  return result.rows as T[];
}

export async function queryOne<T>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}