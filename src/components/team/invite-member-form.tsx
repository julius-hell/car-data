"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { inviteMember, type InviteState } from "@/app/(protected)/team/actions";
import { FormMessage } from "@/components/form-message";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES } from "@/lib/roles";
import { ActionForm } from "@/components/action-form";

export function InviteMemberForm() {
  const t = useTranslations("Team");
  const tRoles = useTranslations("Invitations");
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember, { status: "idle" });

  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate key={state.status === "invited" ? state.name : "form"}>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-name">{t("name")}</Label>
          <Input id="invite-name" name="name" maxLength={64} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-email">{t("email")}</Label>
          <Input id="invite-email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">{t("role")}</Label>
          <NativeSelect id="invite-role" name="role" defaultValue="driver">
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {tRoles(`role.${role}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {state.status === "error" && (
        <FormMessage kind="error" testId="invite-member-error">
          {t(state.message)}
        </FormMessage>
      )}
      {state.status === "invited" && (
        <FormMessage kind="success" testId="invite-member-success">
          {t("invited", { name: state.name })}
        </FormMessage>
      )}
      <Button type="submit" disabled={pending} className="sm:self-start">
        {pending ? t("inviting") : t("invite")}
      </Button>
    </ActionForm>
  );
}
