"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { authClient, whenPasskeyIdle } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasskeyAuthForm({ next = "/" }: { next?: string }) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"signIn" | "signUp" | null>(null);
  const explicitCeremonyStarted = useRef(false);

  const enterApp = () => router.push(next);

  useEffect(() => {
    if (
      typeof PublicKeyCredential === "undefined" ||
      !PublicKeyCredential.isConditionalMediationAvailable
    ) {
      return;
    }
    let cancelled = false;
    void PublicKeyCredential.isConditionalMediationAvailable().then(
      (available) => {
        if (!available || cancelled || explicitCeremonyStarted.current) return;
        void authClient.signIn.passkey({
          autoFill: true,
          fetchOptions: { onSuccess: enterApp },
        });
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn() {
    setError(null);
    setPending("signIn");
    explicitCeremonyStarted.current = true;
    await whenPasskeyIdle();
    const { error } = await authClient.signIn.passkey();
    setPending(null);
    if (error) {
      setError(t("ceremonyFailed"));
      return;
    }
    enterApp();
  }

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("nameRequired"));
      return;
    }
    setPending("signUp");
    explicitCeremonyStarted.current = true;
    await whenPasskeyIdle();
    const { error } = await authClient.passkey.addPasskey({
      name: trimmed,
      context: trimmed,
      createSession: true,
    });
    setPending(null);
    if (error) {
      setError(error.message ?? t("ceremonyFailed"));
      return;
    }
    enterApp();
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("signInTitle")}</CardTitle>
          <CardDescription>{t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="text"
            name="username"
            autoComplete="username webauthn"
            placeholder={t("autofillPlaceholder")}
            aria-label={t("autofillLabel")}
          />
          <Button
            type="button"
            onClick={signIn}
            disabled={pending !== null}
            className="w-full"
          >
            {pending === "signIn" ? t("waiting") : t("signInButton")}
          </Button>
        </CardContent>
      </Card>

      <div className="text-muted-foreground flex items-center gap-3 text-xs uppercase tracking-wider">
        <span className="bg-border h-px flex-1" />
        {t("divider")}
        <span className="bg-border h-px flex-1" />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("signUpTitle")}</CardTitle>
          <CardDescription>{t("signUpDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signUp} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display-name">{t("name")}</Label>
              <Input
                id="display-name"
                name="displayName"
                autoComplete="name"
                maxLength={64}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={pending !== null}
              className="w-full"
            >
              {pending === "signUp" ? t("waiting") : t("signUpButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" data-testid="auth-error" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
