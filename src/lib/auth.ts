import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
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
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
