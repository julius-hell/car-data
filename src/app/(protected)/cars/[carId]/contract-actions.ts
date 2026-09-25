"use server";

import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/actor";
import { countContractAttachments, filesFrom, readUploads, storeUploads, type AttachmentError } from "@/lib/attachments";
import { findCar } from "@/lib/cars";
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
