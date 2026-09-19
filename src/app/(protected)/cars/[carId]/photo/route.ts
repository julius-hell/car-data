import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { findOwnedCar } from "@/lib/cars";
import { db } from "@/lib/db";
import { car } from "@/lib/db/schema";
import {
  PHOTO_MAX_BYTES,
  PHOTO_VARIANTS,
  readCarPhoto,
  storeCarPhoto,
  type PhotoVariant,
} from "@/lib/photos";
import { getSession } from "@/lib/session";

function isVariant(value: string | null): value is PhotoVariant {
  return (PHOTO_VARIANTS as readonly string[]).includes(value ?? "");
}

function isSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

const json = (status: number, body: unknown) => Response.json(body, { status });

export async function GET(request: Request, context: RouteContext<"/cars/[carId]/photo">) {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });

  const { carId } = await context.params;
  const owned = await findOwnedCar(session.user.id, carId);
  if (!owned?.photoContentType || !owned.photoUpdatedAt) return new Response(null, { status: 404 });

  const requested = new URL(request.url).searchParams.get("variant");
  const variant = isVariant(requested) ? requested : "display";
  const bytes = await readCarPhoto(owned.id, variant);
  if (!bytes) return new Response(null, { status: 404 });

  const etag = `"${owned.id}-${variant}-${owned.photoUpdatedAt.getTime()}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": variant === "original" ? owned.photoContentType : "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}

export async function POST(request: Request, context: RouteContext<"/cars/[carId]/photo">) {
  const session = await getSession();
  if (!session) return json(401, { error: "Sign in to add a photo." });
  if (!isSameOrigin(request)) return json(403, { error: "Cross-site request rejected." });

  const { carId } = await context.params;
  const owned = await findOwnedCar(session.user.id, carId);
  if (!owned) return json(404, { error: "This car no longer exists." });

  // Reject oversized bodies before reading them; the multipart wrapper is small.
  const declared = Number(request.headers.get("content-length"));
  if (declared > PHOTO_MAX_BYTES + 64 * 1024) {
    return json(413, { error: "Photos must be 15 MB or smaller." });
  }

  const file = (await request.formData()).get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return json(400, { error: "Choose a photo first." });
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return json(413, { error: "Photos must be 15 MB or smaller." });
  }

  let stored;
  try {
    stored = await storeCarPhoto(owned.id, Buffer.from(await file.arrayBuffer()));
  } catch {
    return json(415, { error: "That file is not an image we can read." });
  }

  await db
    .update(car)
    .set({ photoContentType: stored.contentType, photoUpdatedAt: new Date() })
    .where(eq(car.id, owned.id));
  revalidatePath(`/cars/${owned.id}`);
  revalidatePath("/cars");
  return json(200, { ok: true });
}
