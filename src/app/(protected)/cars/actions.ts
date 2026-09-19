"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCarId } from "@/lib/cars";
import { db } from "@/lib/db";
import { car, UNITS, type Unit } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";

const CAR_NAME_MAX_LENGTH = 64;

function isUnit(value: unknown): value is Unit {
  return typeof value === "string" && (UNITS as readonly string[]).includes(value);
}

export async function createCar(formData: FormData) {
  const { user } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const unit = formData.get("unit") ?? "km";
  if (!name || name.length > CAR_NAME_MAX_LENGTH || !isUnit(unit)) {
    throw new Error("Invalid car.");
  }

  await db.insert(car).values({ userId: user.id, name, unit });
  revalidatePath("/cars");
}

export async function deleteCar(carId: string) {
  const { user } = await requireSession();
  if (!isCarId(carId)) throw new Error("Invalid car.");

  await db.delete(car).where(and(eq(car.id, carId), eq(car.userId, user.id)));
  revalidatePath("/cars");
  redirect("/cars");
}
