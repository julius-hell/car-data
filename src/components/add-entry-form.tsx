"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useState, useSyncExternalStore } from "react";
import {
  addMileageEntry,
  type AddEntryState,
} from "@/app/(protected)/cars/[carId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Unit } from "@/lib/db/schema";

function localIsoDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

const noopSubscribe = () => () => {};

export function AddEntryForm({ carId, unit }: { carId: string; unit: Unit }) {
  const t = useTranslations("Entry");
  const format = useFormatter();
  const [state, action, pending] = useActionState<AddEntryState, FormData>(
    addMileageEntry.bind(null, carId),
    { status: "idle" },
  );
  // Today's date depends on the visitor's timezone, so it is only known on the client.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [fields, setFields] = useState({ odometer: "", recordedAt: "", note: "" });
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "saved") setFields({ odometer: "", recordedAt: "", note: "" });
  }
  const update = (name: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((current) => ({ ...current, [name]: e.target.value }));

  return (
    <form
      action={action}
      className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5"
    >
      <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {t("title")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="odometer">{t("odometer", { unit })}</Label>
          <Input
            id="odometer"
            name="odometer"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            className="font-mono tabular-nums"
            value={fields.odometer}
            onChange={update("odometer")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recordedAt">{t("date")}</Label>
          <Input
            id="recordedAt"
            name="recordedAt"
            type="date"
            required
            value={fields.recordedAt || (mounted ? localIsoDate() : "")}
            onChange={update("recordedAt")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">{t("note")}</Label>
        <Input
          id="note"
          name="note"
          maxLength={200}
          placeholder={t("notePlaceholder")}
          value={fields.note}
          onChange={update("note")}
        />
      </div>

      {state.status === "error" && (
        <p role="alert" data-testid="entry-error" className="text-destructive text-sm">
          {t(state.message, { max: 200 })}
        </p>
      )}

      {state.status === "lower" ? (
        <div
          role="alert"
          data-testid="entry-warning"
          className="flex flex-col gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
        >
          <p>
            {t("lower", {
              odometer: format.number(state.odometer),
              latest: format.number(state.latest),
              unit,
            })}
          </p>
          <div>
            <Button type="submit" name="confirmLower" value="1" size="sm" disabled={pending}>
              {pending ? t("saving") : t("saveAnyway")}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" disabled={pending} className="sm:self-start">
          {pending ? t("saving") : t("submit")}
        </Button>
      )}
    </form>
  );
}
