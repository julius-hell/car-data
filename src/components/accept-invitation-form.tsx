"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  acceptInvitation,
  acceptInvitationWithAccount,
  type AcceptInvitationState,
} from "@/app/invite/[invitationId]/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AcceptInvitationForm({
  invitationId,
  name,
  email,
  hasAccount,
  proof,
}: {
  invitationId: string;
  name: string;
  email: string;
  hasAccount: boolean;
  proof: string | null;
}) {
  const t = useTranslations("Invite");
  const tAuth = useTranslations("Auth");
  const [state, action, pending] = useActionState<AcceptInvitationState, FormData>(
    (hasAccount ? acceptInvitationWithAccount : acceptInvitation).bind(null, invitationId),
    { status: "idle" },
  );

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {proof && <input type="hidden" name="proof" value={proof} />}
      {hasAccount ? (
        <p className="text-muted-foreground text-sm" data-testid="invite-existing-account">
          {t("existingAccount")}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{tAuth("name")}</Label>
          <Input id="name" name="name" defaultValue={name} maxLength={64} autoComplete="name" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{tAuth("email")}</Label>
        <Input id="email" value={email} readOnly autoComplete="username" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{tAuth("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={hasAccount ? "current-password" : "new-password"}
        />
        {!hasAccount && <p className="text-muted-foreground text-xs">{tAuth("passwordHint")}</p>}
      </div>
      {state.status === "error" && (
        <FormMessage kind="error" testId="invite-error">
          {t(state.message)}
        </FormMessage>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("joining") : t("join")}
      </Button>
    </form>
  );
}
