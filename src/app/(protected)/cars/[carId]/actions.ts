"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findOwnedCar, isCarId } from "@/lib/cars";
import { db } from "@/lib/db";
import { car, mileageEntry } from "@/lib/db/schema";
import { latestOdometer } from "@/lib/entries";
import { requireSession } from "@/lib/session";

const NOTE_MAX_LENGTH = 200;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type AddEntryState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string }
  | { status: "lower"; odometer: number; latest: number };

export async function addMileageEntry(
  carId: string,
  _previous: AddEntryState,
  formData: FormData,
): Promise<AddEntryState> {
  const { user } = await requireSession();
  const owned = await findOwnedCar(user.id, carId);
  if (!owned) return { status: "error", message: "This car no longer exists." };

  const odometer = Number(formData.get("odometer"));
  const recordedAt = String(formData.get("recordedAt") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const confirmLower = formData.get("confirmLower") === "1";

  if (!Number.isInteger(odometer) || odometer < 0) {
    return { status: "error", message: "Enter the odometer as a whole number." };
  }
  if (!ISO_DATE.test(recordedAt) || Number.isNaN(Date.parse(recordedAt))) {
    return { status: "error", message: "Enter a valid date." };
  }
  if (note.length > NOTE_MAX_LENGTH) {
    return { status: "error", message: `Keep the note under ${NOTE_MAX_LENGTH} characters.` };
  }

  const latest = await latestOdometer(owned.id);
  if (latest !== null && odometer < latest && !confirmLower) {
    return { status: "lower", odometer, latest };
  }

  await db.insert(mileageEntry).values({
    carId: owned.id,
    odometer,
    recordedAt,
    note: note || null,
  });
  revalidatePath(`/cars/${owned.id}`);
  return { status: "saved" };
}

export async function deleteMileageEntry(entryId: string) {
  const { user } = await requireSession();
  if (!isCarId(entryId)) throw new Error("Invalid entry.");

  const [deleted] = await db
    .delete(mileageEntry)
    .where(
      and(
        eq(mileageEntry.id, entryId),
        inArray(
          mileageEntry.carId,
          db.select({ id: car.id }).from(car).where(eq(car.userId, user.id)),
        ),
      ),
    )
    .returning({ carId: mileageEntry.carId });
  if (deleted) revalidatePath(`/cars/${deleted.carId}`);
}
