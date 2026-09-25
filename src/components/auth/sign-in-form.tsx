"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";

export function SignInForm({ next = "/" }: { next?: string }) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn.bind(null, next), {
    status: "idle",
  });

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle>{t("signInTitle")}</CardTitle>
        <CardDescription>{t("signInDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={action} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state.status === "error" && (
            <p role="alert" data-testid="auth-error" className="text-destructive text-sm">
              {t(state.message)}
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t("signingIn") : t("signInButton")}
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
