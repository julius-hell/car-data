"use server";

import { and, count, eq, isNull, or, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/actor";
import { db } from "@/lib/db";
import { assignment, car, interval, intervalType } from "@/lib/db/schema";
import { ensureDriverIntervals } from "@/lib/intervals";
import { todayIso } from "@/lib/today";

async function requireAdmin() {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  return actor;
}

export type TypeFormState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: "errorName" | "errorPeriod" | "errorWindow" | "errorSubject" };

type Numbers = { periodMonths: number; periodKm: number | null; dueSoonDays: number; dueSoonKm: number | null };

function parseNumbers(formData: FormData, allowKm: boolean): Numbers | "errorPeriod" | "errorWindow" {
  const int = (name: string) => {
    const text = String(formData.get(name) ?? "").trim();
    if (text === "") return null;
    const value = Number(text);
    return Number.isInteger(value) && value >= 0 ? value : Number.NaN;
  };
  const periodMonths = int("periodMonths");
  const periodKm = allowKm ? int("periodKm") : null;
  const dueSoonDays = int("dueSoonDays");
  const dueSoonKm = allowKm ? int("dueSoonKm") : null;
  if (periodMonths === null || Number.isNaN(periodMonths) || periodMonths < 1 || periodMonths > 240) return "errorPeriod";
  if (periodKm !== null && (Number.isNaN(periodKm) || periodKm < 1)) return "errorPeriod";
  if (dueSoonDays === null || Number.isNaN(dueSoonDays) || dueSoonDays > 365) return "errorWindow";
  if (dueSoonKm !== null && Number.isNaN(dueSoonKm)) return "errorWindow";
  return { periodMonths, periodKm, dueSoonDays, dueSoonKm: periodKm === null ? null : dueSoonKm };
}

export async function updateIntervalType(typeId: string, _previous: TypeFormState, formData: FormData): Promise<TypeFormState> {
  const actor = await requireAdmin();
  const type = await db.query.intervalType.findFirst({
    where: and(eq(intervalType.id, typeId), eq(intervalType.organizationId, actor.organizationId)),
  });
  if (!type) throw new Error("Invalid interval type.");
  const numbers = parseNumbers(formData, type.subject === "car");
  if (typeof numbers === "string") return { status: "error", message: numbers };
  let name = type.name;
  if (!type.builtIn) {
    name = String(formData.get("name") ?? "").trim();
    if (!name || name.length > 64) return { status: "error", message: "errorName" };
  }
  await db.update(intervalType).set({ ...numbers, name }).where(eq(intervalType.id, type.id));
  revalidatePath("/", "layout");
  return { status: "saved" };
}

export async function createIntervalType(_previous: TypeFormState, formData: FormData): Promise<TypeFormState> {
  const actor = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const subject = formData.get("subject");
  if (!name || name.length > 64) return { status: "error", message: "errorName" };
  if (subject !== "car" && subject !== "driver") return { status: "error", message: "errorSubject" };
  const numbers = parseNumbers(formData, subject === "car");
  if (typeof numbers === "string") return { status: "error", message: numbers };

  await db.insert(intervalType).values({ organizationId: actor.organizationId, name, subject, precision: "day", ...numbers });
  // New driver checks apply to everyone who currently drives a company car.
  if (subject === "driver") {
    const today = todayIso();
    const drivers = await db
      .selectDistinct({ userId: assignment.userId })
      .from(assignment)
      .innerJoin(car, eq(car.id, assignment.carId))
      .where(
        and(
          eq(car.organizationId, actor.organizationId),
          lte(assignment.startsOn, today),
          or(isNull(assignment.endsOn), gte(assignment.endsOn, today)),
        ),
      );
    for (const { userId } of drivers) await ensureDriverIntervals(actor.organizationId, userId);
  }
  revalidatePath("/interval-types");
  return { status: "saved" };
}

export type DeleteTypeState = { status: "idle" } | { status: "error"; message: "errorInUse" };

// Only unused custom types go; built-in ones and types in use stay.
export async function deleteIntervalType(typeId: string): Promise<DeleteTypeState> {
  const actor = await requireAdmin();
  const type = await db.query.intervalType.findFirst({
    where: and(eq(intervalType.id, typeId), eq(intervalType.organizationId, actor.organizationId)),
  });
  if (!type || type.builtIn) throw new Error("Invalid interval type.");
  const [usage] = await db.select({ count: count() }).from(interval).where(eq(interval.intervalTypeId, type.id));
  if ((usage?.count ?? 0) > 0) return { status: "error", message: "errorInUse" };
  await db.delete(intervalType).where(eq(intervalType.id, type.id));
  revalidatePath("/interval-types");
  return { status: "idle" };
}
