import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const PHOTO_MAX_BYTES = 15 * 1024 * 1024;
export const PHOTO_VARIANTS = ["original", "display", "thumb"] as const;
export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

// Renditions carry a version in their filename so a changed recipe is
// regenerated from the original on first request instead of needing a re-upload.
const RENDITION_FILES: Record<Exclude<PhotoVariant, "original">, string> = {
  display: "display-v2.webp",
  thumb: "thumb-v2.webp",
};

function rendition(variant: Exclude<PhotoVariant, "original">, file: Buffer) {
  const image = sharp(file).rotate();
  return variant === "display"
    ? image.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 })
    : image.resize({ width: 192, height: 128, fit: "cover" }).webp({ quality: 80 });
}

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
    variant === "original" ? "original" : RENDITION_FILES[variant],
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
  await rm(/* turbopackIgnore: true */ dir, { recursive: true, force: true });
  await mkdir(/* turbopackIgnore: true */ dir, { recursive: true });
  await Promise.all([
    writeFile(/* turbopackIgnore: true */ photoPath(carId, "original"), file),
    rendition("display", file).toFile(photoPath(carId, "display")),
    rendition("thumb", file).toFile(photoPath(carId, "thumb")),
  ]);
  return { contentType };
}

async function readIfExists(file: string) {
  try {
    return await readFile(/* turbopackIgnore: true */ file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readCarPhoto(carId: string, variant: PhotoVariant) {
  const existing = await readIfExists(photoPath(carId, variant));
  if (existing || variant === "original") return existing;

  const original = await readIfExists(photoPath(carId, "original"));
  if (!original) return null;
  const bytes = await rendition(variant, original).toBuffer();
  await writeFile(/* turbopackIgnore: true */ photoPath(carId, variant), bytes);
  return bytes;
}

export async function deleteCarPhoto(carId: string) {
  await rm(/* turbopackIgnore: true */ carDir(carId), { recursive: true, force: true });
}
