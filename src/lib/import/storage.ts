import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DIR = process.env.IMPORT_TMP_DIR ?? "/tmp/cmg-imports";

export interface StoredImportFile {
  filename: string;
  headers: string[];
  rows: Record<string, unknown>[];
  mapping: Record<string, string> | null;
  truncated: boolean;
}

async function ensureDir() {
  await fs.mkdir(DIR, { recursive: true });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function filePath(token: string) {
  // Tokens are always server-generated UUIDs; reject anything else so a
  // client-supplied token can never escape the temp directory (traversal).
  if (!UUID_RE.test(token)) {
    throw new Error("Invalid import token.");
  }
  return path.join(DIR, `${token}.json`);
}

export function newImportToken(): string {
  return crypto.randomUUID();
}

export async function writeImportFile(
  token: string,
  data: StoredImportFile
): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(token), JSON.stringify(data), "utf8");
}

export async function readImportFile(token: string): Promise<StoredImportFile | null> {
  try {
    const raw = await fs.readFile(filePath(token), "utf8");
    return JSON.parse(raw) as StoredImportFile;
  } catch {
    return null;
  }
}

export async function updateImportFile(
  token: string,
  patch: Partial<StoredImportFile>
): Promise<void> {
  const current = await readImportFile(token);
  if (!current) throw new Error("Import session not found.");
  await writeImportFile(token, { ...current, ...patch });
}

export async function removeImportFile(token: string): Promise<void> {
  try {
    await fs.unlink(filePath(token));
  } catch {
    // ignore
  }
}