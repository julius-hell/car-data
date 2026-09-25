"use server";

import { normalizeEmail } from "@/lib/accounts";
import { auth } from "@/lib/auth";

// Always reports success, so the page never reveals which addresses exist.
export async function requestPasswordReset(_previous: boolean, formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  if (email) {
    await auth.api
      .requestPasswordReset({ body: { email, redirectTo: "/set-password" } })
      .catch(() => undefined);
  }
  return true;
}
