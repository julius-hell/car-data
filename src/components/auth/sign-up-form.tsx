"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient, authErrorKey } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const NAME_MAX_LENGTH = 64;

export function SignUpForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<{ key: string; field: "name" | "email" | "password" | null } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setError({ key: "nameRequired", field: "name" });
      return;
    }
    setError(null);
    setPending(true);
    const { error } = await authClient.signUp.email({
      name,
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setPending(false);
      const key = authErrorKey(error.code);
      setError({
        key,
        field: key.startsWith("errorPassword") ? "password" : key === "errorEmailTaken" ? "email" : null,
      });
      return;
    }
    router.push("/");
    router.refresh();
  }

  const fieldError = (field: "name" | "email" | "password") =>
    error?.field === field ? (
      <p role="alert" data-testid={`${field}-error`} className="text-destructive text-sm">
        {t(error.key)}
      </p>
    ) : null;

  return (
    <Card className="w-full max-w-sm shadow-sm">
      <CardHeader>
        <CardTitle>{t("signUpTitle")}</CardTitle>
        <CardDescription>{t("signUpDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" autoComplete="name" maxLength={NAME_MAX_LENGTH} />
            {fieldError("name")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
            {fieldError("email")}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" />
            <p className="text-muted-foreground text-xs">{t("passwordHint")}</p>
            {fieldError("password")}
          </div>
          {error?.field === null && (
            <p role="alert" data-testid="auth-error" className="text-destructive text-sm">
              {t(error.key)}
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t("creating") : t("signUpButton")}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            {t("haveAccount")}{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              {t("signInLink")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
