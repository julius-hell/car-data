"use server";

import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/actor";
import { assign, endAssignment } from "@/lib/assignments";
import { findCar, isIsoDate } from "@/lib/cars";

export type AssignState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: "errorMember" | "errorDate" | "errorUntil" | "errorOverlap" };

export async function assignDriver(carId: string, _previous: AssignState, formData: FormData): Promise<AssignState> {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const found = await findCar(actor, carId);
  if (!found) throw new Error("Invalid car.");

  const userId = String(formData.get("userId") ?? "");
  const startsOn = formData.get("startsOn");
  const endsOnRaw = String(formData.get("endsOn") ?? "").trim();
  if (!isIsoDate(startsOn)) return { status: "error", message: "errorDate" };
  const endsOn = endsOnRaw === "" ? null : endsOnRaw;
  if (endsOn !== null && (!isIsoDate(endsOn) || endsOn < startsOn)) return { status: "error", message: "errorUntil" };

  const result = await assign(actor.organizationId, found.id, userId, startsOn, endsOn);
  if (result === "notAssignable") return { status: "error", message: "errorMember" };
  if (result === "overlap") return { status: "error", message: "errorOverlap" };
  revalidatePath(`/cars/${found.id}`);
  return { status: "saved" };
}

export type EndAssignmentState = { status: "idle" } | { status: "error"; message: "errorDate" | "errorBeforeStart" };

export async function endAssignmentAction(
  carId: string,
  assignmentId: string,
  _previous: EndAssignmentState,
  formData: FormData,
): Promise<EndAssignmentState> {
  const actor = await requireActor();
  assertCan(actor, "manageFleet");
  const found = await findCar(actor, carId);
  if (!found) throw new Error("Invalid car.");
  const endsOn = formData.get("endsOn");
  if (!isIsoDate(endsOn)) return { status: "error", message: "errorDate" };
  const result = await endAssignment(found.id, assignmentId, endsOn);
  if (result === "beforeStart") return { status: "error", message: "errorBeforeStart" };
  revalidatePath(`/cars/${found.id}`);
  return { status: "idle" };
}
