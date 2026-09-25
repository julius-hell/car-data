"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { TodayDateInput } from "@/components/assignments/today-date-input";
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
import type { DuePrecision } from "@/lib/due";

import type { CompletionState as State } from "@/lib/completion-form";

export type CompletionDefaults = {
  completedOn: string;
  odometer: number | null;
  result: string | null;
  provider: string | null;
  costCents: number | null;
  note: string | null;
  licenceClasses: string | null;
  licenceExpiresOn: string | null;
};

// Records a completion, or edits one when `defaults` is given. Car intervals
// ask for odometer and result; licence checks for classes and expiry.
export function CompletionDialog({
  action,
  name,
  kind,
  precision,
  hasKm,
  defaults,
  triggerLabel,
  triggerAriaLabel,
}: {
  action: (previous: State, formData: FormData) => Promise<State>;
  name: string;
  kind: "car" | "licence" | "driver";
  precision: DuePrecision;
  hasKm: boolean;
  defaults?: CompletionDefaults;
  triggerLabel: string;
  triggerAriaLabel: string;
}) {
  const t = useTranslations("Completions");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<State, FormData>(action, { status: "idle" });
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }
  const cost = defaults?.costCents != null ? (defaults.costCents / 100).toFixed(2) : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant={defaults ? "ghost" : "outline"} size="sm" aria-label={triggerAriaLabel} />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{defaults ? t("editTitle", { name }) : t("recordTitle", { name })}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="completion-date">{t("date")}</Label>
              {defaults ? (
                <Input id="completion-date" name="completedOn" type="date" defaultValue={defaults.completedOn} />
              ) : (
                <TodayDateInput id="completion-date" name="completedOn" />
              )}
            </div>
            {kind === "car" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="completion-odometer">{t("odometer")}</Label>
                <Input
                  id="completion-odometer"
                  name="odometer"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={defaults?.odometer ?? ""}
                />
              </div>
            )}
            {kind === "car" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="completion-result">{t("result")}</Label>
                <NativeSelect id="completion-result" name="result" defaultValue={defaults?.result ?? "passed"}>
                  {(["passed", "minor_defects", "major_defects"] as const).map((result) => (
                    <option key={result} value={result}>
                      {t(`results.${result}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            {kind === "licence" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="completion-classes">{t("licenceClasses")}</Label>
                  <Input
                    id="completion-classes"
                    name="licenceClasses"
                    placeholder="B, BE"
                    defaultValue={defaults?.licenceClasses ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="completion-expiry">{t("licenceExpiresOn")}</Label>
                  <Input
                    id="completion-expiry"
                    name="licenceExpiresOn"
                    type="date"
                    defaultValue={defaults?.licenceExpiresOn ?? ""}
                  />
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="completion-provider">{kind === "car" ? t("provider") : t("checkedBy")}</Label>
              <Input id="completion-provider" name="provider" maxLength={200} defaultValue={defaults?.provider ?? ""} />
            </div>
            {kind === "car" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="completion-cost">{t("cost")}</Label>
                <Input id="completion-cost" name="cost" inputMode="decimal" defaultValue={cost} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="completion-note">{t("note")}</Label>
            <Input id="completion-note" name="note" maxLength={200} defaultValue={defaults?.note ?? ""} />
          </div>
          {kind !== "licence" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="completion-files">{defaults ? t("addFiles") : t("files")}</Label>
              <Input
                id="completion-files"
                name="files"
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.heic"
              />
              <p className="text-muted-foreground text-xs">{t("filesHint")}</p>
            </div>
          )}
          <fieldset className="flex flex-col gap-3 border-t pt-4">
            <legend className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
              {t("overrideTitle")}
            </legend>
            <p className="text-muted-foreground text-xs">{t("overrideHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="completion-override">
                  {precision === "month" ? t("overrideMonth") : t("overrideDate")}
                </Label>
                <Input id="completion-override" name="overrideDueOn" type={precision === "month" ? "month" : "date"} />
              </div>
              {hasKm && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="completion-override-km">{t("overrideOdometer")}</Label>
                  <Input id="completion-override-km" name="overrideDueOdometer" type="number" min={0} />
                </div>
              )}
            </div>
          </fieldset>
          {state.status === "error" && (
            <FormMessage kind="error" testId="completion-error">
              {t(state.message)}
            </FormMessage>
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
