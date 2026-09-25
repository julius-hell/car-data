import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { resetPasswordEmail, verifyEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";

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
    // Only verified addresses get reset links, so a mistyped email in an
    // invitation can't be used to take over the account. Better Auth answers
    // the request the same way either way.
    sendResetPassword: async ({ user, url }) => {
      if (!user.emailVerified) return;
      await sendMail(
        await resetPasswordEmail({ to: user.email, name: user.name, url, locale: (user as { locale?: string }).locale }),
      );
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail(
        await verifyEmail({ to: user.email, name: user.name, url, locale: (user as { locale?: string }).locale }),
      );
    },
  },
  user: {
    additionalFields: {
      isOperator: { type: "boolean", defaultValue: false, input: false },
      locale: { type: "string", required: false, input: false },
      digestOptIn: { type: "boolean", defaultValue: true, input: false },
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
