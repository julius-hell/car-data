"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { assertCan, requireActor } from "@/lib/actor";
import { countCompletionAttachments, filesFrom, readUploads, storeUploads } from "@/lib/attachments";
import { findCar } from "@/lib/cars";
import { parseCompletionForm, type CompletionState } from "@/lib/completion-form";
import { deleteCompletion, findCompletion, recordCompletion, updateCompletion } from "@/lib/completions";
import { intervalTypeName } from "@/lib/interval-names";
import { effectivePeriod, findCarInterval } from "@/lib/intervals";

async function requireCarInterval(carId: string, intervalId: string) {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const car = await findCar(actor, carId);
  if (!car) throw new Error("Invalid car.");
  const entry = await findCarInterval(actor.organizationId, car.id, intervalId);
  if (!entry) throw new Error("Invalid interval.");
  return { actor, car, entry };
}

export async function recordCompletionAction(
  carId: string,
  intervalId: string,
  _previous: CompletionState,
  formData: FormData,
): Promise<CompletionState> {
  const { actor, car, entry } = await requireCarInterval(carId, intervalId);
  const parsed = parseCompletionForm(formData, {
    subject: "car",
    precision: entry.type.precision,
    hasKm: effectivePeriod(entry).km !== null,
  });
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const files = await readUploads(filesFrom(formData));
  if ("error" in files) return { status: "error", message: files.error };

  const t = await getTranslations("Intervals");
  const created = await recordCompletion(actor, entry, parsed.input, parsed.override, intervalTypeName(entry.type, t));
  await storeUploads(files.uploads, { organizationId: actor.organizationId, carId: car.id, completionId: created.id }, actor.userId);
  revalidatePath(`/cars/${car.id}`);
  return { status: "saved" };
}

export async function updateCompletionAction(
  carId: string,
  intervalId: string,
  completionId: string,
  _previous: CompletionState,
  formData: FormData,
): Promise<CompletionState> {
  const { actor, car, entry } = await requireCarInterval(carId, intervalId);
  const existing = await findCompletion(entry.interval.id, completionId);
  if (!existing) throw new Error("Invalid completion.");
  const parsed = parseCompletionForm(formData, {
    subject: "car",
    precision: entry.type.precision,
    hasKm: effectivePeriod(entry).km !== null,
  });
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const files = await readUploads(filesFrom(formData), await countCompletionAttachments(existing.id));
  if ("error" in files) return { status: "error", message: files.error };

  const t = await getTranslations("Intervals");
  await updateCompletion(entry, existing, parsed.input, parsed.override, intervalTypeName(entry.type, t), actor);
  await storeUploads(files.uploads, { organizationId: actor.organizationId, carId: car.id, completionId: existing.id }, actor.userId);
  revalidatePath(`/cars/${car.id}`);
  return { status: "saved" };
}

export async function deleteCompletionAction(carId: string, intervalId: string, completionId: string) {
  const { car, entry } = await requireCarInterval(carId, intervalId);
  const existing = await findCompletion(entry.interval.id, completionId);
  if (!existing) throw new Error("Invalid completion.");
  await deleteCompletion(entry, existing);
  revalidatePath(`/cars/${car.id}`);
}
