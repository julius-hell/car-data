"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  createIntervalType,
  deleteIntervalType,
  updateIntervalType,
  type DeleteTypeState,
  type TypeFormState,
} from "@/app/(protected)/interval-types/actions";
import { FormMessage } from "@/components/form-message";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TypeValues = {
  id: string;
  name: string;
  builtIn: boolean;
  subject: "car" | "driver";
  periodMonths: number;
  periodKm: number | null;
  dueSoonDays: number;
  dueSoonKm: number | null;
};

function NumberField({ id, name, label, defaultValue }: { id: string; name: string; label: string; defaultValue?: number | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="number" inputMode="numeric" min={0} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

// Edits an existing type, or adds a custom one when `type` is missing.
export function IntervalTypeForm({ type }: { type?: TypeValues }) {
  const t = useTranslations("IntervalTypes");
  const [state, action, pending] = useActionState<TypeFormState, FormData>(
    type ? updateIntervalType.bind(null, type.id) : createIntervalType,
    { status: "idle" },
  );
  const [subject, setSubject] = useState<"car" | "driver">(type?.subject ?? "car");
  // A new-type form starts over after each save.
  const [formKey, setFormKey] = useState(0);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (!type && state.status === "saved") setFormKey((key) => key + 1);
  }
  const prefix = type ? `type-${type.id}` : "new-type";

  return (
    <form action={action} className="flex flex-col gap-3" noValidate key={formKey}>
      <div className="grid gap-3 sm:grid-cols-2">
        {!type?.builtIn && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${prefix}-name`}>{t("name")}</Label>
            <Input id={`${prefix}-name`} name="name" maxLength={64} defaultValue={type?.name ?? ""} />
          </div>
        )}
        {!type && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${prefix}-subject`}>{t("subject")}</Label>
            <NativeSelect
              id={`${prefix}-subject`}
              name="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value as "car" | "driver")}
            >
              <option value="car">{t("subjects.car")}</option>
              <option value="driver">{t("subjects.driver")}</option>
            </NativeSelect>
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <NumberField id={`${prefix}-months`} name="periodMonths" label={t("periodMonths")} defaultValue={type?.periodMonths ?? 12} />
        <NumberField id={`${prefix}-days`} name="dueSoonDays" label={t("dueSoonDays")} defaultValue={type?.dueSoonDays ?? 30} />
        {subject === "car" && (
          <>
            <NumberField id={`${prefix}-km`} name="periodKm" label={t("periodKm")} defaultValue={type?.periodKm} />
            <NumberField id={`${prefix}-soon-km`} name="dueSoonKm" label={t("dueSoonKm")} defaultValue={type?.dueSoonKm} />
          </>
        )}
      </div>
      {state.status === "error" && (
        <FormMessage kind="error" testId="type-error">
          {t(state.message)}
        </FormMessage>
      )}
      {state.status === "saved" && <FormMessage kind="success">{t("saved")}</FormMessage>}
      <Button type="submit" variant={type ? "outline" : "default"} size="sm" disabled={pending} className="self-start">
        {type ? t("save") : t("add")}
      </Button>
    </form>
  );
}

export function DeleteIntervalTypeButton({ typeId, name }: { typeId: string; name: string }) {
  const t = useTranslations("IntervalTypes");
  const [state, action, pending] = useActionState<DeleteTypeState, FormData>(
    () => deleteIntervalType(typeId),
    { status: "idle" },
  );
  return (
    <form action={action} className="flex flex-col gap-1">
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive self-start"
        disabled={pending}
        aria-label={t("deleteLabel", { name })}
      >
        {t("delete")}
      </Button>
      {state.status === "error" && (
        <FormMessage kind="error" testId="delete-type-error">
          {t(state.message)}
        </FormMessage>
      )}
    </form>
  );
}
