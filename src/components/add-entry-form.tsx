"use client";

import { useActionState, useSyncExternalStore } from "react";
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
  const [state, action, pending] = useActionState<AddEntryState, FormData>(
    addMileageEntry.bind(null, carId),
    { status: "idle" },
  );
  // Today's date depends on the visitor's timezone, so it is only known on the client.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const entered = state.status === "lower" ? state.entered : null;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="font-medium">Log a reading</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="odometer">Odometer ({unit})</Label>
          <Input
            id="odometer"
            name="odometer"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            defaultValue={entered?.odometer ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recordedAt">Date</Label>
          <Input
            id="recordedAt"
            name="recordedAt"
            type="date"
            required
            defaultValue={entered?.recordedAt ?? (mounted ? localIsoDate() : "")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input
          id="note"
          name="note"
          maxLength={200}
          placeholder="e.g. oil change"
          defaultValue={entered?.note ?? ""}
        />
      </div>

      {state.status === "error" && (
        <p role="alert" data-testid="entry-error" className="text-destructive text-sm">
          {state.message}
        </p>
      )}

      {state.status === "lower" ? (
        <div
          role="alert"
          data-testid="entry-warning"
          className="flex flex-col gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
        >
          <p>
            {state.entered.odometer.toLocaleString("en")} {unit} is lower than the
            latest reading of {state.latest.toLocaleString("en")} {unit}. Save it
            anyway?
          </p>
          <div>
            <Button type="submit" name="confirmLower" value="1" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save anyway"}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" disabled={pending} className="sm:self-start">
          {pending ? "Saving…" : "Add reading"}
        </Button>
      )}
    </form>
  );
}
