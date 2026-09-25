"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { isLocale, LOCALE_COOKIE } from "./config";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) throw new Error("Unsupported locale.");
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // Signed-in people keep the choice on their account, for emails and other devices.
  const session = await getSession();
  if (session) await db.update(user).set({ locale }).where(eq(user.id, session.user.id));
}
