"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState, useSyncExternalStore } from "react";
import { retireCar, type RetireState } from "@/app/(protected)/cars/actions";
import { FormMessage } from "@/components/form-message";
import { NativeSelect } from "@/components/native-select";
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
import { localIsoDate } from "@/lib/local-date";
import { ActionForm } from "@/components/action-form";

const REASONS = ["sold", "returned", "scrapped", "other"] as const;
const noopSubscribe = () => () => {};

export function RetireCarDialog({ carId, plate }: { carId: string; plate: string }) {
  const t = useTranslations("Cars");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<RetireState, FormData>(retireCar.bind(null, carId), {
    status: "idle",
  });
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }
  // Today depends on the visitor's timezone, so it is only known on the client.
  const today = useSyncExternalStore(noopSubscribe, localIsoDate, () => "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>{t("retire")}</DialogTrigger>
      <DialogContent>
        <ActionForm action={action} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("retireTitle", { plate })}</DialogTitle>
            <DialogDescription>{t("retireDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retired-on">{t("retiredOn")}</Label>
              <Input id="retired-on" name="retiredOn" type="date" defaultValue={today} key={today} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retirement-reason">{t("reason")}</Label>
              <NativeSelect id="retirement-reason" name="reason" defaultValue="sold">
                {REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {t(`reasons.${reason}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          {state.status === "error" && <FormMessage kind="error">{t(state.message)}</FormMessage>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {t("retireConfirm")}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
