import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { car, userPreference } from "@/lib/db/schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCarId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function listCars(userId: string) {
  return db.query.car.findMany({
    where: eq(car.userId, userId),
    orderBy: [asc(car.createdAt)],
  });
}

export async function findOwnedCar(userId: string, carId: string) {
  if (!isCarId(carId)) return undefined;
  return db.query.car.findFirst({
    where: and(eq(car.id, carId), eq(car.userId, userId)),
  });
}

export async function getDefaultCarId(userId: string) {
  const preference = await db.query.userPreference.findFirst({
    where: eq(userPreference.userId, userId),
  });
  return preference?.defaultCarId ?? null;
}

export async function setDefaultCarId(userId: string, carId: string) {
  await db
    .insert(userPreference)
    .values({ userId, defaultCarId: carId })
    .onConflictDoUpdate({
      target: userPreference.userId,
      set: { defaultCarId: carId },
    });
}
