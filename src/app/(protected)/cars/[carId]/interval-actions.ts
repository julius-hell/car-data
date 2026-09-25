"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/actor";
import { findCar } from "@/lib/cars";
import { db } from "@/lib/db";
import { interval, intervalType } from "@/lib/db/schema";
import { findCarInterval, trackCarInterval } from "@/lib/intervals";
import { parseDueFields, type IntervalFormState } from "@/lib/interval-form";

async function requireManagedCar(carId: string) {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const found = await findCar(actor, carId);
  if (!found) throw new Error("Invalid car.");
  return { actor, car: found };
}

// Sets the next due date/odometer and this car's period overrides directly.
export async function updateCarInterval(
  carId: string,
  intervalId: string,
  _previous: IntervalFormState,
  formData: FormData,
): Promise<IntervalFormState> {
  const { actor, car } = await requireManagedCar(carId);
  const found = await findCarInterval(actor.organizationId, car.id, intervalId);
  if (!found) throw new Error("Invalid interval.");

  const parsed = parseDueFields(formData, found.type.precision);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  await db.update(interval).set(parsed.values).where(eq(interval.id, found.interval.id));
  revalidatePath(`/cars/${car.id}`);
  return { status: "saved" };
}

export async function stopTrackingInterval(carId: string, intervalId: string) {
  const { actor, car } = await requireManagedCar(carId);
  const found = await findCarInterval(actor.organizationId, car.id, intervalId);
  if (!found) throw new Error("Invalid interval.");
  await db.update(interval).set({ active: false }).where(eq(interval.id, found.interval.id));
  revalidatePath(`/cars/${car.id}`);
}

export async function startTrackingInterval(carId: string, formData: FormData) {
  const { actor, car } = await requireManagedCar(carId);
  const typeId = String(formData.get("intervalTypeId") ?? "");
  const type = await db.query.intervalType.findFirst({
    where: and(eq(intervalType.id, typeId), eq(intervalType.organizationId, actor.organizationId)),
  });
  if (!type || type.subject !== "car") throw new Error("Invalid interval type.");
  await trackCarInterval(car.id, type);
  revalidatePath(`/cars/${car.id}`);
}
