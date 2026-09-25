"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/actor";
import { findCar } from "@/lib/cars";
import { db } from "@/lib/db";
import { car } from "@/lib/db/schema";
import { deleteCarPhoto } from "@/lib/photos";

export async function removeCarPhoto(carId: string) {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const owned = await findCar(actor, carId);
  if (!owned) throw new Error("Invalid car.");

  await db
    .update(car)
    .set({ photoContentType: null, photoUpdatedAt: null })
    .where(eq(car.id, owned.id));
  await deleteCarPhoto(owned.id);
  revalidatePath(`/cars/${owned.id}`);
  revalidatePath("/cars");
}
