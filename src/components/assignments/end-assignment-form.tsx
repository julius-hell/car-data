"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { endAssignmentAction, type EndAssignmentState } from "@/app/(protected)/cars/[carId]/assignment-actions";
import { TodayDateInput } from "@/components/assignments/today-date-input";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";

export function EndAssignmentForm({ carId, assignmentId, name }: { carId: string; assignmentId: string; name: string }) {
  const t = useTranslations("Assignments");
  const [state, action, pending] = useActionState<EndAssignmentState, FormData>(
    endAssignmentAction.bind(null, carId, assignmentId),
    { status: "idle" },
  );

  return (
    <ActionForm action={action} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <TodayDateInput name="endsOn" aria-label={t("endOn", { name })} className="w-40" />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {t("end")}
        </Button>
      </div>
      {state.status === "error" && <FormMessage kind="error">{t(state.message)}</FormMessage>}
    </ActionForm>
  );
}
