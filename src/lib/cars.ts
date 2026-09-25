import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { car, mileageEntry } from "@/lib/db/schema";

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

export async function listCarsWithLatestReading(userId: string) {
  const cars = await listCars(userId);
  if (cars.length === 0) return [];
  const latest = await db
    .selectDistinctOn([mileageEntry.carId], {
      carId: mileageEntry.carId,
      odometer: mileageEntry.odometer,
      recordedAt: mileageEntry.recordedAt,
      readings: sql<number>`count(*) over (partition by ${mileageEntry.carId})`.mapWith(Number),
    })
    .from(mileageEntry)
    .where(inArray(mileageEntry.carId, cars.map((c) => c.id)))
    .orderBy(mileageEntry.carId, desc(mileageEntry.recordedAt), desc(mileageEntry.createdAt));
  const byCar = new Map(latest.map((row) => [row.carId, row]));
  return cars.map((car) => ({ ...car, latest: byCar.get(car.id) ?? null }));
}
