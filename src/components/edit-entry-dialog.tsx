"use client";

import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { updateMileageEntry, type EditEntryState } from "@/app/(protected)/cars/[carId]/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";

export function EditEntryDialog({
  entry,
  label,
}: {
  entry: { id: string; odometer: number; recordedAt: string; note: string | null };
  label: string;
}) {
  const t = useTranslations("Entry");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<EditEntryState, FormData>(
    updateMileageEntry.bind(null, entry.id),
    { status: "idle" },
  );
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={label} />}
      >
        <PencilIcon className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <ActionForm action={action} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-odometer-${entry.id}`}>{t("odometer", { unit: "km" })}</Label>
              <Input
                id={`edit-odometer-${entry.id}`}
                name="odometer"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={entry.odometer}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-date-${entry.id}`}>{t("date")}</Label>
              <Input id={`edit-date-${entry.id}`} name="recordedAt" type="date" defaultValue={entry.recordedAt} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-note-${entry.id}`}>{t("note")}</Label>
            <Input id={`edit-note-${entry.id}`} name="note" maxLength={200} defaultValue={entry.note ?? ""} />
          </div>
          {state.status === "error" && (
            <FormMessage kind="error" testId="edit-entry-error">
              {t(state.message, { max: 200 })}
            </FormMessage>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
