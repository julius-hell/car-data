"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createOrganization, type CreateOrganizationState } from "@/app/(protected)/operator/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";

export function NewOrganizationForm() {
  const t = useTranslations("Operator");
  const [state, action, pending] = useActionState<CreateOrganizationState, FormData>(createOrganization, {
    status: "idle",
  });

  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org-name">{t("organizationName")}</Label>
        <Input id="org-name" name="name" maxLength={100} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-name">{t("adminName")}</Label>
          <Input id="admin-name" name="adminName" maxLength={64} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-email">{t("adminEmail")}</Label>
          <Input id="admin-email" name="adminEmail" type="email" required />
        </div>
      </div>
      {state.status === "error" && (
        <FormMessage kind="error" testId="organization-error">
          {t(state.message)}
        </FormMessage>
      )}
      <Button type="submit" disabled={pending} className="sm:self-start">
        {pending ? t("creating") : t("create")}
      </Button>
    </ActionForm>
  );
}
