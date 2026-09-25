"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient, authErrorKey } from "@/lib/auth-client";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({
      token,
      newPassword: String(form.get("password") ?? ""),
    });
    if (error) {
      setPending(false);
      setError(error.code === "INVALID_TOKEN" ? t("errorInvalidLink") : t(authErrorKey(error.code)));
      return;
    }
    router.push("/login?passwordSet=1");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
        <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
      </div>
      {error && (
        <FormMessage kind="error" testId="auth-error">
          {error}
        </FormMessage>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("saving") : t("setPassword")}
      </Button>
    </form>
  );
}
