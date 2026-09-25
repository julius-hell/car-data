import { CarIcon } from "lucide-react";
import { photoUrl } from "@/lib/photo-url";

export function CarThumb({ carId, photoUpdatedAt }: { carId: string; photoUpdatedAt: Date | null }) {
  return photoUpdatedAt ? (
    // eslint-disable-next-line @next/next/no-img-element -- served by our own permission-checked route
    <img
      src={photoUrl(carId, "thumb", photoUpdatedAt)}
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
  );
}
