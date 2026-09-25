import { getFormatter, getTranslations } from "next-intl/server";
import { isoDateToDate } from "@/lib/dates";
import type { DueItem } from "@/lib/due-items";
import { intervalTypeName } from "@/lib/interval-names";

// The name of a due item ("HU/AU", "Contract end", …).
export async function dueItemTitle(item: DueItem) {
  const [t, ti] = await Promise.all([getTranslations("Dashboard"), getTranslations("Intervals")]);
  if (item.intervalType) return intervalTypeName(item.intervalType, ti);
  return t(`kinds.${item.kind}`);
}

// When it is due, in words.
export async function dueItemWhen(item: DueItem) {
  const [t, format] = await Promise.all([getTranslations("Dashboard"), getFormatter()]);
  if (item.kind === "damage") {
    return t("reportedOn", { date: format.dateTime(isoDateToDate(item.date!), { dateStyle: "medium" }) });
  }
  if (item.kind === "allowance") {
    return item.km !== null && item.km > 0 ? t("projectedOver", { km: item.km }) : t("allowanceOk");
  }
  if (!item.date) return t("noDueDate");
  const date =
    item.precision === "month"
      ? format.dateTime(isoDateToDate(item.date), { month: "long", year: "numeric" })
      : format.dateTime(isoDateToDate(item.date), { dateStyle: "medium" });
  return item.kind === "contractEnd" ? t("endsOn", { date }) : t("dueOn", { date });
}
