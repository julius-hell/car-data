import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Actor } from "@/lib/actor";
import { db } from "@/lib/db";
import { car, mileageEntry, RETIREMENT_REASONS, type RetirementReason } from "@/lib/db/schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
export const TEXT_MAX_LENGTH = 64;
export const PLATE_MAX_LENGTH = 15;

export function isCarId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

// Upper case, single spaces, no spaces around hyphens: "m -ab  1234" becomes
// "M-AB 1234". Separators stay, because "M-AB 1234" and "MA-B 1234" are
// different plates.
export function normalizeLicencePlate(value: unknown) {
  return String(value ?? "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-");
}

export type CarDetails = {
  licencePlate: string;
  make: string;
  model: string;
  vin: string | null;
  firstRegistration: string | null;
  costCenter: string | null;
  location: string | null;
};

export type CarDetailsError =
  | "errorPlate"
  | "errorMake"
  | "errorModel"
  | "errorVin"
  | "errorFirstRegistration"
  | "errorTooLong";

const optional = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
};

export function parseCarDetails(formData: FormData): { details: CarDetails } | { error: CarDetailsError } {
  const licencePlate = normalizeLicencePlate(formData.get("licencePlate"));
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const vin = optional(formData.get("vin"))?.toUpperCase().replace(/\s+/g, "") ?? null;
  const firstRegistration = optional(formData.get("firstRegistration"));
  const costCenter = optional(formData.get("costCenter"));
  const location = optional(formData.get("location"));

  if (!licencePlate || licencePlate.length > PLATE_MAX_LENGTH || !/^[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9 -]*$/.test(licencePlate)) {
    return { error: "errorPlate" };
  }
  if (!make) return { error: "errorMake" };
  if (!model) return { error: "errorModel" };
  if (vin && !VIN_PATTERN.test(vin)) return { error: "errorVin" };
  if (firstRegistration && !isIsoDate(firstRegistration)) return { error: "errorFirstRegistration" };
  if ([make, model, costCenter, location].some((v) => v && v.length > TEXT_MAX_LENGTH)) {
    return { error: "errorTooLong" };
  }
  return { details: { licencePlate, make, model, vin, firstRegistration, costCenter, location } };
}

export function isRetirementReason(value: unknown): value is RetirementReason {
  return typeof value === "string" && (RETIREMENT_REASONS as readonly string[]).includes(value);
}

export async function plateTaken(actor: Actor, licencePlate: string, exceptCarId?: string) {
  const existing = await db.query.car.findFirst({
    where: and(eq(car.organizationId, actor.organizationId), eq(car.licencePlate, licencePlate)),
    columns: { id: true },
  });
  return Boolean(existing && existing.id !== exceptCarId);
}

export async function listCars(actor: Actor) {
  return db.query.car.findMany({
    where: eq(car.organizationId, actor.organizationId),
    orderBy: [asc(car.licencePlate)],
  });
}

// A car the actor may see, or undefined — callers answer "not found" either way.
export async function findCar(actor: Actor, carId: string) {
  if (!isCarId(carId)) return undefined;
  return db.query.car.findFirst({
    where: and(eq(car.id, carId), eq(car.organizationId, actor.organizationId)),
  });
}

export type FleetFilter = { location?: string; costCenter?: string; retired?: boolean };

export async function listFleet(actor: Actor, filter: FleetFilter = {}) {
  const cars = await db.query.car.findMany({
    where: and(
      eq(car.organizationId, actor.organizationId),
      filter.retired ? isNotNull(car.retiredOn) : isNull(car.retiredOn),
      filter.location ? eq(car.location, filter.location) : undefined,
      filter.costCenter ? eq(car.costCenter, filter.costCenter) : undefined,
    ),
    orderBy: [asc(car.licencePlate)],
  });
  return withLatestReading(cars);
}

// The distinct locations and cost centers in use, for the fleet filters.
export async function fleetFilterOptions(actor: Actor) {
  const rows = await db
    .selectDistinct({ location: car.location, costCenter: car.costCenter })
    .from(car)
    .where(and(eq(car.organizationId, actor.organizationId), isNull(car.retiredOn)));
  const unique = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));
  return { locations: unique(rows.map((r) => r.location)), costCenters: unique(rows.map((r) => r.costCenter)) };
}

export async function countRetired(actor: Actor) {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(car)
    .where(and(eq(car.organizationId, actor.organizationId), isNotNull(car.retiredOn)));
  return row?.count ?? 0;
}

async function withLatestReading<T extends { id: string }>(cars: T[]) {
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
