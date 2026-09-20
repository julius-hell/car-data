import type { Metadata } from "next";
import Link from "next/link";
import { CarIcon, PlusIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { AddCarDialog } from "@/components/add-car-dialog";
import { DeleteCarButton } from "@/components/delete-car-button";
import { SetDefaultCarButton } from "@/components/set-default-car-button";
import { Button } from "@/components/ui/button";
import { getDefaultCarId, listCarsWithLatestReading } from "@/lib/cars";
import { photoUrl } from "@/lib/photo-url";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cars");
  return { title: t("title") };
}

export default async function CarsPage() {
  const { user } = await requireSession();
  const [cars, defaultCarId, t, format] = await Promise.all([
    listCarsWithLatestReading(user.id),
    getDefaultCarId(user.id),
    getTranslations("Cars"),
    getFormatter(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        </div>
        <div className="flex items-center gap-2">
          {defaultCarId && (
            <Button variant="outline" render={<Link href="/log" />}>
              <PlusIcon aria-hidden className="size-4" />
              {t("logReading")}
            </Button>
          )}
          <AddCarDialog />
        </div>
      </div>

      {cars.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
          <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
            <CarIcon className="size-6" />
          </span>
          <div>
            <p className="font-medium">{t("emptyTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t("emptyDescription")}</p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {cars.map((car) => {
            const isDefault = car.id === defaultCarId;
            return (
              <li
                key={car.id}
                className="bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-3 shadow-xs transition-colors"
              >
                <Link
                  href={`/cars/${car.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-lg"
                >
                  {car.photoUpdatedAt ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served by our own ownership-checked route
                    <img
                      src={photoUrl(car.id, "thumb", car.photoUpdatedAt)}
                      alt=""
                      data-testid="car-thumb"
                      className="bg-muted h-14 w-21 shrink-0 rounded-lg object-contain"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="bg-muted text-muted-foreground flex h-14 w-21 shrink-0 items-center justify-center rounded-lg"
                    >
                      <CarIcon className="size-6" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{car.name}</span>
                      {isDefault && (
                        <span className="bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase">
                          {t("default")}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {car.latest
                        ? t("latest", {
                            odometer: format.number(car.latest.odometer),
                            unit: car.unit,
                            count: car.latest.readings,
                          })
                        : t("noReadings", { unit: car.unit })}
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  {!isDefault && <SetDefaultCarButton carId={car.id} carName={car.name} />}
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
