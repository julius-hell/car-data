import type { Metadata } from "next";
import Link from "next/link";
import { CarIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CarThumb } from "@/components/car-thumb";
import { DriverChecks } from "@/components/intervals/driver-checks";
import { listDriverIntervals } from "@/lib/intervals";
import { requireActor } from "@/lib/actor";
import { currentCarsOf } from "@/lib/assignments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyCars");
  return { title: t("title") };
}

// A driver's home: the cars currently assigned to them.
export default async function MyCarsPage() {
  const actor = await requireActor();
  const [cars, checks, t] = await Promise.all([
    currentCarsOf(actor.userId),
    listDriverIntervals(actor.organizationId, actor.userId),
    getTranslations("MyCars"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      {cars.length === 0 ? (
        <div
          data-testid="no-cars-assigned"
          className="bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center"
        >
          <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
            <CarIcon className="size-6" />
          </span>
          <div>
            <p className="font-medium">{t("emptyTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t("emptyDescription")}</p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="my-cars">
          {cars.map(({ car }) => (
            <li key={car.id} data-testid="my-car" data-plate={car.licencePlate}>
              <Link
                href={`/cars/${car.id}`}
                className="bg-card hover:border-primary/40 flex items-center gap-4 rounded-xl border p-3 shadow-xs transition-colors"
              >
                <CarThumb carId={car.id} photoUpdatedAt={car.photoUpdatedAt} />
                <span className="flex flex-col gap-0.5">
                  <span className="font-mono font-semibold tracking-wide">{car.licencePlate}</span>
                  <span className="text-muted-foreground text-sm">
                    {car.make} {car.model}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {checks.length > 0 && (
        <section className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-5">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("myChecks")}</h2>
          <DriverChecks organizationId={actor.organizationId} userId={actor.userId} manage={false} />
        </section>
      )}
    </main>
  );
}
