import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddEntryForm } from "@/components/add-entry-form";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { findOwnedCar } from "@/lib/cars";
import { listEntries } from "@/lib/entries";
import { requireSession } from "@/lib/session";

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
  const entries = await listEntries(car.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/cars" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
          ← All cars
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{car.name}</h1>
        <p className="text-muted-foreground text-sm">
          Odometer readings in <span data-testid="car-unit">{car.unit}</span>
        </p>
      </div>

      <AddEntryForm carId={car.id} unit={car.unit} />

      <section className="flex min-w-0 flex-col gap-2">
        <h2 className="font-medium">Readings</h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No readings yet.</p>
        ) : (
          <Table data-testid="entries" className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-28 text-right">Odometer</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {entry.recordedAt}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {entry.odometer.toLocaleString("en")} {car.unit}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate">
                    {entry.note}
                  </TableCell>
                  <TableCell className="py-1">
                    <DeleteEntryButton
                      entryId={entry.id}
                      label={`Delete reading ${entry.odometer} on ${entry.recordedAt}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
