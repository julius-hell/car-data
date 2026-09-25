"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { assertCan, requireActor } from "@/lib/actor";
import { countContractAttachments, filesFrom, readUploads, storeUploads, type AttachmentError } from "@/lib/attachments";
import { findCar, isIsoDate } from "@/lib/cars";
import { db } from "@/lib/db";
import { car as carTable, contract, mileageEntry } from "@/lib/db/schema";
import { getContract, parseContractForm, saveContract, type ContractFormError } from "@/lib/contracts";

export type ContractState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: ContractFormError | AttachmentError };

export async function saveContractAction(carId: string, _previous: ContractState, formData: FormData): Promise<ContractState> {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const car = await findCar(actor, carId);
  if (!car) throw new Error("Invalid car.");

  const parsed = parseContractForm(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const existing = await getContract(car.id);
  const files = await readUploads(filesFrom(formData), existing ? await countContractAttachments(existing.id) : 0);
  if ("error" in files) return { status: "error", message: files.error };

  const saved = await saveContract(car.id, parsed.values);
  await storeUploads(files.uploads, { organizationId: actor.organizationId, carId: car.id, contractId: saved.id }, actor.userId);
  revalidatePath(`/cars/${car.id}`);
  revalidatePath("/cars");
  return { status: "saved" };
}

export type ReturnState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: "errorDate" | "errorOdometer" | "errorText" | "errorNotReturnable" | AttachmentError };

// The handover at the end of a lease or rental: the final odometer becomes a
// mileage entry and the car is retired as returned.
export async function recordReturnAction(carId: string, _previous: ReturnState, formData: FormData): Promise<ReturnState> {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const car = await findCar(actor, carId);
  if (!car) throw new Error("Invalid car.");
  const existing = await getContract(car.id);
  if (!existing || (existing.kind !== "leased" && existing.kind !== "rented") || existing.returnedOn) {
    return { status: "error", message: "errorNotReturnable" };
  }

  const returnedOn = String(formData.get("returnedOn") ?? "");
  if (!isIsoDate(returnedOn)) return { status: "error", message: "errorDate" };
  const odometer = Number(formData.get("returnOdometer"));
  if (String(formData.get("returnOdometer") ?? "").trim() === "" || !Number.isInteger(odometer) || odometer < 0) {
    return { status: "error", message: "errorOdometer" };
  }
  const notes = String(formData.get("returnNotes") ?? "").trim() || null;
  if (notes && notes.length > 2000) return { status: "error", message: "errorText" };
  const files = await readUploads(filesFrom(formData));
  if ("error" in files) return { status: "error", message: files.error };

  const t = await getTranslations("Contracts");
  await db.transaction(async (tx) => {
    await tx
      .update(contract)
      .set({ returnedOn, returnOdometer: odometer, returnNotes: notes, updatedAt: new Date() })
      .where(eq(contract.id, existing.id));
    await tx.insert(mileageEntry).values({
      carId: car.id,
      odometer,
      recordedAt: returnedOn,
      note: t("returnEntryNote"),
      recordedBy: actor.userId,
      recordedByName: actor.name,
    });
    await tx.update(carTable).set({ retiredOn: returnedOn, retirementReason: "returned" }).where(eq(carTable.id, car.id));
  });
  await storeUploads(
    files.uploads,
    { organizationId: actor.organizationId, carId: car.id, returnOfContractId: existing.id },
    actor.userId,
  );
  revalidatePath(`/cars/${car.id}`);
  revalidatePath("/cars");
  return { status: "saved" };
}
