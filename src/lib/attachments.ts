import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, count, eq, inArray } from "drizzle-orm";
import { can, type Actor } from "@/lib/actor";
import { db } from "@/lib/db";
import { attachment, completion, damageReport, interval, intervalType, type Attachment } from "@/lib/db/schema";
import { carFilesDir, userFilesDir } from "@/lib/files";

export const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
export const ATTACHMENTS_PER_OWNER = 10;

// Recognised by their first bytes, not by the name or the browser's claim.
export function detectContentType(bytes: Buffer): string | null {
  const ascii = (start: number, end: number) => bytes.subarray(start, end).toString("latin1");
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && ["heic", "heix", "mif1", "msf1", "heis", "hevc"].includes(ascii(8, 12))) {
    return "image/heic";
  }
  return null;
}

export type AttachmentOwner = {
  organizationId: string;
  carId?: string | null;
  userId?: string | null;
  completionId?: string;
  contractId?: string;
  returnOfContractId?: string;
  damageReportId?: string;
};

export type AttachmentError = "errorFileTooLarge" | "errorFileType" | "errorTooManyFiles";

// The uploaded files of a form field, ignoring the empty entry browsers send
// when nothing was picked.
export function filesFrom(formData: FormData, field = "files") {
  return formData.getAll(field).filter((value): value is File => value instanceof File && value.size > 0);
}

export type Upload = { name: string; bytes: Buffer; contentType: string };

// Checks files before anything is written, so a bad file rejects the whole form.
export async function readUploads(
  files: File[],
  existing = 0,
  { imagesOnly = false }: { imagesOnly?: boolean } = {},
): Promise<{ uploads: Upload[] } | { error: AttachmentError }> {
  if (existing + files.length > ATTACHMENTS_PER_OWNER) return { error: "errorTooManyFiles" };
  const uploads: Upload[] = [];
  for (const file of files) {
    if (file.size > ATTACHMENT_MAX_BYTES) return { error: "errorFileTooLarge" };
    const bytes = Buffer.from(await file.arrayBuffer());
    const contentType = detectContentType(bytes);
    if (!contentType || (imagesOnly && !contentType.startsWith("image/"))) return { error: "errorFileType" };
    uploads.push({ name: file.name.slice(0, 200) || "file", bytes, contentType });
  }
  return { uploads };
}

function attachmentPath(row: Pick<Attachment, "id" | "carId" | "userId">) {
  const dir = row.carId ? carFilesDir(row.carId) : userFilesDir(row.userId!);
  return path.join(/* turbopackIgnore: true */ dir, "attachments", row.id);
}

export async function storeUploads(
  uploads: Upload[],
  owner: AttachmentOwner,
  uploadedBy: string,
) {
  for (const upload of uploads) {
    const [row] = await db
      .insert(attachment)
      .values({
        organizationId: owner.organizationId,
        carId: owner.carId ?? null,
        userId: owner.carId ? null : (owner.userId ?? null),
        completionId: owner.completionId,
        contractId: owner.contractId,
        returnOfContractId: owner.returnOfContractId,
        damageReportId: owner.damageReportId,
        fileName: upload.name,
        contentType: upload.contentType,
        size: upload.bytes.length,
        uploadedBy,
      })
      .returning();
    const file = attachmentPath(row);
    await mkdir(/* turbopackIgnore: true */ path.dirname(file), { recursive: true });
    await writeFile(/* turbopackIgnore: true */ file, upload.bytes);
  }
}

export async function countCompletionAttachments(completionId: string) {
  const [row] = await db.select({ count: count() }).from(attachment).where(eq(attachment.completionId, completionId));
  return row?.count ?? 0;
}

export async function countContractAttachments(contractId: string) {
  const [row] = await db.select({ count: count() }).from(attachment).where(eq(attachment.contractId, contractId));
  return row?.count ?? 0;
}

export async function listContractAttachments(contractId: string) {
  return db.query.attachment.findMany({ where: eq(attachment.contractId, contractId) });
}

export async function listReturnAttachments(contractId: string) {
  return db.query.attachment.findMany({ where: eq(attachment.returnOfContractId, contractId) });
}

export async function attachmentsByCompletion(completionIds: string[]) {
  const byCompletion = new Map<string, Attachment[]>();
  if (completionIds.length === 0) return byCompletion;
  const rows = await db.query.attachment.findMany({ where: inArray(attachment.completionId, completionIds) });
  for (const row of rows) {
    byCompletion.set(row.completionId!, [...(byCompletion.get(row.completionId!) ?? []), row]);
  }
  return byCompletion;
}

// Removes the files of attachment rows that are about to be (or were) deleted.
export async function deleteAttachmentFiles(rows: Pick<Attachment, "id" | "carId" | "userId">[]) {
  await Promise.all(rows.map((row) => rm(/* turbopackIgnore: true */ attachmentPath(row), { force: true })));
}

export async function readAttachmentFile(row: Attachment) {
  try {
    return await readFile(/* turbopackIgnore: true */ attachmentPath(row));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

// An attachment the actor may download, or undefined.
export async function findViewableAttachment(actor: Actor, attachmentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(attachmentId)) return undefined;
  const row = await db.query.attachment.findFirst({
    where: and(eq(attachment.id, attachmentId), eq(attachment.organizationId, actor.organizationId)),
  });
  if (!row) return undefined;
  if (row.completionId) {
    const [owner] = await db
      .select({ subject: intervalType.subject })
      .from(completion)
      .innerJoin(interval, eq(interval.id, completion.intervalId))
      .innerJoin(intervalType, eq(intervalType.id, interval.intervalTypeId))
      .where(eq(completion.id, row.completionId));
    if (!owner) return undefined;
    // Completions are fleet records; driver checks are personal data for admins only.
    const allowed = owner.subject === "car" ? can(actor, "viewFleet") : can(actor, "manageMembers");
    return allowed ? row : undefined;
  }
  // Contracts are fleet records; drivers see only the end date, not the documents.
  if (row.contractId || row.returnOfContractId) return can(actor, "viewFleet") ? row : undefined;
  // Damage photos: the whole fleet for admins and viewers, their own reports for drivers.
  if (row.damageReportId) {
    if (can(actor, "viewFleet")) return row;
    const report = await db.query.damageReport.findFirst({ where: eq(damageReport.id, row.damageReportId) });
    return report?.reportedBy === actor.userId ? row : undefined;
  }
  return undefined;
}
