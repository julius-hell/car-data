import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { AddEntryForm } from "@/components/add-entry-form";
import { CarPhoto } from "@/components/car-photo";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { MileageChart } from "@/components/mileage-chart";
import { StatTile } from "@/components/stat-tile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { findOwnedCar, getDefaultCarId } from "@/lib/cars";
import { isoDateToDate } from "@/lib/dates";
import { listEntries } from "@/lib/entries";
import { requireSession } from "@/lib/session";

const DAY_MS = 86_400_000;

export async function generateMetadata(
  props: PageProps<"/cars/[carId]">,
): Promise<Metadata> {
  const { user } = await requireSession();
  const { carId } = await props.params;
  const [car, t] = await Promise.all([findOwnedCar(user.id, carId), getTranslations("Car")]);
  return { title: car?.name ?? t("notFound") };
}

export default async function CarPage(props: PageProps<"/cars/[carId]">) {
  const { user } = await requireSession();
  const { carId } = await props.params;
  const car = await findOwnedCar(user.id, carId);
  if (!car) notFound();
  const [entries, defaultCarId, t, format] = await Promise.all([
    listEntries(car.id),
    getDefaultCarId(user.id),
    getTranslations("Car"),
    getFormatter(),
  ]);
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/cars"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {t("allCars")}
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{car.name}</h1>
          <p className="text-muted-foreground text-sm">
            {t.rich("odometerIn", {
              unit: car.unit,
              u: (chunks) => <span data-testid="car-unit">{chunks}</span>,
            })}
            {car.id === defaultCarId && ` · ${t("defaultCar")}`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <div className="aspect-[3/2] sm:col-span-3 sm:aspect-auto">
          <CarPhoto carId={car.id} carName={car.name} photoUpdatedAt={car.photoUpdatedAt} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-1">
          <StatTile
            label={t("latestReading")}
            value={latest ? format.number(latest.odometer) : "—"}
            unit={latest ? car.unit : undefined}
            detail={latest ? formatDate(latest.recordedAt) : t("noReadingsYet")}
          />
          <StatTile
            label={t("sincePrevious")}
            value={
              distance !== null
                ? `${distance >= 0 ? "+" : ""}${format.number(distance)}`
                : "—"
            }
            unit={distance !== null ? car.unit : undefined}
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

      <section className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-5">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("chartTitle")}
        </h2>
        <MileageChart
          unit={car.unit}
          points={[...entries]
            .reverse()
            .map(({ recordedAt, odometer }) => ({ recordedAt, odometer }))}
        />
      </section>

      <AddEntryForm carId={car.id} unit={car.unit} />

      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("readings")}
        </h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noReadings")}</p>
        ) : (
          <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
            <Table data-testid="entries" className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-32 pl-4">{t("date")}</TableHead>
                  <TableHead className="w-32 text-right">{t("odometer")}</TableHead>
                  <TableHead>{t("note")}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-4 whitespace-nowrap tabular-nums">
                      <time dateTime={entry.recordedAt}>{formatDate(entry.recordedAt)}</time>
                    </TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">
                      {format.number(entry.odometer)}{" "}
                      <span className="text-muted-foreground font-sans">{car.unit}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">{entry.note}</TableCell>
                    <TableCell className="py-1 pr-2">
                      <DeleteEntryButton
                        entryId={entry.id}
                        label={t("deleteReading", {
                          odometer: format.number(entry.odometer),
                          date: formatDate(entry.recordedAt),
                        })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
