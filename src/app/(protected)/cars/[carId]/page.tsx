import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findOwnedCar } from "@/lib/cars";
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
    </main>
  );
}
