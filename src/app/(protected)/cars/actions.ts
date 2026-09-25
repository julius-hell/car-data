"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCan, requireActor } from "@/lib/actor";
import { isCarId } from "@/lib/cars";
import { db } from "@/lib/db";
import { car } from "@/lib/db/schema";
import { deleteCarPhoto } from "@/lib/photos";

const CAR_NAME_MAX_LENGTH = 64;

export async function createCar(formData: FormData) {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > CAR_NAME_MAX_LENGTH) {
    throw new Error("Invalid car.");
  }

  await db.insert(car).values({ organizationId: actor.organizationId, name });
  revalidatePath("/cars");
}

export async function deleteCar(carId: string) {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  if (!isCarId(carId)) throw new Error("Invalid car.");

  const [deleted] = await db
    .delete(car)
    .where(and(eq(car.id, carId), eq(car.organizationId, actor.organizationId)))
    .returning({ id: car.id });
  if (deleted) await deleteCarPhoto(deleted.id);
  revalidatePath("/cars");
  redirect("/cars");
}
