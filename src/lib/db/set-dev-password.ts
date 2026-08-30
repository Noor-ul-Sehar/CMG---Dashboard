/**
 * Dev-only helper: sets a password for a user and marks it as
 * must-change-on-next-login. The password is read from the
 * DEV_ADMIN_PASSWORD environment variable — never hardcoded.
 *
 * Usage:
 *   node --env-file=.env.local src/lib/db/set-dev-password.ts [email]
 *   (defaults to the admin account admin@cmg.internal)
 */
import { hashPassword } from "../auth/password.ts";
import { queryOne } from "./client.ts";

async function main() {
  const email = (process.argv[2] ?? "admin@cmg.internal").trim().toLowerCase();
  const password = process.env.DEV_ADMIN_PASSWORD;
  if (!password) {
    console.error(
      "DEV_ADMIN_PASSWORD is not set. Add it to .env.local and try again."
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("DEV_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const user = await queryOne<{ id: number }>(
    `SELECT id FROM users WHERE lower(email) = $1`,
    [email]
  );
  if (!user) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await queryOne(
    `UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2`,
    [passwordHash, user.id]
  );
  console.log(
    `Password set for ${email}. Change is required on next login.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});