import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  rateLimit: {
    // Better Auth rate-limits per IP in production; end-to-end tests all
    // come from one IP, so they switch it off explicitly.
    enabled: process.env.BETTER_AUTH_RATE_LIMIT === "off" ? false : undefined,
  },
  emailAndPassword: {
    enabled: true,
    // Accounts only come from accepted invitations and the operator CLI.
    disableSignUp: true,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    additionalFields: {
      isOperator: { type: "boolean", defaultValue: false, input: false },
    },
  },
  hooks: {
    // Organizations, members and invitations live in the organization
    // plugin's tables but are only written by the app's own server actions,
    // which enforce one organization per user and the role rules.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/organization")) throw new APIError("NOT_FOUND");
    }),
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
