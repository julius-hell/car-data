import type { Metadata } from "next";
import Link from "next/link";
import { CarIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { CarDialog } from "@/components/car-dialog";
import { CarThumb } from "@/components/car-thumb";
import { DeleteCarButton } from "@/components/delete-car-button";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { can, requirePermission } from "@/lib/actor";
import { currentDriversByCar } from "@/lib/assignments";
import { countRetired, fleetFilterOptions, listFleet } from "@/lib/cars";
import { worstLevelByCar } from "@/lib/intervals";
import { contractsByCar } from "@/lib/contracts";
import { isoDateToDate } from "@/lib/dates";
import { DueBadge } from "@/components/due-badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cars");
  return { title: t("title") };
}

const param = (value: string | string[] | undefined) => (typeof value === "string" && value ? value : undefined);

export default async function CarsPage(props: PageProps<"/cars">) {
  const actor = await requirePermission("viewFleet");
  const searchParams = await props.searchParams;
  const filter = { location: param(searchParams.location), costCenter: param(searchParams.costCenter) };
  const canManage = can(actor, "manageFleet");
  const [cars, options, retired, t, format] = await Promise.all([
    listFleet(actor, filter),
    fleetFilterOptions(actor),
    countRetired(actor),
    getTranslations("Cars"),
    getFormatter(),
  ]);
  const filtered = Boolean(filter.location || filter.costCenter);
  const [drivers, levels, contracts, tContracts] = await Promise.all([
    currentDriversByCar(cars.map((c) => c.id)),
    worstLevelByCar(actor.organizationId, cars.map((c) => c.id)),
    contractsByCar(cars.map((c) => c.id)),
    getTranslations("Contracts"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("eyebrow")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        </div>
        {canManage && <CarDialog />}
      </div>

      {(options.locations.length > 0 || options.costCenters.length > 0 || filtered) && (
        <form method="get" className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-3 shadow-xs">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-location">{t("location")}</Label>
            <NativeSelect id="filter-location" name="location" defaultValue={filter.location ?? ""}>
              <option value="">{t("all")}</option>
              {options.locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-cost-center">{t("costCenter")}</Label>
            <NativeSelect id="filter-cost-center" name="costCenter" defaultValue={filter.costCenter ?? ""}>
              <option value="">{t("all")}</option>
              {options.costCenters.map((costCenter) => (
                <option key={costCenter} value={costCenter}>
                  {costCenter}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" variant="outline">
            {t("filter")}
          </Button>
          {filtered && (
            <Button variant="ghost" render={<Link href="/cars" />}>
              {t("resetFilter")}
            </Button>
          )}
        </form>
      )}

      {cars.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
          <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
            <CarIcon className="size-6" />
          </span>
          <div>
            <p className="font-medium">{filtered ? t("noMatches") : t("emptyTitle")}</p>
            {!filtered && <p className="text-muted-foreground mt-1 text-sm">{t("emptyDescription")}</p>}
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="fleet">
          {cars.map((car) => (
            <li
              key={car.id}
              data-testid="fleet-car"
              data-plate={car.licencePlate}
              className="bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-3 shadow-xs transition-colors"
            >
              <Link href={`/cars/${car.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-lg">
                <CarThumb carId={car.id} photoUpdatedAt={car.photoUpdatedAt} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <span className="font-mono font-semibold tracking-wide">{car.licencePlate}</span>
                    <span className="text-muted-foreground truncate text-sm">
                      {car.make} {car.model}
                    </span>
                    {levels.has(car.id) && <DueBadge level={levels.get(car.id)!} testId="car-level" />}
                  </span>
                  {contracts.has(car.id) && (
                    <span className="text-muted-foreground truncate text-xs" data-testid="car-contract">
                      {tContracts(`kinds.${contracts.get(car.id)!.kind}`)}
                      {contracts.get(car.id)!.kind !== "owned" && contracts.get(car.id)!.endOn
                        ? ` · ${tContracts("until", {
                            date: format.dateTime(isoDateToDate(contracts.get(car.id)!.endOn!), { dateStyle: "medium" }),
                          })}`
                        : ""}
                    </span>
                  )}
                  {(car.location || car.costCenter) && (
                    <span className="text-muted-foreground truncate text-xs" data-testid="car-org-details">
                      {[car.location, car.costCenter].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <span className="text-muted-foreground text-sm" data-testid="car-drivers">
                    {drivers.get(car.id)?.length
                      ? t("drivers", { names: drivers.get(car.id)!.join(", ") })
                      : t("noDrivers")}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {car.latest
                      ? t("latest", {
                          odometer: format.number(car.latest.odometer),
                          unit: "km",
                          count: car.latest.readings,
                        })
                      : t("noReadings", { unit: "km" })}
                  </span>
                </span>
              </Link>
              {canManage && <DeleteCarButton carId={car.id} plate={car.licencePlate} />}
            </li>
          ))}
        </ul>
      )}

      {retired > 0 && (
        <Link href="/cars/retired" className="text-primary w-fit text-sm underline-offset-4 hover:underline">
          {t("retiredLink", { count: retired })}
        </Link>
      )}
    </main>
  );
}
