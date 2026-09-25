"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [sent, action, pending] = useActionState(requestPasswordReset, false);

  if (sent) {
    return (
      <FormMessage kind="success" testId="reset-requested">
        {t("resetRequested")}
      </FormMessage>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("sending") : t("sendResetLink")}
      </Button>
    </form>
  );
}
