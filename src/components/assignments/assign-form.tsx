"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { assignDriver, type AssignState } from "@/app/(protected)/cars/[carId]/assignment-actions";
import { TodayDateInput } from "@/components/assignments/today-date-input";
import { FormMessage } from "@/components/form-message";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";

export function AssignForm({ carId, members }: { carId: string; members: { userId: string; name: string }[] }) {
  const t = useTranslations("Assignments");
  const [state, action, pending] = useActionState<AssignState, FormData>(assignDriver.bind(null, carId), {
    status: "idle",
  });

  if (members.length === 0) return <p className="text-muted-foreground text-sm">{t("nobodyToAssign")}</p>;

  return (
    <ActionForm action={action} className="flex flex-col gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-member">{t("driver")}</Label>
          <NativeSelect id="assign-member" name="userId">
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-from">{t("from")}</Label>
          <TodayDateInput id="assign-from" name="startsOn" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-until">{t("untilOptional")}</Label>
          <Input id="assign-until" name="endsOn" type="date" />
        </div>
        <Button type="submit" disabled={pending}>
          {t("assign")}
        </Button>
      </div>
      {state.status === "error" && (
        <FormMessage kind="error" testId="assign-error">
          {t(state.message)}
        </FormMessage>
      )}
    </ActionForm>
  );
}
