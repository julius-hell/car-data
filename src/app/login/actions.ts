"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { authErrorKey } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/next-path";

export type SignInState = { status: "idle" } | { status: "error"; message: string };

// A server action, so the form posts even before the page has hydrated and a
// password never ends up in a URL.
export async function signIn(next: string, _previous: SignInState, formData: FormData): Promise<SignInState> {
  try {
    await auth.api.signInEmail({
      body: { email: normalizeEmail(formData.get("email")), password: String(formData.get("password") ?? "") },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { status: "error", message: authErrorKey((error.body as { code?: string } | undefined)?.code) };
    }
    throw error;
  }
  redirect(safeNextPath(next) ?? "/");
}
