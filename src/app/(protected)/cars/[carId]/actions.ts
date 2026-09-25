"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/actor";
import { findCar } from "@/lib/cars";
import { db } from "@/lib/db";
import { mileageEntry } from "@/lib/db/schema";
import { findModifiableEntry, latestOdometer, parseEntry, type EntryError } from "@/lib/entries";

export type AddEntryState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: "errorCarGone" | EntryError }
  | { status: "lower"; odometer: number; latest: number };

export async function addMileageEntry(
  carId: string,
  _previous: AddEntryState,
  formData: FormData,
): Promise<AddEntryState> {
  const actor = await requireActor();
  assertCan(actor, "addEntry");
  // Drivers only find the cars they are assigned to.
  const found = await findCar(actor, carId);
  if (!found) return { status: "error", message: "errorCarGone" };

  const parsed = parseEntry(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const { entry } = parsed;

  const latest = await latestOdometer(found.id);
  if (latest !== null && entry.odometer < latest && formData.get("confirmLower") !== "1") {
    return { status: "lower", odometer: entry.odometer, latest };
  }

  await db.insert(mileageEntry).values({
    carId: found.id,
    ...entry,
    recordedBy: actor.userId,
    recordedByName: actor.name,
  });
  revalidatePath(`/cars/${found.id}`);
  return { status: "saved" };
}

export type EditEntryState = { status: "idle" } | { status: "saved" } | { status: "error"; message: "errorGone" | EntryError };

export async function updateMileageEntry(
  entryId: string,
  _previous: EditEntryState,
  formData: FormData,
): Promise<EditEntryState> {
  const actor = await requireActor();
  const existing = await findModifiableEntry(actor, entryId);
  if (!existing) return { status: "error", message: "errorGone" };
  const parsed = parseEntry(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };

  await db.update(mileageEntry).set(parsed.entry).where(eq(mileageEntry.id, existing.id));
  revalidatePath(`/cars/${existing.carId}`);
  return { status: "saved" };
}

export async function deleteMileageEntry(entryId: string) {
  const actor = await requireActor();
  const existing = await findModifiableEntry(actor, entryId);
  if (!existing) throw new Error("Invalid entry.");
  await db.delete(mileageEntry).where(eq(mileageEntry.id, existing.id));
  revalidatePath(`/cars/${existing.carId}`);
}
