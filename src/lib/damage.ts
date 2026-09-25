import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { can, type Actor } from "@/lib/actor";
import { db } from "@/lib/db";
import { attachment, car, damageReport, type Attachment } from "@/lib/db/schema";

export const DESCRIPTION_MAX_LENGTH = 2000;

async function withPhotos<T extends { id: string }>(reports: T[]) {
  if (reports.length === 0) return [];
  const photos = await db.query.attachment.findMany({
    where: inArray(attachment.damageReportId, reports.map((r) => r.id)),
    orderBy: [asc(attachment.createdAt)],
  });
  const byReport = new Map<string, Attachment[]>();
  for (const photo of photos) byReport.set(photo.damageReportId!, [...(byReport.get(photo.damageReportId!) ?? []), photo]);
  return reports.map((report) => ({ report, photos: byReport.get(report.id) ?? [] }));
}

// A car's reports as the actor may see them: all for admins and viewers,
// their own for drivers. Open ones first.
export async function listCarReports(actor: Actor, carId: string) {
  const reports = await db.query.damageReport.findMany({
    where: and(
      eq(damageReport.carId, carId),
      can(actor, "viewFleet") ? undefined : eq(damageReport.reportedBy, actor.userId),
    ),
    orderBy: [desc(damageReport.status), desc(damageReport.occurredOn), desc(damageReport.createdAt)],
  });
  return withPhotos(reports);
}

// Every open report of the fleet, for admins and viewers.
export async function listOpenReports(actor: Actor) {
  const rows = await db
    .select({ report: damageReport, plate: car.licencePlate })
    .from(damageReport)
    .innerJoin(car, eq(car.id, damageReport.carId))
    .where(and(eq(car.organizationId, actor.organizationId), eq(damageReport.status, "open")))
    .orderBy(desc(damageReport.occurredOn), desc(damageReport.createdAt));
  const reports = await withPhotos(rows.map((row) => row.report));
  return reports.map((entry, index) => ({ ...entry, plate: rows[index].plate }));
}

export async function findReport(actor: Actor, reportId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(reportId)) return undefined;
  const [row] = await db
    .select({ report: damageReport })
    .from(damageReport)
    .innerJoin(car, eq(car.id, damageReport.carId))
    .where(and(eq(damageReport.id, reportId), eq(car.organizationId, actor.organizationId)));
  return row?.report;
}
