import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Storage abstraction for case documents.
 *
 * The case-management UI only ever talks to this interface. The concrete
 * provider can later be swapped for secure private cloud/object storage
 * without touching any UI or API code.
 *
 * Local development uses a private directory OUTSIDE of `public/` so files
 * are never served statically. Every read/write resolves paths inside the
 * base directory and rejects anything that escapes it (path traversal).
 */

export interface StoredFile {
  /** Storage-relative path, safe to persist in case_documents.file_path. */
  relativePath: string;
}

export interface SaveFileInput {
  caseId: number;
  originalName: string;
  mimeType: string;
  data: Buffer;
}

export interface StorageProvider {
  save(input: SaveFileInput): Promise<StoredFile>;
  read(relativePath: string): Promise<Buffer>;
  remove(relativePath: string): Promise<void>;
  stat(relativePath: string): Promise<{ size: number } | null>;
}

const BASE_DIR = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads")
);

function safeResolve(relativePath: string): string {
  const full = path.resolve(BASE_DIR, relativePath);
  if (full !== BASE_DIR && !full.startsWith(BASE_DIR + path.sep)) {
    throw new Error("Invalid file path.");
  }
  return full;
}

/** Strip directories, control characters and anything traversal-like. */
function sanitizeFilename(name: string): string {
  const base = path.basename(name)
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return base === "" || base === "." || base === ".." ? "document" : base;
}

class LocalStorageProvider implements StorageProvider {
  async save(input: SaveFileInput): Promise<StoredFile> {
    const safeName = sanitizeFilename(input.originalName);
    const relativePath = path.join(
      "cases",
      String(input.caseId),
      `${randomUUID()}-${safeName}`
    );
    const full = safeResolve(relativePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, input.data, { flag: "wx" });
    return { relativePath };
  }

  async read(relativePath: string): Promise<Buffer> {
    return fs.readFile(safeResolve(relativePath));
  }

  async remove(relativePath: string): Promise<void> {
    const full = safeResolve(relativePath);
    await fs.unlink(full).catch(() => {
      // Missing physical file is not fatal — the record is what matters.
    });
  }

  async stat(relativePath: string): Promise<{ size: number } | null> {
    try {
      const s = await fs.stat(safeResolve(relativePath));
      return { size: s.size };
    } catch {
      return null;
    }
  }
}

export const storage: StorageProvider = new LocalStorageProvider();