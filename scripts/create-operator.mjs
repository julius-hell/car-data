#!/usr/bin/env node
// Creates a platform operator and prints a one-time link to set their
// password. Running it again for an existing operator issues a new link.
//
//   pnpm operator:create --email ops@example.com --name "Ops"
//   docker compose exec app node scripts/create-operator.mjs --email ... --name ...
//
// Plain JavaScript with only `pg`, so it also runs inside the production image.
import { randomBytes, randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import pg from "pg";

const LINK_TTL_MS = 24 * 60 * 60 * 1000;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});
const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Pass --email with a valid address.");
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");
const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  const existing = await client.query(
    'select id, is_operator from "user" where lower(email) = $1',
    [email],
  );
  let userId;
  if (existing.rows.length > 0) {
    if (!existing.rows[0].is_operator) fail(`${email} already has an account that is not an operator.`);
    userId = existing.rows[0].id;
  } else {
    if (!name) fail("Pass --name for a new operator.");
    userId = randomUUID();
    await client.query(
      `insert into "user" (id, name, email, email_verified, is_operator, created_at, updated_at)
       values ($1, $2, $3, false, true, now(), now())`,
      [userId, name, email],
    );
  }
  // Better Auth's reset-password endpoint consumes this and creates the
  // password credential when the user has none yet.
  const token = randomBytes(24).toString("base64url");
  await client.query(
    `insert into verification (id, identifier, value, expires_at, created_at, updated_at)
     values ($1, $2, $3, $4, now(), now())`,
    [randomUUID(), `reset-password:${token}`, userId, new Date(Date.now() + LINK_TTL_MS)],
  );
  await client.query("commit");
  console.log(`Set the operator password within 24 hours:\n${new URL(`/set-password?token=${token}`, baseUrl)}`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
