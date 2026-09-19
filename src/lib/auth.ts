import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const DISPLAY_NAME_MAX_LENGTH = 64;

function parseDisplayName(context: string | null | undefined): string {
  const name = context?.trim() ?? "";
  if (name.length === 0 || name.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new APIError("BAD_REQUEST", {
      message: `Enter a name between 1 and ${DISPLAY_NAME_MAX_LENGTH} characters.`,
    });
  }
  return name;
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  plugins: [
    passkey({
      rpID: process.env.PASSKEY_RP_ID,
      rpName: process.env.PASSKEY_RP_NAME,
      origin: process.env.BETTER_AUTH_URL,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
      registration: {
        requireSession: false,
        // Runs before the ceremony for signed-out visitors. The id only becomes
        // the WebAuthn user handle; the account itself is created afterwards so
        // a cancelled ceremony leaves nothing behind.
        resolveUser: async ({ context }) => {
          const name = parseDisplayName(context);
          return { id: crypto.randomUUID(), name, displayName: name };
        },
        afterVerification: async ({ ctx, user }) => {
          const existing = await ctx.context.internalAdapter.findUserById(user.id);
          if (existing) return;
          // Better Auth requires a unique email on every user; this app never
          // collects one, so store an unroutable placeholder.
          const created = await ctx.context.internalAdapter.createUser(
            {
              name: user.name,
              email: `${crypto.randomUUID()}@passkey.invalid`,
              emailVerified: false,
            },
            { method: "passkey" },
          );
          return { userId: created.id };
        },
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
