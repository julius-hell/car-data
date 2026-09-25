import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { CarThumb } from "@/components/car-thumb";
import { Button } from "@/components/ui/button";
import { can, requirePermission } from "@/lib/actor";
import { listFleet } from "@/lib/cars";
import { isoDateToDate } from "@/lib/dates";
import { reactivateCar } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cars");
  return { title: t("retiredTitle") };
}

export default async function RetiredCarsPage() {
  const actor = await requirePermission("viewFleet");
  const [cars, t, format] = await Promise.all([
    listFleet(actor, { retired: true }),
    getTranslations("Cars"),
    getFormatter(),
  ]);
  const canManage = can(actor, "manageFleet");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/cars"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {t("backToFleet")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("retiredTitle")}</h1>
      </div>
      {cars.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noRetired")}</p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="retired-cars">
          {cars.map((car) => (
            <li
              key={car.id}
              data-testid="retired-car"
              data-plate={car.licencePlate}
              className="bg-card flex items-center gap-3 rounded-xl border p-3 shadow-xs"
            >
              <Link href={`/cars/${car.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <CarThumb carId={car.id} photoUpdatedAt={car.photoUpdatedAt} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-mono font-semibold tracking-wide">{car.licencePlate}</span>
                  <span className="text-muted-foreground text-sm">
                    {car.make} {car.model}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {t("retiredSummary", {
                      date: format.dateTime(isoDateToDate(car.retiredOn!), { dateStyle: "medium" }),
                      reason: t(`reasons.${car.retirementReason ?? "other"}`),
                    })}
                  </span>
                </span>
              </Link>
              {canManage && (
                <form action={reactivateCar.bind(null, car.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    {t("reactivate")}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
