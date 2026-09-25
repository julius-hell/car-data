import { getFormatter, getTranslations } from "next-intl/server";
import { isoDateToDate } from "@/lib/dates";
import type { DuePrecision, DueStatus } from "@/lib/due";

// "Due March 2027 · 180 days left · 4,000 km to go ≈ 12 May 2027"
export async function DueSummary({
  status,
  precision,
  nextDueOn,
  nextDueOdometer,
}: {
  status: DueStatus;
  precision: DuePrecision;
  nextDueOn: string | null;
  nextDueOdometer: number | null;
}) {
  const [t, format] = await Promise.all([getTranslations("Due"), getFormatter()]);
  const formatDate = (iso: string) => format.dateTime(isoDateToDate(iso), { dateStyle: "medium" });
  const parts: string[] = [];
  if (nextDueOn) {
    parts.push(
      precision === "month"
        ? t("dueMonth", { month: format.dateTime(isoDateToDate(nextDueOn), { month: "long", year: "numeric" }) })
        : t("dueDate", { date: formatDate(nextDueOn) }),
    );
    if (status.daysLeft !== null) {
      parts.push(
        status.daysLeft >= 0 ? t("daysLeft", { count: status.daysLeft }) : t("daysOverdue", { count: -status.daysLeft }),
      );
    }
  }
  if (nextDueOdometer !== null) {
    parts.push(t("atOdometer", { odometer: format.number(nextDueOdometer) }));
    if (status.remainingKm !== null) {
      parts.push(
        status.remainingKm > 0
          ? t("kmToGo", { km: format.number(status.remainingKm) })
          : t("kmOverdue", { km: format.number(-status.remainingKm) }),
      );
    }
    if (status.estimatedDate) parts.push(t("estimated", { date: formatDate(status.estimatedDate) }));
  }
  if (parts.length === 0) parts.push(t("noDueDate"));
  return <span data-testid="due-summary">{parts.join(" · ")}</span>;
}
