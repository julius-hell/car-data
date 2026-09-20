"use client";

import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  createReminder,
  updateReminder,
  type ReminderFormState,
} from "@/app/(protected)/cars/[carId]/reminder-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Reminder, Unit } from "@/lib/db/schema";

type Props = {
  carId: string;
  unit: Unit;
  reminder?: Pick<Reminder, "id" | "title" | "targetOdometer" | "targetDate">;
};

export function ReminderDialog({ carId, unit, reminder }: Props) {
  const t = useTranslations("Reminders");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReminderFormState, FormData>(
    reminder ? updateReminder.bind(null, reminder.id) : createReminder.bind(null, carId),
    { status: "idle" },
  );
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }
  const prefix = reminder ? `reminder-${reminder.id}` : `reminder-new-${carId}`;
  // After a validation error the form has been reset; restore what was typed.
  const values =
    state.status === "error"
      ? state.values
      : {
          title: reminder?.title ?? "",
          targetOdometer: reminder?.targetOdometer?.toString() ?? "",
          targetDate: reminder?.targetDate ?? "",
        };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          reminder ? (
            <Button variant="ghost" size="icon-sm" aria-label={t("editLabel", { title: reminder.title })} />
          ) : (
            <Button variant="outline" size="sm" />
          )
        }
      >
        {reminder ? <PencilIcon className="size-4" /> : t("add")}
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{reminder ? t("editTitle") : t("addTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${prefix}-title`}>{t("title")}</Label>
            <Input
              id={`${prefix}-title`}
              name="title"
              maxLength={80}
              placeholder={t("titlePlaceholder")}
              defaultValue={values.title}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${prefix}-odometer`}>{t("targetOdometer", { unit })}</Label>
              <Input
                id={`${prefix}-odometer`}
                name="targetOdometer"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="font-mono tabular-nums"
                defaultValue={values.targetOdometer}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${prefix}-date`}>{t("targetDate")}</Label>
              <Input
                id={`${prefix}-date`}
                name="targetDate"
                type="date"
                defaultValue={values.targetDate}
              />
            </div>
          </div>
          {state.status === "error" && (
            <p role="alert" data-testid="reminder-error" className="text-destructive text-sm">
              {t(state.message)}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
