import { getTranslations } from "next-intl/server";
import {
  deleteCompletionAction,
  recordCompletionAction,
  updateCompletionAction,
} from "@/app/(protected)/cars/[carId]/completion-actions";
import {
  startTrackingInterval,
  stopTrackingInterval,
  updateCarInterval,
} from "@/app/(protected)/cars/[carId]/interval-actions";
import { CompletionDialog } from "@/components/completions/completion-dialog";
import { CompletionHistory } from "@/components/completions/completion-history";
import { DueBadge } from "@/components/due-badge";
import { DueSummary } from "@/components/intervals/due-summary";
import { IntervalEditDialog } from "@/components/intervals/interval-edit-dialog";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import type { Car } from "@/lib/db/schema";
import { intervalTypeName } from "@/lib/interval-names";
import { effectivePeriod, listCarIntervals, listIntervalTypes, odometerContext, statusOf } from "@/lib/intervals";
import { listCompletionsWithAttachments } from "@/lib/completions";
import { todayIso } from "@/lib/today";

// A car's intervals with their due status; admins also edit and track them.
export async function CarIntervals({
  car,
  organizationId,
  canManage,
  showHistory,
}: {
  car: Car;
  organizationId: string;
  canManage: boolean;
  // Completions are fleet records: admins and viewers see them, drivers don't.
  showHistory: boolean;
}) {
  const [intervals, context, types, t, tc] = await Promise.all([
    listCarIntervals(car.id),
    odometerContext([car.id]),
    canManage ? listIntervalTypes(organizationId) : Promise.resolve([]),
    getTranslations("Intervals"),
    getTranslations("Completions"),
  ]);
  const histories = showHistory
    ? new Map(
        await Promise.all(
          intervals.map(async (i) => [i.interval.id, await listCompletionsWithAttachments(i.interval.id)] as const),
        ),
      )
    : new Map();
  const today = todayIso();
  const odometer = context.get(car.id) ?? { latestOdometer: null, kmPerDay: null };
  const tracked = new Set(intervals.map((i) => i.type.id));
  const untracked = types.filter((type) => type.subject === "car" && !tracked.has(type.id));

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("title")}</h2>
      {intervals.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <ul className="flex flex-col divide-y" data-testid="intervals">
          {intervals.map((entry) => {
            const name = intervalTypeName(entry.type, t);
            const period = effectivePeriod(entry);
            const status = statusOf(entry, { today, ...odometer });
            return (
              <li
                key={entry.interval.id}
                data-testid="interval"
                data-name={name}
                data-level={status.level}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{name}</span>
                    <DueBadge level={status.level} testId="interval-level" />
                  </div>
                  <span className="text-muted-foreground text-sm">
                    <DueSummary
                      status={status}
                      precision={entry.type.precision}
                      nextDueOn={entry.interval.nextDueOn}
                      nextDueOdometer={period.km !== null ? entry.interval.nextDueOdometer : null}
                    />
                  </span>
                  <span className="text-muted-foreground text-xs" data-testid="interval-period">
                    {period.km
                      ? t("everyMonthsOrKm", { months: period.months, km: period.km })
                      : t("everyMonths", { months: period.months })}
                  </span>
                  {showHistory && (
                    <CompletionHistory
                      name={name}
                      kind="car"
                      precision={entry.type.precision}
                      hasKm={period.km !== null}
                      completions={histories.get(entry.interval.id) ?? []}
                      editAction={
                        canManage ? updateCompletionAction.bind(null, car.id, entry.interval.id) : undefined
                      }
                      deleteAction={
                        canManage ? deleteCompletionAction.bind(null, car.id, entry.interval.id) : undefined
                      }
                    />
                  )}
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <CompletionDialog
                      action={recordCompletionAction.bind(null, car.id, entry.interval.id)}
                      name={name}
                      kind="car"
                      precision={entry.type.precision}
                      hasKm={period.km !== null}
                      triggerLabel={tc("record")}
                      triggerAriaLabel={tc("recordLabel", { name })}
                    />
                    <IntervalEditDialog
                      action={updateCarInterval.bind(null, car.id, entry.interval.id)}
                      interval={{
                        id: entry.interval.id,
                        name,
                        precision: entry.type.precision,
                        hasKm: period.km !== null,
                        nextDueOn: entry.interval.nextDueOn,
                        nextDueOdometer: entry.interval.nextDueOdometer,
                        periodMonths: entry.interval.periodMonths,
                        periodKm: entry.interval.periodKm,
                        typePeriodMonths: entry.type.periodMonths,
                        typePeriodKm: entry.type.periodKm,
                      }}
                    />
                    <form action={stopTrackingInterval.bind(null, car.id, entry.interval.id)}>
                      <Button type="submit" variant="ghost" size="sm" aria-label={t("stopLabel", { name })}>
                        {t("stop")}
                      </Button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canManage && untracked.length > 0 && (
        <form action={startTrackingInterval.bind(null, car.id)} className="flex flex-wrap items-center gap-2">
          <NativeSelect name="intervalTypeId" aria-label={t("trackLabel")}>
            {untracked.map((type) => (
              <option key={type.id} value={type.id}>
                {intervalTypeName(type, t)}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" variant="outline" size="sm">
            {t("track")}
          </Button>
        </form>
      )}
    </section>
  );
}
