"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/actor";
import { filesFrom, readUploads, storeUploads, type AttachmentError } from "@/lib/attachments";
import { findCar, isIsoDate } from "@/lib/cars";
import { DESCRIPTION_MAX_LENGTH, findReport } from "@/lib/damage";
import { db } from "@/lib/db";
import { damageReport } from "@/lib/db/schema";

export type DamageState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: "errorDate" | "errorDescription" | "errorNote" | AttachmentError };

// Drivers report for the cars assigned to them; admins for any car.
export async function reportDamage(carId: string, _previous: DamageState, formData: FormData): Promise<DamageState> {
  const actor = await requireActor();
  assertCan(actor, "addEntry");
  const car = await findCar(actor, carId);
  if (!car) throw new Error("Invalid car.");

  const occurredOn = formData.get("occurredOn");
  const description = String(formData.get("description") ?? "").trim();
  if (!isIsoDate(occurredOn)) return { status: "error", message: "errorDate" };
  if (!description || description.length > DESCRIPTION_MAX_LENGTH) return { status: "error", message: "errorDescription" };
  const files = await readUploads(filesFrom(formData, "photos"), 0, { imagesOnly: true });
  if ("error" in files) return { status: "error", message: files.error };

  const [created] = await db
    .insert(damageReport)
    .values({ carId: car.id, occurredOn, description, reportedBy: actor.userId, reportedByName: actor.name })
    .returning();
  await storeUploads(files.uploads, { organizationId: actor.organizationId, carId: car.id, damageReportId: created.id }, actor.userId);
  revalidatePath(`/cars/${car.id}`);
  revalidatePath("/damage");
  return { status: "saved" };
}

export async function resolveDamage(reportId: string, _previous: DamageState, formData: FormData): Promise<DamageState> {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const report = await findReport(actor, reportId);
  if (!report) throw new Error("Invalid report.");
  const note = String(formData.get("resolutionNote") ?? "").trim();
  if (note.length > DESCRIPTION_MAX_LENGTH) return { status: "error", message: "errorNote" };

  await db
    .update(damageReport)
    .set({
      status: "resolved",
      resolvedBy: actor.userId,
      resolvedByName: actor.name,
      resolvedAt: new Date(),
      resolutionNote: note || null,
    })
    .where(eq(damageReport.id, report.id));
  revalidatePath(`/cars/${report.carId}`);
  revalidatePath("/damage");
  return { status: "saved" };
}
