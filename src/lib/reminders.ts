import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { isoDateToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { car, reminder, type Reminder } from "@/lib/db/schema";

export const DUE_SOON_DISTANCE = 1000;
export const DUE_SOON_DAYS = 30;
const DAY_MS = 86_400_000;

export type ReminderLevel = "ok" | "soon" | "overdue";

export type ReminderStatus = {
  remainingDistance: number | null;
  estimatedDate: Date | null;
  daysLeft: number | null;
  level: ReminderLevel;
};

export function reminderStatus(
  item: Pick<Reminder, "targetOdometer" | "targetDate">,
  { latestOdometer, perDay, now }: { latestOdometer: number | null; perDay: number | null; now: Date },
): ReminderStatus {
  const remainingDistance =
    item.targetOdometer !== null && latestOdometer !== null
      ? item.targetOdometer - latestOdometer
      : null;
  const estimatedDate =
    remainingDistance !== null && remainingDistance > 0 && perDay && perDay > 0
      ? new Date(now.getTime() + (remainingDistance / perDay) * DAY_MS)
      : null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysLeft =
    item.targetDate !== null
      ? Math.round((isoDateToDate(item.targetDate).getTime() - today) / DAY_MS)
      : null;

  let level: ReminderLevel = "ok";
  if ((remainingDistance !== null && remainingDistance <= 0) || (daysLeft !== null && daysLeft < 0)) {
    level = "overdue";
  } else if (
    (remainingDistance !== null && remainingDistance <= DUE_SOON_DISTANCE) ||
    (daysLeft !== null && daysLeft <= DUE_SOON_DAYS)
  ) {
    level = "soon";
  }
  return { remainingDistance, estimatedDate, daysLeft, level };
}

export async function listReminders(carId: string) {
  return db.query.reminder.findMany({
    where: eq(reminder.carId, carId),
    orderBy: [asc(reminder.targetOdometer), asc(reminder.targetDate), asc(reminder.createdAt)],
  });
}

export async function findOwnedReminder(userId: string, reminderId: string) {
  const [row] = await db
    .select({ reminder })
    .from(reminder)
    .innerJoin(car, eq(car.id, reminder.carId))
    .where(and(eq(reminder.id, reminderId), eq(car.userId, userId)));
  return row?.reminder;
}

export async function openRemindersByCar(carIds: string[]) {
  if (carIds.length === 0) return new Map<string, Reminder[]>();
  const rows = await db.query.reminder.findMany({
    where: and(inArray(reminder.carId, carIds), isNull(reminder.doneAt)),
  });
  const byCar = new Map<string, Reminder[]>();
  for (const row of rows) byCar.set(row.carId, [...(byCar.get(row.carId) ?? []), row]);
  return byCar;
}
