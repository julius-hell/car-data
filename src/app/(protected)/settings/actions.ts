"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { regenerateCalendarToken } from "@/lib/calendar";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export async function setDigestOptIn(optIn: boolean) {
  const actor = await requireActor();
  if (actor.role !== "admin") throw new Error("Not allowed.");
  await db.update(user).set({ digestOptIn: optIn }).where(eq(user.id, actor.userId));
  revalidatePath("/settings");
}

export async function regenerateCalendarUrl() {
  const actor = await requireActor();
  await regenerateCalendarToken(actor.userId);
  revalidatePath("/settings");
}

