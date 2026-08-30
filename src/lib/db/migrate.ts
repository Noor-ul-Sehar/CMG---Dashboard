import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "./client.ts";

async function migrate() {
  const sql = readFileSync(path.join(process.cwd(), "src/lib/db/schema.sql"), "utf8");
  await db.query(sql);
  console.log("Schema applied successfully.");
  await db.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});