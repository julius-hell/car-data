"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { setPassword, type SetPasswordState } from "@/app/set-password/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";

export function SetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPassword.bind(null, token), {
    status: "idle",
  });

  return (
    <ActionForm action={action} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
        <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
      </div>
      {state.status === "error" && (
        <FormMessage kind="error" testId="auth-error">
          {t(state.message)}
        </FormMessage>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("saving") : t("setPassword")}
      </Button>
    </ActionForm>
  );
}
