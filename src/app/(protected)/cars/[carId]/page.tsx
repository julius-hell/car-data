import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CarHeader } from "@/components/car-page/car-header";
import { DriverCarView } from "@/components/car-page/driver-car-view";
import { FleetCarView } from "@/components/car-page/fleet-car-view";
import { can, requireActor } from "@/lib/actor";
import { findCar } from "@/lib/cars";

export async function generateMetadata(props: PageProps<"/cars/[carId]">): Promise<Metadata> {
  const actor = await requireActor();
  const { carId } = await props.params;
  const [car, t] = await Promise.all([findCar(actor, carId), getTranslations("Car")]);
  return { title: car?.licencePlate ?? t("notFound") };
}

export default async function CarPage(props: PageProps<"/cars/[carId]">) {
  const actor = await requireActor();
  const [{ carId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const car = await findCar(actor, carId);
  if (!car) notFound();
  const focusForm = searchParams.log === "1";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <CarHeader actor={actor} car={car} />
      {can(actor, "viewFleet") ? (
        <FleetCarView actor={actor} car={car} focusForm={focusForm} />
      ) : (
        <DriverCarView actor={actor} car={car} />
      )}
    </main>
  );
}
