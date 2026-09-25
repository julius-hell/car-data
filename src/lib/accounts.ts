import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const NAME_MAX_LENGTH = 64;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isEmail(value: string) {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function passwordProblem(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) return "passwordTooShort" as const;
  if (password.length > PASSWORD_MAX_LENGTH) return "passwordTooLong" as const;
  return null;
}

export async function findUserByEmail(email: string) {
  return db.query.user.findFirst({ where: eq(sql`lower(${user.email})`, normalizeEmail(email)) });
}

// Creates a user with a password credential, the same shape Better Auth's own
// sign-up produces. Public sign-up is disabled, so invitations use this.
export async function createUserWithPassword({
  name,
  email,
  password,
  emailVerified = false,
}: {
  name: string;
  email: string;
  password: string;
  emailVerified?: boolean;
}) {
  const context = await auth.$context;
  const created = await context.internalAdapter.createUser(
    { name, email: normalizeEmail(email), emailVerified },
    { method: "email-password" },
  );
  await context.internalAdapter.createAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: await context.password.hash(password),
  });
  return created;
}

export async function verifyUserPassword(userId: string, password: string) {
  const context = await auth.$context;
  const account = await context.internalAdapter.findCredentialAccount(userId);
  if (!account?.password) return false;
  return context.password.verify({ hash: account.password, password });
}

const RESET_LINK_TTL_MS = 24 * 60 * 60 * 1000;

// A one-time link to /set-password, consumed by Better Auth's reset-password
// endpoint. Used for the operator's first password and for admin-issued resets.
export async function createSetPasswordToken(userId: string) {
  const context = await auth.$context;
  const token = randomBytes(24).toString("base64url");
  await context.internalAdapter.createVerificationValue({
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + RESET_LINK_TTL_MS),
  });
  return token;
}
