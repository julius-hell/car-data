import { getFormatter, getTranslations } from "next-intl/server";
import { AddEntryForm } from "@/components/add-entry-form";
import { CarAssignments } from "@/components/assignments/car-assignments";
import { CarPhoto } from "@/components/car-photo";
import { CarIntervals } from "@/components/intervals/car-intervals";
import { CarContract } from "@/components/contracts/car-contract";
import { CarDamage } from "@/components/damage/car-damage";
import { EntriesTable } from "@/components/entries-table";
import { MileageChart } from "@/components/mileage-chart";
import { MonthlyChart } from "@/components/monthly-chart";
import { StatTile } from "@/components/stat-tile";
import { can, type Actor } from "@/lib/actor";
import { isoDateToDate } from "@/lib/dates";
import type { Car } from "@/lib/db/schema";
import { listEntries } from "@/lib/entries";
import { mileageStats, monthlyDistances } from "@/lib/stats";

const DAY_MS = 86_400_000;

// The car page for admins and viewers: photo, statistics, charts, drivers
// and every mileage entry.
export async function FleetCarView({ actor, car, focusForm }: { actor: Actor; car: Car; focusForm: boolean }) {
  const canManage = can(actor, "manageFleet");
  const canAddEntry = can(actor, "addEntry");
  const [entries, t, ts, format] = await Promise.all([
    listEntries(car.id),
    getTranslations("Car"),
    getTranslations("Stats"),
    getFormatter(),
  ]);
  const now = new Date();
  const stats = mileageStats(entries, now);
  const months = monthlyDistances(entries, now);
  const rateDays = Math.min(
    90,
    entries.length >= 2
      ? Math.round(
          (Date.parse(entries[0].recordedAt) - Date.parse(entries[entries.length - 1].recordedAt)) /
            DAY_MS,
        )
      : 0,
  );
  const formatDate = (isoDate: string) =>
    format.dateTime(isoDateToDate(isoDate), { dateStyle: "medium" });

  const latest = entries[0] ?? null;
  const previous = entries[1] ?? null;
  const first = entries[entries.length - 1] ?? null;
  const distance = latest && previous ? latest.odometer - previous.odometer : null;
  const days =
    latest && previous
      ? Math.round((Date.parse(latest.recordedAt) - Date.parse(previous.recordedAt)) / DAY_MS)
      : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="aspect-[3/2] sm:col-span-3 sm:aspect-auto">
          <CarPhoto
            carId={car.id}
            plate={car.licencePlate}
            photoUpdatedAt={car.photoUpdatedAt}
            editable={canManage}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-1">
          <StatTile
            label={t("latestReading")}
            value={latest ? format.number(latest.odometer) : "—"}
            unit={latest ? "km" : undefined}
            detail={latest ? formatDate(latest.recordedAt) : t("noReadingsYet")}
          />
          <StatTile
            label={t("sincePrevious")}
            value={
              distance !== null
                ? `${distance >= 0 ? "+" : ""}${format.number(distance)}`
                : "—"
            }
            unit={distance !== null ? "km" : undefined}
            detail={days !== null ? t("overDays", { count: days }) : t("needsTwo")}
          />
          <StatTile
            label={t("readings")}
            value={format.number(entries.length)}
            detail={first ? t("since", { date: formatDate(first.recordedAt) }) : t("logFirst")}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label={ts("thisYear")}
          value={stats.thisYear !== null ? format.number(stats.thisYear) : "—"}
          unit={stats.thisYear !== null ? "km" : undefined}
          detail={stats.thisYear !== null ? String(now.getUTCFullYear()) : ts("needsTwo")}
          testId="stat-this-year"
        />
        <StatTile
          label={ts("perDay")}
          value={stats.perDay !== null ? format.number(stats.perDay, { maximumFractionDigits: 1 }) : "—"}
          unit={stats.perDay !== null ? "km" : undefined}
          detail={stats.perDay !== null ? ts("onAverage", { count: rateDays }) : ts("needsTwo")}
          testId="stat-per-day"
        />
        <StatTile
          label={ts("projectedPerYear")}
          value={stats.projectedPerYear !== null ? format.number(stats.projectedPerYear) : "—"}
          unit={stats.projectedPerYear !== null ? "km" : undefined}
          detail={stats.projectedPerYear !== null ? ts("atCurrentRate") : ts("needsTwo")}
          className="col-span-2 sm:col-span-1"
          testId="stat-projected"
        />
      </div>

      <CarIntervals car={car} organizationId={actor.organizationId} canManage={canManage} showHistory />

      <CarContract carId={car.id} canManage={canManage} />

      <CarDamage actor={actor} carId={car.id} retired={Boolean(car.retiredOn)} />

      <section className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-5">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("chartTitle")}
        </h2>
        <MileageChart
          unit="km"
          points={[...entries]
            .reverse()
            .map(({ recordedAt, odometer }) => ({ recordedAt, odometer }))}
        />
      </section>

      <section className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-5">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {ts("monthlyTitle")}
        </h2>
        <MonthlyChart months={months} unit="km" />
      </section>

      {canAddEntry && <AddEntryForm carId={car.id} autoFocus={focusForm} />}

      <EntriesTable actor={actor} entries={entries} showRecordedBy title={t("readings")} />

      <CarAssignments carId={car.id} organizationId={actor.organizationId} canManage={canManage} />
    </>
  );
}
