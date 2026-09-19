"use client";

import { useRouter } from "next/navigation";
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

const CEREMONY_FAILED =
  "The passkey prompt was cancelled or failed. Please try again.";

export function PasskeyAuthForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"signIn" | "signUp" | null>(null);
  const explicitCeremonyStarted = useRef(false);

  const enterApp = () => router.push("/");

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
      setError(error.message ?? CEREMONY_FAILED);
      return;
    }
    enterApp();
  }

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name to create your account.");
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
      setError(error.message ?? CEREMONY_FAILED);
      return;
    }
    enterApp();
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use the passkey saved on this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="text"
            name="username"
            autoComplete="username webauthn"
            placeholder="Your saved passkeys appear here"
            aria-label="Passkey autofill"
          />
          <Button
            type="button"
            onClick={signIn}
            disabled={pending !== null}
            className="w-full"
          >
            {pending === "signIn" ? "Waiting for passkey…" : "Sign in with passkey"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Pick a name, then register a passkey. No password needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signUp} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display-name">Name</Label>
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
              variant="secondary"
              disabled={pending !== null}
              className="w-full"
            >
              {pending === "signUp" ? "Waiting for passkey…" : "Create account with passkey"}
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
