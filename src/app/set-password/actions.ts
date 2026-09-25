"use server";

import { APIError } from "better-auth/api";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { authErrorKey } from "@/lib/auth-errors";

export type SetPasswordState = { status: "idle" } | { status: "error"; message: string };

export async function setPassword(token: string, _previous: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  try {
    await auth.api.resetPassword({ body: { token, newPassword: String(formData.get("password") ?? "") } });
  } catch (error) {
    if (error instanceof APIError) {
      const code = (error.body as { code?: string } | undefined)?.code;
      return { status: "error", message: code === "INVALID_TOKEN" ? "errorInvalidLink" : authErrorKey(code) };
    }
    throw error;
  }
  redirect("/login?passwordSet=1");
}
