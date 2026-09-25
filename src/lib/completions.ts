import { and, desc, eq } from "drizzle-orm";
import type { Actor } from "@/lib/actor";
import { attachmentsByCompletion, deleteAttachmentFiles } from "@/lib/attachments";
import { db } from "@/lib/db";
import { attachment, completion, interval, mileageEntry, type Completion, type CompletionResult } from "@/lib/db/schema";
import { nextDueAfter } from "@/lib/due";
import { effectivePeriod, type IntervalWithType } from "@/lib/intervals";

export type CompletionInput = {
  completedOn: string;
  odometer: number | null;
  result: CompletionResult | null;
  provider: string | null;
  costCents: number | null;
  note: string | null;
  licenceClasses?: string | null;
  licenceExpiresOn?: string | null;
};

export type DueOverride = { nextDueOn: string | null; nextDueOdometer: number | null } | null;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function computeNextDue(entry: IntervalWithType, input: CompletionInput, previousOdometer: number | null) {
  const period = effectivePeriod(entry);
  return nextDueAfter(
    input,
    { precision: entry.type.precision, periodMonths: period.months, periodKm: period.km },
    { nextDueOdometer: previousOdometer },
  );
}

// The newest completion of an interval: by completion date, then entry time.
async function latestCompletion(tx: Tx, intervalId: string) {
  return tx.query.completion.findFirst({
    where: eq(completion.intervalId, intervalId),
    orderBy: [desc(completion.completedOn), desc(completion.createdAt)],
  });
}

// Records a completion, keeps its odometer as a mileage entry of the car and
// moves the interval's next due date (an admin override wins).
export async function recordCompletion(
  actor: Actor,
  entry: IntervalWithType,
  input: CompletionInput,
  override: DueOverride,
  entryNote: string,
) {
  return db.transaction(async (tx) => {
    let mileageEntryId: string | null = null;
    if (entry.interval.carId && input.odometer !== null) {
      const [created] = await tx
        .insert(mileageEntry)
        .values({
          carId: entry.interval.carId,
          odometer: input.odometer,
          recordedAt: input.completedOn,
          note: entryNote,
          recordedBy: actor.userId,
          recordedByName: actor.name,
        })
        .returning({ id: mileageEntry.id });
      mileageEntryId = created.id;
    }
    const [created] = await tx
      .insert(completion)
      .values({
        intervalId: entry.interval.id,
        ...input,
        mileageEntryId,
        previousDueOn: entry.interval.nextDueOn,
        previousDueOdometer: entry.interval.nextDueOdometer,
        recordedBy: actor.userId,
        recordedByName: actor.name,
      })
      .returning();
    // A completion dated before the newest one is history; it doesn't move the due date.
    const latest = await latestCompletion(tx, entry.interval.id);
    if (latest?.id === created.id) {
      const next = override ?? computeNextDue(entry, input, entry.interval.nextDueOdometer);
      await tx.update(interval).set(next).where(eq(interval.id, entry.interval.id));
    }
    return created;
  });
}

export async function updateCompletion(
  entry: IntervalWithType,
  existing: Completion,
  input: CompletionInput,
  override: DueOverride,
  entryNote: string,
  actor: Actor,
) {
  await db.transaction(async (tx) => {
    let mileageEntryId = existing.mileageEntryId;
    if (entry.interval.carId && input.odometer !== null) {
      if (mileageEntryId) {
        await tx
          .update(mileageEntry)
          .set({ odometer: input.odometer, recordedAt: input.completedOn })
          .where(eq(mileageEntry.id, mileageEntryId));
      } else {
        const [created] = await tx
          .insert(mileageEntry)
          .values({
            carId: entry.interval.carId,
            odometer: input.odometer,
            recordedAt: input.completedOn,
            note: entryNote,
            recordedBy: actor.userId,
            recordedByName: actor.name,
          })
          .returning({ id: mileageEntry.id });
        mileageEntryId = created.id;
      }
    } else if (mileageEntryId) {
      await tx.delete(mileageEntry).where(eq(mileageEntry.id, mileageEntryId));
      mileageEntryId = null;
    }
    await tx.update(completion).set({ ...input, mileageEntryId }).where(eq(completion.id, existing.id));
    const latest = await latestCompletion(tx, entry.interval.id);
    if (latest?.id === existing.id) {
      const next = override ?? computeNextDue(entry, input, existing.previousDueOdometer);
      await tx.update(interval).set(next).where(eq(interval.id, entry.interval.id));
    }
  });
}

// Deleting the newest completion puts the due date back to what it was before.
export async function deleteCompletion(entry: IntervalWithType, existing: Completion) {
  const files = await db.query.attachment.findMany({ where: eq(attachment.completionId, existing.id) });
  await db.transaction(async (tx) => {
    const latest = await latestCompletion(tx, entry.interval.id);
    if (latest?.id === existing.id) {
      await tx
        .update(interval)
        .set({ nextDueOn: existing.previousDueOn, nextDueOdometer: existing.previousDueOdometer })
        .where(eq(interval.id, entry.interval.id));
    }
    if (existing.mileageEntryId) await tx.delete(mileageEntry).where(eq(mileageEntry.id, existing.mileageEntryId));
    await tx.delete(completion).where(eq(completion.id, existing.id));
  });
  await deleteAttachmentFiles(files);
}

export async function findCompletion(intervalId: string, completionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(completionId)) return undefined;
  return db.query.completion.findFirst({
    where: and(eq(completion.id, completionId), eq(completion.intervalId, intervalId)),
  });
}

export async function listCompletionsWithAttachments(intervalId: string) {
  const rows = await db.query.completion.findMany({
    where: eq(completion.intervalId, intervalId),
    orderBy: [desc(completion.completedOn), desc(completion.createdAt)],
  });
  const files = await attachmentsByCompletion(rows.map((row) => row.id));
  return rows.map((row) => ({ completion: row, attachments: files.get(row.id) ?? [] }));
}
