import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mileageEntry } from "@/lib/db/schema";

export async function listEntries(carId: string) {
  return db.query.mileageEntry.findMany({
    where: eq(mileageEntry.carId, carId),
    orderBy: [desc(mileageEntry.recordedAt), desc(mileageEntry.createdAt)],
  });
}

export async function latestOdometer(carId: string) {
  const latest = await db.query.mileageEntry.findFirst({
    where: eq(mileageEntry.carId, carId),
    orderBy: [desc(mileageEntry.recordedAt), desc(mileageEntry.createdAt)],
    columns: { odometer: true },
  });
  return latest?.odometer ?? null;
}
