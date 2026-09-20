import { CheckIcon, Trash2Icon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { completeReminder, deleteReminder } from "@/app/(protected)/cars/[carId]/reminder-actions";
import { ReminderDialog } from "@/components/reminder-dialog";
import { Button } from "@/components/ui/button";
import { isoDateToDate } from "@/lib/dates";
import type { Reminder, Unit } from "@/lib/db/schema";
import { reminderStatus, type ReminderLevel } from "@/lib/reminders";
import { cn } from "@/lib/utils";

const levelStyles: Record<ReminderLevel, string> = {
  ok: "bg-muted text-muted-foreground",
  soon: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  overdue: "bg-destructive/15 text-destructive",
};

export async function ReminderList({
  carId,
  unit,
  reminders,
  latestOdometer,
  perDay,
  now,
}: {
  carId: string;
  unit: Unit;
  reminders: Reminder[];
  latestOdometer: number | null;
  perDay: number | null;
  now: Date;
}) {
  const [t, format] = await Promise.all([getTranslations("Reminders"), getFormatter()]);
  const date = (value: Date) => format.dateTime(value, { dateStyle: "medium" });
  const open = reminders.filter((r) => r.doneAt === null);
  const done = reminders.filter((r) => r.doneAt !== null);

  const targets = (item: Reminder) =>
    [
      item.targetOdometer !== null && t("atOdometer", { value: format.number(item.targetOdometer), unit }),
      item.targetDate !== null && t("byDate", { date: date(isoDateToDate(item.targetDate)) }),
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <section className="flex min-w-0 flex-col gap-3" data-testid="reminders">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("heading")}
        </h2>
        <ReminderDialog carId={carId} unit={unit} />
      </div>

      {open.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <ul className="bg-card divide-y rounded-xl border shadow-xs">
          {open.map((item) => {
            const status = reminderStatus(item, { latestOdometer, perDay, now });
            const details = [
              status.remainingDistance !== null &&
                (status.remainingDistance > 0
                  ? t("toGo", { value: format.number(status.remainingDistance), unit })
                  : t("reached")),
              status.estimatedDate !== null && t("estimated", { date: date(status.estimatedDate) }),
              status.daysLeft !== null &&
                (status.daysLeft >= 0
                  ? t("daysLeft", { count: status.daysLeft })
                  : t("daysOver", { count: -status.daysLeft })),
            ].filter(Boolean);
            return (
              <li
                key={item.id}
                data-testid="reminder"
                data-level={status.level}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{item.title}</span>
                    {status.level !== "ok" && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
                          levelStyles[status.level],
                        )}
                      >
                        {t(status.level)}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm">{targets(item)}</span>
                  {details.length > 0 && (
                    <span className="text-sm tabular-nums">{details.join(" · ")}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={completeReminder.bind(null, item.id)}>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      aria-label={t("doneLabel", { title: item.title })}
                    >
                      <CheckIcon className="size-4" />
                      {t("done")}
                    </Button>
                  </form>
                  <ReminderDialog carId={carId} unit={unit} reminder={item} />
                  <form action={deleteReminder.bind(null, item.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("deleteLabel", { title: item.title })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <details className="group text-sm">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer select-none">
            {t("completed", { count: done.length })}
          </summary>
          <ul className="bg-card mt-2 divide-y rounded-xl border shadow-xs" data-testid="completed-reminders">
            {done.map((item) => (
              <li key={item.id} className="text-muted-foreground flex items-center gap-3 px-4 py-2">
                <CheckIcon aria-hidden className="size-4" />
                <span className="min-w-0 flex-1 truncate">
                  {item.title}
                  <span className="text-xs"> · {targets(item)}</span>
                </span>
                <form action={deleteReminder.bind(null, item.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("deleteLabel", { title: item.title })}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
