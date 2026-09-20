"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findOwnedCar, isCarId } from "@/lib/cars";
import { db } from "@/lib/db";
import { reminder } from "@/lib/db/schema";
import { findOwnedReminder } from "@/lib/reminders";
import { requireSession } from "@/lib/session";

const TITLE_MAX_LENGTH = 80;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type ReminderFormState =
  | { status: "idle" }
  | { status: "saved" }
  | {
      status: "error";
      message: "errorTitle" | "errorTarget" | "errorOdometer" | "errorDate";
      values: { title: string; targetOdometer: string; targetDate: string };
    };

type ParsedReminder = {
  title: string;
  targetOdometer: number | null;
  targetDate: string | null;
};

function parseReminder(formData: FormData): ParsedReminder | ReminderFormState {
  const title = String(formData.get("title") ?? "").trim();
  const odometerRaw = String(formData.get("targetOdometer") ?? "").trim();
  const dateRaw = String(formData.get("targetDate") ?? "").trim();
  const values = { title, targetOdometer: odometerRaw, targetDate: dateRaw };
  const fail = (message: Extract<ReminderFormState, { status: "error" }>["message"]): ReminderFormState => ({
    status: "error",
    message,
    values,
  });

  if (!title || title.length > TITLE_MAX_LENGTH) return fail("errorTitle");
  if (!odometerRaw && !dateRaw) return fail("errorTarget");

  let targetOdometer: number | null = null;
  if (odometerRaw) {
    targetOdometer = Number(odometerRaw);
    if (!Number.isInteger(targetOdometer) || targetOdometer < 0) return fail("errorOdometer");
  }
  let targetDate: string | null = null;
  if (dateRaw) {
    if (!ISO_DATE.test(dateRaw) || Number.isNaN(Date.parse(dateRaw))) return fail("errorDate");
    targetDate = dateRaw;
  }
  return { title, targetOdometer, targetDate };
}

function revalidate(carId: string) {
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
}

export async function createReminder(
  carId: string,
  _previous: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const { user } = await requireSession();
  const owned = await findOwnedCar(user.id, carId);
  if (!owned) throw new Error("Invalid car.");

  const parsed = parseReminder(formData);
  if ("status" in parsed) return parsed;

  await db.insert(reminder).values({ carId: owned.id, ...parsed });
  revalidate(owned.id);
  return { status: "saved" };
}

export async function updateReminder(
  reminderId: string,
  _previous: ReminderFormState,
  formData: FormData,
): Promise<ReminderFormState> {
  const { user } = await requireSession();
  const owned = await findOwnedReminder(user.id, reminderId);
  if (!owned) throw new Error("Invalid reminder.");

  const parsed = parseReminder(formData);
  if ("status" in parsed) return parsed;

  await db.update(reminder).set(parsed).where(eq(reminder.id, owned.id));
  revalidate(owned.carId);
  return { status: "saved" };
}

export async function completeReminder(reminderId: string) {
  const { user } = await requireSession();
  if (!isCarId(reminderId)) throw new Error("Invalid reminder.");
  const owned = await findOwnedReminder(user.id, reminderId);
  if (!owned) throw new Error("Invalid reminder.");

  await db.update(reminder).set({ doneAt: new Date() }).where(eq(reminder.id, owned.id));
  revalidate(owned.carId);
}

export async function deleteReminder(reminderId: string) {
  const { user } = await requireSession();
  if (!isCarId(reminderId)) throw new Error("Invalid reminder.");
  const owned = await findOwnedReminder(user.id, reminderId);
  if (!owned) throw new Error("Invalid reminder.");

  await db.delete(reminder).where(eq(reminder.id, owned.id));
  revalidate(owned.carId);
}
