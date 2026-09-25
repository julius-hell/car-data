"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import type { IntervalFormState } from "@/lib/interval-form";
import { FormMessage } from "@/components/form-message";
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
import type { DuePrecision } from "@/lib/due";
import { ActionForm } from "@/components/action-form";

export function IntervalEditDialog({
  action,
  interval,
}: {
  action: (previous: IntervalFormState, formData: FormData) => Promise<IntervalFormState>;
  interval: {
    id: string;
    name: string;
    precision: DuePrecision;
    hasKm: boolean;
    nextDueOn: string | null;
    nextDueOdometer: number | null;
    periodMonths: number | null;
    periodKm: number | null;
    typePeriodMonths: number;
    typePeriodKm: number | null;
  };
}) {
  const t = useTranslations("Intervals");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<IntervalFormState, FormData>(
    action,
    { status: "idle" },
  );
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }
  const id = (name: string) => `interval-${interval.id}-${name}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" aria-label={t("editLabel", { name: interval.name })} />}>
        {t("edit")}
      </DialogTrigger>
      <DialogContent>
        <ActionForm action={formAction} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{interval.name}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("due")}>{interval.precision === "month" ? t("nextDueMonth") : t("nextDueDate")}</Label>
              <Input
                id={id("due")}
                name="nextDueOn"
                type={interval.precision === "month" ? "month" : "date"}
                defaultValue={
                  interval.nextDueOn
                    ? interval.precision === "month"
                      ? interval.nextDueOn.slice(0, 7)
                      : interval.nextDueOn
                    : ""
                }
              />
            </div>
            {interval.hasKm && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("odometer")}>{t("nextDueOdometer")}</Label>
                <Input
                  id={id("odometer")}
                  name="nextDueOdometer"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={interval.nextDueOdometer ?? ""}
                />
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("months")}>{t("periodMonths")}</Label>
              <Input
                id={id("months")}
                name="periodMonths"
                type="number"
                min={1}
                placeholder={String(interval.typePeriodMonths)}
                defaultValue={interval.periodMonths ?? ""}
              />
            </div>
            {interval.hasKm && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("km")}>{t("periodKm")}</Label>
                <Input
                  id={id("km")}
                  name="periodKm"
                  type="number"
                  min={1}
                  placeholder={interval.typePeriodKm ? String(interval.typePeriodKm) : ""}
                  defaultValue={interval.periodKm ?? ""}
                />
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{t("periodHint")}</p>
          {state.status === "error" && (
            <FormMessage kind="error" testId="interval-error">
              {t(state.message)}
            </FormMessage>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
