import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
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
import { listEntries } from "@/lib/entries";
import { requireSession } from "@/lib/session";

const numberFormat = new Intl.NumberFormat("en");
const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const DAY_MS = 86_400_000;

const formatDate = (isoDate: string) => dateFormat.format(new Date(`${isoDate}T00:00:00Z`));

export async function generateMetadata(
  props: PageProps<"/cars/[carId]">,
): Promise<Metadata> {
  const { user } = await requireSession();
  const { carId } = await props.params;
  const car = await findOwnedCar(user.id, carId);
  return { title: car?.name ?? "Not found" };
}

export default async function CarPage(props: PageProps<"/cars/[carId]">) {
  const { user } = await requireSession();
  const { carId } = await props.params;
  const car = await findOwnedCar(user.id, carId);
  if (!car) notFound();
  const [entries, defaultCarId] = await Promise.all([
    listEntries(car.id),
    getDefaultCarId(user.id),
  ]);

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
          All cars
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{car.name}</h1>
          <p className="text-muted-foreground text-sm">
            Odometer in <span data-testid="car-unit">{car.unit}</span>
            {car.id === defaultCarId && " · default car"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <div className="aspect-[3/2] sm:col-span-3 sm:aspect-auto">
          <CarPhoto carId={car.id} carName={car.name} photoUpdatedAt={car.photoUpdatedAt} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-1">
          <StatTile
            label="Latest reading"
            value={latest ? numberFormat.format(latest.odometer) : "—"}
            unit={latest ? car.unit : undefined}
            detail={latest ? formatDate(latest.recordedAt) : "No readings yet"}
          />
          <StatTile
            label="Since previous"
            value={
              distance !== null
                ? `${distance >= 0 ? "+" : ""}${numberFormat.format(distance)}`
                : "—"
            }
            unit={distance !== null ? car.unit : undefined}
            detail={
              days !== null ? `over ${days} ${days === 1 ? "day" : "days"}` : "Needs two readings"
            }
          />
          <StatTile
            label="Readings"
            value={String(entries.length)}
            detail={first ? `since ${formatDate(first.recordedAt)}` : "Log the first one below"}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <section className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-5">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Mileage over time
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
          Readings
        </h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No readings yet.</p>
        ) : (
          <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
            <Table data-testid="entries" className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-32 pl-4">Date</TableHead>
                  <TableHead className="w-32 text-right">Odometer</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-4 whitespace-nowrap tabular-nums">
                      {entry.recordedAt}
                    </TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">
                      {numberFormat.format(entry.odometer)}{" "}
                      <span className="text-muted-foreground font-sans">{car.unit}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">{entry.note}</TableCell>
                    <TableCell className="py-1 pr-2">
                      <DeleteEntryButton
                        entryId={entry.id}
                        label={`Delete reading ${entry.odometer} on ${entry.recordedAt}`}
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
