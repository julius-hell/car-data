import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { reactivateCar } from "@/app/(protected)/cars/actions";
import { CarDialog } from "@/components/car-dialog";
import { DeleteCarButton } from "@/components/delete-car-button";
import { RetireCarDialog } from "@/components/retire-car-dialog";
import { Button } from "@/components/ui/button";
import { can, type Actor } from "@/lib/actor";
import { isoDateToDate } from "@/lib/dates";
import type { Car } from "@/lib/db/schema";

// Plate, make and model for everyone; details and management for the fleet.
export async function CarHeader({ actor, car }: { actor: Actor; car: Car }) {
  const [t, tc, format] = await Promise.all([getTranslations("Car"), getTranslations("Cars"), getFormatter()]);
  const canManage = can(actor, "manageFleet");
  const fleetView = can(actor, "viewFleet");
  const formatDate = (isoDate: string) => format.dateTime(isoDateToDate(isoDate), { dateStyle: "medium" });
  const details: [string, string | null][] = [
    ["vin", car.vin],
    ["firstRegistration", car.firstRegistration ? formatDate(car.firstRegistration) : null],
    ["costCenter", car.costCenter],
    ["location", car.location],
  ];

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={fleetView ? "/cars" : "/my-cars"}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        {fleetView ? t("allCars") : t("myCars")}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-mono text-3xl font-semibold tracking-wide">{car.licencePlate}</h1>
          <p className="text-muted-foreground" data-testid="car-make-model">
            {car.make} {car.model}
          </p>
          {car.retiredOn && (
            <span
              data-testid="car-retired"
              className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
            >
              {tc("retiredSummary", {
                date: formatDate(car.retiredOn),
                reason: tc(`reasons.${car.retirementReason ?? "other"}`),
              })}
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <CarDialog car={car} />
            {car.retiredOn ? (
              <form action={reactivateCar.bind(null, car.id)}>
                <Button type="submit" variant="outline">
                  {tc("reactivate")}
                </Button>
              </form>
            ) : (
              <RetireCarDialog carId={car.id} plate={car.licencePlate} />
            )}
            <DeleteCarButton carId={car.id} plate={car.licencePlate} />
          </div>
        )}
      </div>
      {fleetView && (
        <dl
          className="text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4"
          data-testid="car-details"
        >
          {details.map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <dt className="text-xs tracking-wider uppercase">{tc(key)}</dt>
              <dd className="text-foreground truncate" data-testid={`car-${key}`}>
                {value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
