import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { can, type Actor } from "@/lib/actor";
import { projectAllowance } from "@/lib/allowance";
import { currentCarsOf } from "@/lib/assignments";
import { contractStatus, contractsByCar } from "@/lib/contracts";
import { db } from "@/lib/db";
import { car, damageReport, interval, intervalType, member, user, type Car } from "@/lib/db/schema";
import type { DueLevel, DuePrecision } from "@/lib/due";
import { odometerContext, statusOf, type IntervalWithType } from "@/lib/intervals";
import { todayIso } from "@/lib/today";

// Everything that needs attention, as one list. The dashboard, the email
// digest and the calendar feed all read it, so what each person may see is
// decided here once.

export type DueItemKind = "carInterval" | "driverCheck" | "contractEnd" | "allowance" | "damage";

export type DueItem = {
  id: string;
  kind: DueItemKind;
  level: DueLevel;
  // The date it is due (or happened, for damage); null when unknown.
  date: string | null;
  precision: DuePrecision;
  // Interval type for interval items, so they can be named and filtered.
  intervalType: { id: string; builtIn: string | null; name: string | null } | null;
  car: Pick<Car, "id" | "licencePlate" | "location" | "costCenter"> | null;
  person: { userId: string; name: string } | null;
  // Extra numbers some kinds carry (km remaining, projected overrun).
  km: number | null;
};

const URGENCY: Record<DueLevel, number> = { overdue: 0, soon: 1, missing: 2, ok: 3 };

export function sortDueItems(items: DueItem[]) {
  return [...items].sort(
    (a, b) =>
      URGENCY[a.level] - URGENCY[b.level] ||
      (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
      (a.car?.licencePlate ?? a.person?.name ?? "").localeCompare(b.car?.licencePlate ?? b.person?.name ?? ""),
  );
}

const carSummary = (row: Car) => ({
  id: row.id,
  licencePlate: row.licencePlate,
  location: row.location,
  costCenter: row.costCenter,
});

// Cars in the actor's view: the active fleet, or a driver's current cars.
async function carsInView(actor: Actor) {
  if (can(actor, "viewFleet")) {
    return db.query.car.findMany({
      where: and(eq(car.organizationId, actor.organizationId), isNull(car.retiredOn)),
    });
  }
  return (await currentCarsOf(actor.userId)).map((row) => row.car);
}

export async function collectDueItems(
  actor: Actor,
  { includeOk = false, today = todayIso() }: { includeOk?: boolean; today?: string } = {},
): Promise<DueItem[]> {
  const fleet = can(actor, "viewFleet");
  const cars = await carsInView(actor);
  const carIds = cars.map((c) => c.id);
  const carById = new Map(cars.map((c) => [c.id, c]));
  const [carIntervals, context, contracts] = await Promise.all([
    carIds.length === 0
      ? Promise.resolve([] as IntervalWithType[])
      : db
          .select({ interval, type: intervalType })
          .from(interval)
          .innerJoin(intervalType, eq(intervalType.id, interval.intervalTypeId))
          .where(and(inArray(interval.carId, carIds), eq(interval.active, true))),
    odometerContext(carIds),
    contractsByCar(carIds),
  ]);
  const items: DueItem[] = [];

  for (const entry of carIntervals) {
    const owner = carById.get(entry.interval.carId!)!;
    const status = statusOf(entry, { today, ...(context.get(owner.id) ?? { latestOdometer: null, kmPerDay: null }) });
    items.push({
      id: `interval:${entry.interval.id}`,
      kind: "carInterval",
      level: status.level,
      date: status.dueDate ?? status.estimatedDate,
      precision: entry.type.precision,
      intervalType: { id: entry.type.id, builtIn: entry.type.builtIn, name: entry.type.name },
      car: carSummary(owner),
      person: null,
      km: status.remainingKm,
    });
  }

  for (const [carId, contract] of contracts) {
    if (contract.returnedOn) continue;
    const owner = carSummary(carById.get(carId)!);
    const status = contractStatus(contract, today);
    if (status) {
      items.push({
        id: `contract:${contract.id}`,
        kind: "contractEnd",
        level: status.level,
        date: status.endOn,
        precision: "day",
        intervalType: null,
        car: owner,
        person: null,
        km: null,
      });
    }
    // Allowance projections are money matters for the fleet, not for drivers.
    if (
      fleet &&
      (contract.kind === "leased" || contract.kind === "rented") &&
      contract.startOn &&
      contract.endOn &&
      contract.kmPerYear !== null &&
      contract.handoverOdometer !== null
    ) {
      const projection = projectAllowance(
        {
          startOn: contract.startOn,
          endOn: contract.endOn,
          termMonths: contract.termMonths,
          kmPerYear: contract.kmPerYear,
          handoverOdometer: contract.handoverOdometer,
          excessKmRate: contract.excessKmRate,
          underKmRate: contract.underKmRate,
        },
        { today, ...(context.get(carId) ?? { latestOdometer: null, kmPerDay: null }) },
      );
      items.push({
        id: `allowance:${contract.id}`,
        kind: "allowance",
        level: projection.level,
        date: contract.endOn,
        precision: "day",
        intervalType: null,
        car: owner,
        person: null,
        km: projection.projectedDifference,
      });
    }
  }

  if (fleet && carIds.length > 0) {
    const reports = await db.query.damageReport.findMany({
      where: and(inArray(damageReport.carId, carIds), eq(damageReport.status, "open")),
    });
    for (const report of reports) {
      items.push({
        id: `damage:${report.id}`,
        kind: "damage",
        level: "soon",
        date: report.occurredOn,
        precision: "day",
        intervalType: null,
        car: carSummary(carById.get(report.carId)!),
        person: null,
        km: null,
      });
    }
  }

  // Driver checks: every member's for admins, a person's own otherwise;
  // viewers see none (personal data).
  const checkOwners = can(actor, "manageMembers") ? null : actor.role === "viewer" ? [] : [actor.userId];
  if (checkOwners === null || checkOwners.length > 0) {
    const rows = await db
      .select({ interval, type: intervalType, userId: user.id, name: user.name })
      .from(interval)
      .innerJoin(intervalType, eq(intervalType.id, interval.intervalTypeId))
      .innerJoin(user, eq(user.id, interval.userId))
      .innerJoin(member, and(eq(member.userId, user.id), eq(member.organizationId, actor.organizationId)))
      .where(
        and(
          eq(intervalType.organizationId, actor.organizationId),
          isNotNull(interval.userId),
          eq(interval.active, true),
          checkOwners ? inArray(interval.userId, checkOwners) : undefined,
        ),
      );
    for (const row of rows) {
      const status = statusOf(row, { today, latestOdometer: null, kmPerDay: null });
      items.push({
        id: `interval:${row.interval.id}`,
        kind: "driverCheck",
        level: status.level,
        date: status.dueDate,
        precision: row.type.precision,
        intervalType: { id: row.type.id, builtIn: row.type.builtIn, name: row.type.name },
        car: null,
        person: { userId: row.userId, name: row.name },
        km: null,
      });
    }
  }

  return sortDueItems(includeOk ? items : items.filter((item) => item.level !== "ok"));
}

export function countByLevel(items: DueItem[]) {
  return {
    overdue: items.filter((i) => i.level === "overdue").length,
    soon: items.filter((i) => i.level === "soon").length,
    missing: items.filter((i) => i.level === "missing").length,
  };
}

// Where the item is dealt with. People see their own checks on My cars.
export function dueItemLink(item: DueItem, actor: Actor) {
  if (item.kind === "driverCheck") {
    return can(actor, "manageMembers") ? `/team/members/${item.person!.userId}` : "/my-cars";
  }
  return `/cars/${item.car!.id}`;
}
