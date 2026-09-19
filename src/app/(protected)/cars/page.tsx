import type { Metadata } from "next";
import Link from "next/link";
import { CarIcon } from "lucide-react";
import { AddCarDialog } from "@/components/add-car-dialog";
import { photoUrl } from "@/lib/photo-url";
import { DeleteCarButton } from "@/components/delete-car-button";
import { SetDefaultCarButton } from "@/components/set-default-car-button";
import { getDefaultCarId, listCars } from "@/lib/cars";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Cars" };

export default async function CarsPage() {
  const { user } = await requireSession();
  const [cars, defaultCarId] = await Promise.all([
    listCars(user.id),
    getDefaultCarId(user.id),
  ]);

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
          {cars.map((car) => {
            const isDefault = car.id === defaultCarId;
            return (
              <li
                key={car.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <Link
                  href={`/cars/${car.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {car.photoUpdatedAt ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served by our own ownership-checked route
                    <img
                      src={photoUrl(car.id, "thumb", car.photoUpdatedAt)}
                      alt=""
                      data-testid="car-thumb"
                      className="bg-muted h-10 w-15 shrink-0 rounded-md object-contain"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="bg-muted text-muted-foreground flex h-10 w-15 shrink-0 items-center justify-center rounded-md"
                    >
                      <CarIcon className="size-5" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="truncate font-medium">{car.name}</span>
                  <span className="text-muted-foreground text-sm">{car.unit}</span>
                  {isDefault && (
                    <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                      Default
                    </span>
                  )}
                  </span>
                </Link>
                <div className="flex items-center gap-1">
                  {!isDefault && (
                    <SetDefaultCarButton carId={car.id} carName={car.name} />
                  )}
                  <DeleteCarButton carId={car.id} carName={car.name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
