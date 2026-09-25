"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/actor";
import { countCompletionAttachments, filesFrom, readUploads, storeUploads } from "@/lib/attachments";
import { parseCompletionForm, type CompletionState } from "@/lib/completion-form";
import { deleteCompletion, findCompletion, recordCompletion, updateCompletion } from "@/lib/completions";
import { db } from "@/lib/db";
import { interval } from "@/lib/db/schema";
import { parseDueFields, type IntervalFormState } from "@/lib/interval-form";
import { findDriverInterval } from "@/lib/intervals";
import { findMember } from "@/lib/organizations";

// Driver checks hold personal data; only admins manage them.
async function requireDriverInterval(userId: string, intervalId: string) {
  const actor = await requireActor();
  assertCan(actor, "manageMembers");
  if (!(await findMember(actor.organizationId, userId))) throw new Error("Invalid member.");
  const entry = await findDriverInterval(actor.organizationId, userId, intervalId);
  if (!entry) throw new Error("Invalid interval.");
  return { actor, entry };
}

const kindOf = (builtIn: string | null) => (builtIn === "licence_check" ? "licence" : "driver");

export async function updateDriverInterval(
  userId: string,
  intervalId: string,
  _previous: IntervalFormState,
  formData: FormData,
): Promise<IntervalFormState> {
  const { entry } = await requireDriverInterval(userId, intervalId);
  const parsed = parseDueFields(formData, entry.type.precision);
  if ("error" in parsed) return { status: "error", message: parsed.error };
  await db
    .update(interval)
    .set({ nextDueOn: parsed.values.nextDueOn, periodMonths: parsed.values.periodMonths })
    .where(eq(interval.id, entry.interval.id));
  revalidatePath(`/team/members/${userId}`);
  return { status: "saved" };
}

export async function recordDriverCheck(
  userId: string,
  intervalId: string,
  _previous: CompletionState,
  formData: FormData,
): Promise<CompletionState> {
  const { actor, entry } = await requireDriverInterval(userId, intervalId);
  const parsed = parseCompletionForm(formData, { subject: "driver", precision: entry.type.precision, hasKm: false });
  if ("error" in parsed) return { status: "error", message: parsed.error };
  // No licence images: licence checks take no files at all.
  const files = kindOf(entry.type.builtIn) === "licence" ? { uploads: [] } : await readUploads(filesFrom(formData));
  if ("error" in files) return { status: "error", message: files.error };

  const created = await recordCompletion(actor, entry, parsed.input, parsed.override, "");
  await storeUploads(files.uploads, { organizationId: actor.organizationId, userId, completionId: created.id }, actor.userId);
  revalidatePath(`/team/members/${userId}`);
  return { status: "saved" };
}

export async function updateDriverCheck(
  userId: string,
  intervalId: string,
  completionId: string,
  _previous: CompletionState,
  formData: FormData,
): Promise<CompletionState> {
  const { actor, entry } = await requireDriverInterval(userId, intervalId);
  const existing = await findCompletion(entry.interval.id, completionId);
  if (!existing) throw new Error("Invalid completion.");
  const parsed = parseCompletionForm(formData, { subject: "driver", precision: entry.type.precision, hasKm: false });
  if ("error" in parsed) return { status: "error", message: parsed.error };
  const files =
    kindOf(entry.type.builtIn) === "licence"
      ? { uploads: [] }
      : await readUploads(filesFrom(formData), await countCompletionAttachments(existing.id));
  if ("error" in files) return { status: "error", message: files.error };

  await updateCompletion(entry, existing, parsed.input, parsed.override, "", actor);
  await storeUploads(files.uploads, { organizationId: actor.organizationId, userId, completionId: existing.id }, actor.userId);
  revalidatePath(`/team/members/${userId}`);
  return { status: "saved" };
}

export async function deleteDriverCheck(userId: string, intervalId: string, completionId: string) {
  const { entry } = await requireDriverInterval(userId, intervalId);
  const existing = await findCompletion(entry.interval.id, completionId);
  if (!existing) throw new Error("Invalid completion.");
  await deleteCompletion(entry, existing);
  revalidatePath(`/team/members/${userId}`);
}
