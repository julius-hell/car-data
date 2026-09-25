"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { renameOrganizationAction, type RenameState } from "@/app/(protected)/team/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RenameOrganizationForm({ name }: { name: string }) {
  const t = useTranslations("Team");
  const [state, action, pending] = useActionState<RenameState, FormData>(renameOrganizationAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="organization-name">{t("organizationName")}</Label>
        <Input id="organization-name" name="name" defaultValue={name} maxLength={100} />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {t("rename")}
      </Button>
      {state.status === "error" && <FormMessage kind="error">{t("errorOrganizationName")}</FormMessage>}
      {state.status === "saved" && <FormMessage kind="success">{t("renamed")}</FormMessage>}
    </form>
  );
}
