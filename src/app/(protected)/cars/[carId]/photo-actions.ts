"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findOwnedCar } from "@/lib/cars";
import { db } from "@/lib/db";
import { car } from "@/lib/db/schema";
import { deleteCarPhoto, PHOTO_MAX_BYTES, storeCarPhoto } from "@/lib/photos";
import { requireSession } from "@/lib/session";

export type PhotoActionState = { status: "idle" } | { status: "error"; message: string };

export async function setCarPhoto(
  carId: string,
  _previous: PhotoActionState,
  formData: FormData,
): Promise<PhotoActionState> {
  const { user } = await requireSession();
  const owned = await findOwnedCar(user.id, carId);
  if (!owned) return { status: "error", message: "This car no longer exists." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo first." };
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return { status: "error", message: "Photos must be 15 MB or smaller." };
  }

  let stored;
  try {
    stored = await storeCarPhoto(owned.id, Buffer.from(await file.arrayBuffer()));
  } catch {
    return { status: "error", message: "That file is not an image we can read." };
  }

  await db
    .update(car)
    .set({ photoContentType: stored.contentType, photoUpdatedAt: new Date() })
    .where(eq(car.id, owned.id));
  revalidatePath(`/cars/${owned.id}`);
  revalidatePath("/cars");
  return { status: "idle" };
}

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
