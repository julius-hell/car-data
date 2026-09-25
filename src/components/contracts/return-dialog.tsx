"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { recordReturnAction, type ReturnState } from "@/app/(protected)/cars/[carId]/contract-actions";
import { TodayDateInput } from "@/components/assignments/today-date-input";
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
import { ActionForm } from "@/components/action-form";

export function ReturnDialog({ carId }: { carId: string }) {
  const t = useTranslations("Contracts");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReturnState, FormData>(recordReturnAction.bind(null, carId), {
    status: "idle",
  });
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("recordReturn")}</DialogTrigger>
      <DialogContent>
        <ActionForm action={action} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("returnTitle")}</DialogTitle>
            <DialogDescription>{t("returnDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="return-date">{t("returnedOn")}</Label>
              <TodayDateInput id="return-date" name="returnedOn" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="return-odometer">{t("returnOdometer")}</Label>
              <Input id="return-odometer" name="returnOdometer" type="number" inputMode="numeric" min={0} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-notes">{t("returnNotes")}</Label>
            <textarea
              id="return-notes"
              name="returnNotes"
              rows={3}
              maxLength={2000}
              className="border-input bg-background rounded-md border px-3 py-2 text-sm shadow-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-photos">{t("returnPhotos")}</Label>
            <Input id="return-photos" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,.heic,application/pdf" />
          </div>
          {state.status === "error" && (
            <FormMessage kind="error" testId="return-error">
              {t(state.message)}
            </FormMessage>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {t("recordReturn")}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
