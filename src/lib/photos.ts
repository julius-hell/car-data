import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
export const PHOTO_VARIANTS = ["original", "display", "thumb"] as const;
export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

const ACCEPTED_FORMATS: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heif: "image/heic",
};

function photoDir() {
  return process.env.PHOTO_DIR ?? path.join(process.cwd(), "data", "photos");
}

// PHOTO_DIR is only known at runtime; the ignore comments stop Turbopack from
// tracing the whole project into the standalone build.
function carDir(carId: string) {
  return path.join(/* turbopackIgnore: true */ photoDir(), carId);
}

export function photoPath(carId: string, variant: PhotoVariant) {
  return path.join(
    /* turbopackIgnore: true */ carDir(carId),
    variant === "original" ? "original" : `${variant}.webp`,
  );
}

export type StoredPhoto = { contentType: string };

// Keeps the upload byte-for-byte and derives two WebP renditions for the UI.
export async function storeCarPhoto(carId: string, file: Buffer): Promise<StoredPhoto> {
  const image = sharp(file, { failOn: "error" });
  const { format } = await image.metadata();
  const contentType = format && ACCEPTED_FORMATS[format];
  if (!contentType) throw new Error("Unsupported image format.");

  const dir = carDir(carId);
  await mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
  await Promise.all([
    writeFile(/* turbopackIgnore: true */ photoPath(carId, "original"), file),
    sharp(file)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(photoPath(carId, "display")),
    sharp(file)
      .rotate()
      .resize({ width: 256, height: 256, fit: "cover" })
      .webp({ quality: 80 })
      .toFile(photoPath(carId, "thumb")),
  ]);
  return { contentType };
}

export async function readCarPhoto(carId: string, variant: PhotoVariant) {
  try {
    return await readFile(/* turbopackIgnore: true */ photoPath(carId, variant));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteCarPhoto(carId: string) {
  await rm(/* turbopackIgnore: true */ carDir(carId), { recursive: true, force: true });
}
