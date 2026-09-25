import { CarPhoto } from "@/components/car-photo";
import type { Actor } from "@/lib/actor";
import type { Car } from "@/lib/db/schema";

// The car page for a driver assigned to the car.
export async function DriverCarView({ car }: { actor: Actor; car: Car }) {
  return (
    <div className="aspect-[3/2]">
      <CarPhoto carId={car.id} plate={car.licencePlate} photoUpdatedAt={car.photoUpdatedAt} editable={false} />
    </div>
  );
}
