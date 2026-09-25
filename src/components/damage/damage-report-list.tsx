import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ResolveDamageForm } from "@/components/damage/resolve-damage-form";
import { isoDateToDate } from "@/lib/dates";
import type { Attachment, DamageReport } from "@/lib/db/schema";

export async function DamageReportList({
  reports,
  canResolve,
}: {
  reports: { report: DamageReport; photos: Attachment[]; plate?: string }[];
  canResolve: boolean;
}) {
  const [t, format] = await Promise.all([getTranslations("Damage"), getFormatter()]);
  const formatDate = (iso: string) => format.dateTime(isoDateToDate(iso), { dateStyle: "medium" });

  return (
    <ul className="flex flex-col gap-3" data-testid="damage-reports">
      {reports.map(({ report, photos, plate }) => (
        <li
          key={report.id}
          data-testid="damage-report"
          data-status={report.status}
          className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="damage-status"
              className={
                "rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase " +
                (report.status === "open"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")
              }
            >
              {t(`status.${report.status}`)}
            </span>
            {plate && (
              <Link href={`/cars/${report.carId}`} className="font-mono font-semibold underline-offset-4 hover:underline">
                {plate}
              </Link>
            )}
            <span className="text-muted-foreground">
              {t("reportedBy", { date: formatDate(report.occurredOn), name: report.reportedByName })}
            </span>
          </div>
          <p className="whitespace-pre-line" data-testid="damage-description">
            {report.description}
          </p>
          {photos.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <li key={photo.id}>
                  <a href={`/attachments/${photo.id}`} target="_blank" rel="noreferrer" data-testid="damage-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- served by our permission-checked route */}
                    <img
                      src={`/attachments/${photo.id}`}
                      alt={photo.fileName}
                      className="bg-muted size-20 rounded-md border object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
          {report.status === "resolved" && (
            <p className="text-muted-foreground" data-testid="damage-resolution">
              {t("resolvedBy", { name: report.resolvedByName ?? "—" })}
              {report.resolutionNote ? `: ${report.resolutionNote}` : ""}
            </p>
          )}
          {report.status === "open" && canResolve && <ResolveDamageForm reportId={report.id} />}
        </li>
      ))}
    </ul>
  );
}
