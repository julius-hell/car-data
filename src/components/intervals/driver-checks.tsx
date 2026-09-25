import { getTranslations } from "next-intl/server";
import {
  deleteDriverCheck,
  recordDriverCheck,
  updateDriverCheck,
  updateDriverInterval,
} from "@/app/(protected)/team/members/[userId]/actions";
import { CompletionDialog } from "@/components/completions/completion-dialog";
import { CompletionHistory } from "@/components/completions/completion-history";
import { DueBadge } from "@/components/due-badge";
import { DueSummary } from "@/components/intervals/due-summary";
import { IntervalEditDialog } from "@/components/intervals/interval-edit-dialog";
import { listCompletionsWithAttachments } from "@/lib/completions";
import { intervalTypeName } from "@/lib/interval-names";
import { effectivePeriod, listDriverIntervals, statusOf } from "@/lib/intervals";
import { todayIso } from "@/lib/today";

// A person's licence check, UVV instruction and other driver checks. Admins
// manage them on the member page; the driver sees their own due dates.
export async function DriverChecks({
  organizationId,
  userId,
  manage,
}: {
  organizationId: string;
  userId: string;
  manage: boolean;
}) {
  const [intervals, t, tc] = await Promise.all([
    listDriverIntervals(organizationId, userId),
    getTranslations("Intervals"),
    getTranslations("Completions"),
  ]);
  const histories = manage
    ? new Map(
        await Promise.all(
          intervals.map(async (i) => [i.interval.id, await listCompletionsWithAttachments(i.interval.id)] as const),
        ),
      )
    : new Map();
  const today = todayIso();

  if (intervals.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noDriverChecks")}</p>;
  }

  return (
    <ul className="flex flex-col divide-y" data-testid="driver-checks">
      {intervals.map((entry) => {
        const name = intervalTypeName(entry.type, t);
        const status = statusOf(entry, { today, latestOdometer: null, kmPerDay: null });
        const kind = entry.type.builtIn === "licence_check" ? "licence" : "driver";
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
                  nextDueOdometer={null}
                />
              </span>
              {manage && (
                <CompletionHistory
                  name={name}
                  kind={kind}
                  precision={entry.type.precision}
                  hasKm={false}
                  completions={histories.get(entry.interval.id) ?? []}
                  editAction={updateDriverCheck.bind(null, userId, entry.interval.id)}
                  deleteAction={deleteDriverCheck.bind(null, userId, entry.interval.id)}
                />
              )}
            </div>
            {manage && (
              <div className="flex flex-wrap items-center gap-2">
                <CompletionDialog
                  action={recordDriverCheck.bind(null, userId, entry.interval.id)}
                  name={name}
                  kind={kind}
                  precision={entry.type.precision}
                  hasKm={false}
                  triggerLabel={tc("record")}
                  triggerAriaLabel={tc("recordLabel", { name })}
                />
                <IntervalEditDialog
                  action={updateDriverInterval.bind(null, userId, entry.interval.id)}
                  interval={{
                    id: entry.interval.id,
                    name,
                    precision: entry.type.precision,
                    hasKm: false,
                    nextDueOn: entry.interval.nextDueOn,
                    nextDueOdometer: null,
                    periodMonths: entry.interval.periodMonths,
                    periodKm: null,
                    typePeriodMonths: effectivePeriod(entry).months,
                    typePeriodKm: null,
                  }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
