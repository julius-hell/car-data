"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { createCar, updateCar, type CarFormState } from "@/app/(protected)/cars/actions";
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
import type { Car } from "@/lib/db/schema";

type Values = Pick<Car, "licencePlate" | "make" | "model" | "vin" | "firstRegistration" | "costCenter" | "location">;

function Field({
  id,
  name,
  label,
  defaultValue,
  ...props
}: {
  id: string;
  name: keyof Values;
  label: string;
  defaultValue?: string | null;
} & Omit<React.ComponentProps<typeof Input>, "id" | "name" | "defaultValue">) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} defaultValue={defaultValue ?? ""} {...props} />
    </div>
  );
}

// Adds a car, or edits one when `car` is given.
export function CarDialog({ car }: { car?: Values & { id: string } }) {
  const t = useTranslations("Cars");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CarFormState, FormData>(
    car ? updateCar.bind(null, car.id) : createCar,
    { status: "idle" },
  );
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }
  const prefix = car ? "edit-car" : "add-car";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={car ? "outline" : "default"} />}>
        {car ? t("edit") : t("addCar")}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form action={action} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{car ? t("editTitle", { plate: car.licencePlate }) : t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <Field
            id={`${prefix}-plate`}
            name="licencePlate"
            label={t("licencePlate")}
            defaultValue={car?.licencePlate}
            placeholder={t("licencePlatePlaceholder")}
            maxLength={15}
            autoCapitalize="characters"
            autoFocus
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${prefix}-make`} name="make" label={t("make")} defaultValue={car?.make} maxLength={64} />
            <Field id={`${prefix}-model`} name="model" label={t("model")} defaultValue={car?.model} maxLength={64} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${prefix}-vin`}
              name="vin"
              label={t("vin")}
              defaultValue={car?.vin}
              maxLength={17}
              autoCapitalize="characters"
            />
            <Field
              id={`${prefix}-first-registration`}
              name="firstRegistration"
              label={t("firstRegistration")}
              defaultValue={car?.firstRegistration}
              type="date"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${prefix}-cost-center`}
              name="costCenter"
              label={t("costCenter")}
              defaultValue={car?.costCenter}
              maxLength={64}
            />
            <Field
              id={`${prefix}-location`}
              name="location"
              label={t("location")}
              defaultValue={car?.location}
              maxLength={64}
            />
          </div>
          {!car && (
            <fieldset className="flex flex-col gap-3 border-t pt-4">
              <legend className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
                {t("nextDueTitle")}
              </legend>
              <p className="text-muted-foreground text-xs">{t("nextDueHint")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="add-car-next-hu">{t("nextHu")}</Label>
                  <Input id="add-car-next-hu" name="nextHu" type="month" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="add-car-next-uvv">{t("nextUvv")}</Label>
                  <Input id="add-car-next-uvv" name="nextUvv" type="date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="add-car-next-service">{t("nextService")}</Label>
                  <Input id="add-car-next-service" name="nextService" type="date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="add-car-next-service-km">{t("nextServiceKm")}</Label>
                  <Input id="add-car-next-service-km" name="nextServiceKm" type="number" inputMode="numeric" min={0} />
                </div>
              </div>
            </fieldset>
          )}
          {state.status === "error" && (
            <FormMessage kind="error" testId="car-error">
              {t(state.message)}
            </FormMessage>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : car ? t("save") : t("addCar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
