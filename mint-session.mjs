import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import pg from "pg";

const SESSION_TTL_SECONDS = 8 * 3600;
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

const jti = randomUUID();
const iat = Math.floor(Date.now() / 1000);
const exp = iat + SESSION_TTL_SECONDS;

const token = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("1")
  .setJti(jti)
  .setIssuedAt(iat)
  .setExpirationTime(exp)
  .sign(secret);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(
  `INSERT INTO sessions (user_id, token_id, expires_at)
   VALUES ($1, $2, to_timestamp($3))`,
  [1, jti, exp]
);
await pool.end();

console.log(`cmg_session=${token}`);