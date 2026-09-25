"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { deleteOrganizationAction, type DeleteOrganizationState } from "@/app/(protected)/operator/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteOrganizationForm({ organizationId, name }: { organizationId: string; name: string }) {
  const t = useTranslations("Operator");
  const [state, action, pending] = useActionState<DeleteOrganizationState, FormData>(
    deleteOrganizationAction.bind(null, organizationId),
    { status: "idle" },
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-name">{t("deleteConfirmLabel", { name })}</Label>
        <Input id="confirm-name" name="confirmName" autoComplete="off" />
      </div>
      {state.status === "error" && (
        <FormMessage kind="error" testId="delete-organization-error">
          {t("deleteConfirmMismatch")}
        </FormMessage>
      )}
      <Button type="submit" variant="destructive" disabled={pending} className="sm:self-start">
        {t("deletePermanently")}
      </Button>
    </form>
  );
}
