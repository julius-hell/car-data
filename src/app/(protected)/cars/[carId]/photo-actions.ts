"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findOwnedCar } from "@/lib/cars";
import { db } from "@/lib/db";
import { car } from "@/lib/db/schema";
import { deleteCarPhoto } from "@/lib/photos";
import { requireSession } from "@/lib/session";

export async function removeCarPhoto(carId: string) {
  const { user } = await requireSession();
  const owned = await findOwnedCar(user.id, carId);
  if (!owned) throw new Error("Invalid car.");

  await db
    .update(car)
    .set({ photoContentType: null, photoUpdatedAt: null })
    .where(eq(car.id, owned.id));
  await deleteCarPhoto(owned.id);
  revalidatePath(`/cars/${owned.id}`);
  revalidatePath("/cars");
}
