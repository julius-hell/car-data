"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient, authErrorKey } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const t = useTranslations("Auth");
  const [status, setStatus] = useState<{ ok: boolean; key: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus(null);
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get("currentPassword") ?? ""),
      newPassword: String(form.get("newPassword") ?? ""),
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      setStatus({ ok: false, key: authErrorKey(error.code) });
      return;
    }
    formElement.reset();
    setStatus({ ok: true, key: "passwordChanged" });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
        <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
      </div>
      {status && (
        <p
          role={status.ok ? "status" : "alert"}
          data-testid="password-status"
          className={status.ok ? "text-sm text-emerald-700 dark:text-emerald-400" : "text-destructive text-sm"}
        >
          {t(status.key)}
        </p>
      )}
      <Button type="submit" disabled={pending} className="sm:self-start">
        {pending ? t("saving") : t("changePassword")}
      </Button>
    </form>
  );
}
