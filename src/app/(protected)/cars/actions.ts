"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCan, requireActor } from "@/lib/actor";
import {
  type CarDetailsError,
  findCar,
  isCarId,
  isIsoDate,
  isRetirementReason,
  parseCarDetails,
  plateTaken,
} from "@/lib/cars";
import { db } from "@/lib/db";
import { car } from "@/lib/db/schema";
import { deleteCarPhoto } from "@/lib/photos";
import { defaultFirstHu, trackDefaultIntervals } from "@/lib/intervals";
import { parseDueDate } from "@/lib/interval-form";

export type CarFormState =
  | { status: "idle" }
  | { status: "saved"; carId: string }
  | { status: "error"; message: CarDetailsError | "errorPlateTaken" | "errorDue" };

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "cause" in error
    ? (error.cause as { code?: string })?.code === "23505"
    : (error as { code?: string })?.code === "23505";
}

async function requireFleetManager() {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  return actor;
}

export async function createCar(_previous: CarFormState, formData: FormData): Promise<CarFormState> {
  const actor = await requireFleetManager();
  const parsed = parseCarDetails(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  if (await plateTaken(actor, parsed.details.licencePlate)) return { status: "error", message: "errorPlateTaken" };
  const hu = parseDueDate(formData.get("nextHu"), "month");
  const uvv = parseDueDate(formData.get("nextUvv"), "day");
  const service = parseDueDate(formData.get("nextService"), "day");
  const serviceKmText = String(formData.get("nextServiceKm") ?? "").trim();
  const serviceKm = serviceKmText === "" ? null : Number(serviceKmText);
  if ("error" in hu || "error" in uvv || "error" in service) return { status: "error", message: "errorDue" };
  if (serviceKm !== null && (!Number.isInteger(serviceKm) || serviceKm < 0)) {
    return { status: "error", message: "errorDue" };
  }

  try {
    const [created] = await db
      .insert(car)
      .values({ organizationId: actor.organizationId, ...parsed.details })
      .returning({ id: car.id });
    await trackDefaultIntervals(actor.organizationId, created.id, {
      hu: { nextDueOn: hu.value ?? defaultFirstHu(parsed.details.firstRegistration) },
      uvv_inspection: { nextDueOn: uvv.value },
      service: { nextDueOn: service.value, nextDueOdometer: serviceKm },
    });
    revalidatePath("/cars");
    return { status: "saved", carId: created.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "error", message: "errorPlateTaken" };
    throw error;
  }
}

export async function updateCar(carId: string, _previous: CarFormState, formData: FormData): Promise<CarFormState> {
  const actor = await requireFleetManager();
  const existing = await findCar(actor, carId);
  if (!existing) throw new Error("Invalid car.");
  const parsed = parseCarDetails(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  if (await plateTaken(actor, parsed.details.licencePlate, existing.id)) {
    return { status: "error", message: "errorPlateTaken" };
  }

  try {
    await db.update(car).set(parsed.details).where(eq(car.id, existing.id));
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "error", message: "errorPlateTaken" };
    throw error;
  }
  revalidatePath(`/cars/${existing.id}`);
  revalidatePath("/cars");
  return { status: "saved", carId: existing.id };
}

export type RetireState = { status: "idle" } | { status: "saved" } | { status: "error"; message: "errorDate" | "errorReason" };

export async function retireCar(carId: string, _previous: RetireState, formData: FormData): Promise<RetireState> {
  const actor = await requireFleetManager();
  const existing = await findCar(actor, carId);
  if (!existing) throw new Error("Invalid car.");
  const retiredOn = formData.get("retiredOn");
  const reason = formData.get("reason");
  if (!isIsoDate(retiredOn)) return { status: "error", message: "errorDate" };
  if (!isRetirementReason(reason)) return { status: "error", message: "errorReason" };

  await db.update(car).set({ retiredOn, retirementReason: reason }).where(eq(car.id, existing.id));
  revalidatePath(`/cars/${existing.id}`);
  revalidatePath("/cars");
  return { status: "saved" };
}

export async function reactivateCar(carId: string) {
  const actor = await requireFleetManager();
  const existing = await findCar(actor, carId);
  if (!existing) throw new Error("Invalid car.");
  await db.update(car).set({ retiredOn: null, retirementReason: null }).where(eq(car.id, existing.id));
  revalidatePath(`/cars/${existing.id}`);
  revalidatePath("/cars");
}

export async function deleteCar(carId: string) {
  const actor = await requireFleetManager();
  if (!isCarId(carId)) throw new Error("Invalid car.");

  const [deleted] = await db
    .delete(car)
    .where(and(eq(car.id, carId), eq(car.organizationId, actor.organizationId)))
    .returning({ id: car.id });
  if (deleted) await deleteCarPhoto(deleted.id);
  revalidatePath("/cars");
  redirect("/cars");
}
