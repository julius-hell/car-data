"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { authClient, authErrorKey } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";

type ChangePasswordState = { status: "idle" } | { status: "saved" } | { status: "error"; message: string };

// Runs in the browser: changing the password replaces this session's cookie,
// which a server render in the same request wouldn't see yet. React renders
// client form actions so the form can't be submitted natively before
// hydration, so no password ends up in a URL.
async function changePassword(_previous: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const { error } = await authClient.changePassword({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    revokeOtherSessions: true,
  });
  return error ? { status: "error", message: authErrorKey(error.code) } : { status: "saved" };
}

export function ChangePasswordForm() {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, {
    status: "idle",
  });
  // Clear the fields after a successful change.
  const [formKey, setFormKey] = useState(0);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setFormKey((key) => key + 1);
  }

  return (
    <ActionForm action={action} className="flex flex-col gap-3" noValidate key={formKey}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
        <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
      </div>
      {state.status !== "idle" && (
        <p
          role={state.status === "saved" ? "status" : "alert"}
          data-testid="password-status"
          className={
            state.status === "saved" ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-destructive text-sm"
          }
        >
          {t(state.status === "saved" ? "passwordChanged" : state.message)}
        </p>
      )}
      <Button type="submit" disabled={pending} className="sm:self-start">
        {pending ? t("saving") : t("changePassword")}
      </Button>
    </ActionForm>
  );
}
