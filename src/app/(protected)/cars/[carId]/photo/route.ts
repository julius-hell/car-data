import { findOwnedCar } from "@/lib/cars";
import { PHOTO_VARIANTS, readCarPhoto, type PhotoVariant } from "@/lib/photos";
import { getSession } from "@/lib/session";

function isVariant(value: string | null): value is PhotoVariant {
  return (PHOTO_VARIANTS as readonly string[]).includes(value ?? "");
}

export async function GET(request: Request, context: RouteContext<"/cars/[carId]/photo">) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });

  const { carId } = await context.params;
  const car = await findOwnedCar(session.user.id, carId);
  if (!car?.photoContentType || !car.photoUpdatedAt) return new Response(null, { status: 404 });

  const requested = new URL(request.url).searchParams.get("variant");
  const variant = isVariant(requested) ? requested : "display";
  const bytes = await readCarPhoto(car.id, variant);
  if (!bytes) return new Response(null, { status: 404 });

  const etag = `"${car.id}-${variant}-${car.photoUpdatedAt.getTime()}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": variant === "original" ? car.photoContentType : "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
