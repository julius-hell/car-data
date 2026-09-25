import { and, desc, eq } from "drizzle-orm";
import { can, type Actor } from "@/lib/actor";
import { hasCurrentAssignment } from "@/lib/assignments";
import { isCarId } from "@/lib/cars";
import { db } from "@/lib/db";
import { car, mileageEntry, type MileageEntry } from "@/lib/db/schema";

export const NOTE_MAX_LENGTH = 200;
// Drivers may fix their own entries for this long after creating them.
export const DRIVER_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function listEntries(carId: string, { recordedBy }: { recordedBy?: string } = {}) {
  return db.query.mileageEntry.findMany({
    where: and(eq(mileageEntry.carId, carId), recordedBy ? eq(mileageEntry.recordedBy, recordedBy) : undefined),
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

// Admins change any entry; drivers only their own, for a week, and only
// while they still drive the car.
export function canModifyEntry(
  actor: Actor,
  entry: Pick<MileageEntry, "recordedBy" | "createdAt">,
  now = new Date(),
) {
  if (can(actor, "manageFleet")) return true;
  if (actor.role !== "driver") return false;
  return entry.recordedBy === actor.userId && now.getTime() - entry.createdAt.getTime() <= DRIVER_EDIT_WINDOW_MS;
}

// An entry the actor may change, or undefined.
export async function findModifiableEntry(actor: Actor, entryId: string) {
  if (!isCarId(entryId)) return undefined;
  const [row] = await db
    .select({ entry: mileageEntry })
    .from(mileageEntry)
    .innerJoin(car, eq(car.id, mileageEntry.carId))
    .where(and(eq(mileageEntry.id, entryId), eq(car.organizationId, actor.organizationId)));
  if (!row || !canModifyEntry(actor, row.entry)) return undefined;
  if (!can(actor, "viewFleet") && !(await hasCurrentAssignment(actor.userId, row.entry.carId))) return undefined;
  return row.entry;
}

export type EntryInput = { odometer: number; recordedAt: string; note: string | null };
export type EntryError = "errorOdometer" | "errorDate" | "errorNote";

export function parseEntry(formData: FormData): { entry: EntryInput } | { error: EntryError } {
  const odometer = Number(formData.get("odometer"));
  const recordedAt = String(formData.get("recordedAt") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!Number.isInteger(odometer) || odometer < 0) return { error: "errorOdometer" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedAt) || Number.isNaN(Date.parse(recordedAt))) return { error: "errorDate" };
  if (note.length > NOTE_MAX_LENGTH) return { error: "errorNote" };
  return { entry: { odometer, recordedAt, note: note || null } };
}
