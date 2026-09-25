import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  car,
  interval,
  intervalType,
  mileageEntry,
  type BuiltInInterval,
  type Interval,
  type IntervalType,
} from "@/lib/db/schema";
import { addMonths, dueStatus, monthStart, worstLevel, type DueLevel, type DueStatus } from "@/lib/due";
import { mileageStats } from "@/lib/stats";
import { todayIso } from "@/lib/today";

type BuiltInDefaults = Pick<
  IntervalType,
  "subject" | "periodMonths" | "periodKm" | "precision" | "dueSoonDays" | "dueSoonKm"
>;

// The usual German rules, as editable defaults (not legal advice).
export const BUILT_IN_TYPES: Record<BuiltInInterval, BuiltInDefaults> = {
  hu: { subject: "car", periodMonths: 24, periodKm: null, precision: "month", dueSoonDays: 30, dueSoonKm: null },
  uvv_inspection: { subject: "car", periodMonths: 12, periodKm: null, precision: "day", dueSoonDays: 30, dueSoonKm: null },
  service: { subject: "car", periodMonths: 12, periodKm: 15_000, precision: "day", dueSoonDays: 30, dueSoonKm: 1_000 },
  licence_check: { subject: "driver", periodMonths: 6, periodKm: null, precision: "day", dueSoonDays: 30, dueSoonKm: null },
  uvv_instruction: { subject: "driver", periodMonths: 12, periodKm: null, precision: "day", dueSoonDays: 30, dueSoonKm: null },
};

// New cars track these unless an admin says otherwise.
export const DEFAULT_CAR_TYPES: BuiltInInterval[] = ["hu", "uvv_inspection", "service"];
// A car's first HU is due this many months after its first registration.
export const FIRST_HU_MONTHS = 36;

// Creates any missing built-in types, so organizations created before a
// type existed get it too. Safe to call repeatedly.
export async function ensureBuiltInTypes(organizationId: string) {
  await db
    .insert(intervalType)
    .values(
      (Object.entries(BUILT_IN_TYPES) as [BuiltInInterval, BuiltInDefaults][]).map(([builtIn, defaults]) => ({
        organizationId,
        builtIn,
        ...defaults,
      })),
    )
    .onConflictDoNothing();
}

export async function listIntervalTypes(organizationId: string) {
  await ensureBuiltInTypes(organizationId);
  return db.query.intervalType.findMany({
    where: eq(intervalType.organizationId, organizationId),
    orderBy: [asc(intervalType.createdAt)],
  });
}

export type IntervalWithType = { interval: Interval; type: IntervalType };

export function effectivePeriod({ interval, type }: IntervalWithType) {
  return {
    months: interval.periodMonths ?? type.periodMonths,
    km: type.subject === "car" ? (interval.periodKm ?? type.periodKm) : null,
  };
}

export function statusOf(entry: IntervalWithType, context: { today: string; latestOdometer: number | null; kmPerDay: number | null }): DueStatus {
  const period = effectivePeriod(entry);
  return dueStatus(
    {
      precision: entry.type.precision,
      nextDueOn: entry.interval.nextDueOn,
      nextDueOdometer: period.km !== null ? entry.interval.nextDueOdometer : null,
      dueSoonDays: entry.type.dueSoonDays,
      dueSoonKm: entry.type.dueSoonKm,
    },
    context,
  );
}

export async function listCarIntervals(carId: string) {
  return db
    .select({ interval, type: intervalType })
    .from(interval)
    .innerJoin(intervalType, eq(intervalType.id, interval.intervalTypeId))
    .where(and(eq(interval.carId, carId), eq(interval.active, true)))
    .orderBy(asc(intervalType.createdAt));
}

export async function findCarInterval(organizationId: string, carId: string, intervalId: string) {
  const [row] = await db
    .select({ interval, type: intervalType })
    .from(interval)
    .innerJoin(intervalType, eq(intervalType.id, interval.intervalTypeId))
    .where(
      and(eq(interval.id, intervalId), eq(interval.carId, carId), eq(intervalType.organizationId, organizationId)),
    );
  return row;
}

// Starts (or resumes) tracking an interval type for a car.
export async function trackCarInterval(
  carId: string,
  type: IntervalType,
  due: { nextDueOn?: string | null; nextDueOdometer?: number | null } = {},
) {
  await db
    .insert(interval)
    .values({
      intervalTypeId: type.id,
      carId,
      nextDueOn: due.nextDueOn ?? null,
      nextDueOdometer: due.nextDueOdometer ?? null,
    })
    .onConflictDoUpdate({ target: [interval.intervalTypeId, interval.carId], set: { active: true } });
}

// The first HU of a young car: first registration plus 36 months.
export function defaultFirstHu(firstRegistration: string | null, today = todayIso()) {
  if (!firstRegistration) return null;
  const due = monthStart(addMonths(firstRegistration, FIRST_HU_MONTHS));
  return due >= monthStart(today) ? due : null;
}

export async function trackDefaultIntervals(
  organizationId: string,
  carId: string,
  due: Partial<Record<BuiltInInterval, { nextDueOn: string | null; nextDueOdometer?: number | null }>>,
) {
  const types = await listIntervalTypes(organizationId);
  for (const key of DEFAULT_CAR_TYPES) {
    const type = types.find((t) => t.builtIn === key);
    if (type) await trackCarInterval(carId, type, due[key]);
  }
}

// Latest odometer and km per day for a set of cars, from their entries.
export async function odometerContext(carIds: string[]) {
  const byCar = new Map<string, { latestOdometer: number | null; kmPerDay: number | null }>();
  if (carIds.length === 0) return byCar;
  const rows = await db
    .select({
      carId: mileageEntry.carId,
      odometer: mileageEntry.odometer,
      recordedAt: mileageEntry.recordedAt,
      createdAt: mileageEntry.createdAt,
    })
    .from(mileageEntry)
    .where(inArray(mileageEntry.carId, carIds));
  const grouped = new Map<string, { odometer: number; recordedAt: string; createdAt: Date }[]>();
  for (const row of rows) grouped.set(row.carId, [...(grouped.get(row.carId) ?? []), row]);
  const now = new Date();
  for (const carId of carIds) {
    const readings = grouped.get(carId) ?? [];
    // Newest by date, then by when it was entered, like the entry list.
    const latest = [...readings].sort(
      (a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
    byCar.set(carId, {
      latestOdometer: latest?.odometer ?? null,
      kmPerDay: readings.length >= 2 ? mileageStats(readings, now).perDay : null,
    });
  }
  return byCar;
}

// The most urgent level of each car's intervals, for the fleet list.
export async function worstLevelByCar(organizationId: string, carIds: string[]) {
  const result = new Map<string, DueLevel>();
  if (carIds.length === 0) return result;
  const [rows, context] = await Promise.all([
    db
      .select({ interval, type: intervalType })
      .from(interval)
      .innerJoin(intervalType, eq(intervalType.id, interval.intervalTypeId))
      .innerJoin(car, eq(car.id, interval.carId))
      .where(
        and(
          eq(intervalType.organizationId, organizationId),
          isNotNull(interval.carId),
          inArray(interval.carId, carIds),
          eq(interval.active, true),
        ),
      ),
    odometerContext(carIds),
  ]);
  const today = todayIso();
  for (const row of rows) {
    const carId = row.interval.carId!;
    const status = statusOf(row, { today, ...(context.get(carId) ?? { latestOdometer: null, kmPerDay: null }) });
    result.set(carId, worstLevel([result.get(carId) ?? "ok", status.level]));
  }
  return result;
}
