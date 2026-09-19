import type { Metadata } from "next";
import Link from "next/link";
import { AddCarDialog } from "@/components/add-car-dialog";
import { DeleteCarButton } from "@/components/delete-car-button";
import { listCars } from "@/lib/cars";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Cars" };

export default async function CarsPage() {
  const { user } = await requireSession();
  const cars = await listCars(user.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your cars</h1>
        <AddCarDialog>Add car</AddCarDialog>
      </div>

      {cars.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Add your first car</p>
          <p className="text-muted-foreground text-sm">
            You will log its odometer readings and watch the mileage grow.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {cars.map((car) => (
            <li
              key={car.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <Link
                href={`/cars/${car.id}`}
                className="flex min-w-0 flex-1 items-baseline gap-2"
              >
                <span className="truncate font-medium">{car.name}</span>
                <span className="text-muted-foreground text-sm">{car.unit}</span>
              </Link>
              <DeleteCarButton carId={car.id} carName={car.name} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
