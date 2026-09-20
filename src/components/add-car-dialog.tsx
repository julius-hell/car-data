"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createCar } from "@/app/(protected)/cars/actions";
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
import { UNITS } from "@/lib/db/schema";

function SubmitButton() {
  const t = useTranslations("Cars");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("adding") : t("addCar")}
    </Button>
  );
}

export function AddCarDialog() {
  const t = useTranslations("Cars");
  const [open, setOpen] = useState(false);

  async function submit(formData: FormData) {
    await createCar(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>{t("addCar")}</DialogTrigger>
      <DialogContent>
        <form action={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="car-name">{t("name")}</Label>
            <Input
              id="car-name"
              name="name"
              maxLength={64}
              placeholder={t("namePlaceholder")}
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="car-unit">{t("unit")}</Label>
            <select
              id="car-unit"
              name="unit"
              defaultValue="km"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
