"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { reportDamage, type DamageState } from "@/app/(protected)/damage/actions";
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

export function ReportDamageDialog({ carId }: { carId: string }) {
  const t = useTranslations("Damage");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DamageState, FormData>(reportDamage.bind(null, carId), {
    status: "idle",
  });
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("report")}</DialogTrigger>
      <DialogContent>
        <form action={action} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("reportTitle")}</DialogTitle>
            <DialogDescription>{t("reportDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="damage-date">{t("occurredOn")}</Label>
            <TodayDateInput id="damage-date" name="occurredOn" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="damage-description">{t("description")}</Label>
            <textarea
              id="damage-description"
              name="description"
              rows={4}
              maxLength={2000}
              className="border-input bg-background rounded-md border px-3 py-2 text-sm shadow-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="damage-photos">{t("photos")}</Label>
            <Input
              id="damage-photos"
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,.heic"
            />
            <p className="text-muted-foreground text-xs">{t("photosHint")}</p>
          </div>
          {state.status === "error" && (
            <FormMessage kind="error" testId="damage-error">
              {t(state.message)}
            </FormMessage>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? t("sending") : t("send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
