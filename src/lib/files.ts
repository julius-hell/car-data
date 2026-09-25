import { rm } from "node:fs/promises";
import path from "node:path";

// Everything uploaded lives under one directory (a Docker volume in
// production): files/cars/<car id>/… and files/users/<user id>/….
// FILE_DIR is only known at runtime; the ignore comments stop Turbopack from
// tracing the whole project into the standalone build.
export function fileRoot() {
  return process.env.FILE_DIR ?? path.join(process.cwd(), "data", "files");
}

export function carFilesDir(carId: string) {
  return path.join(/* turbopackIgnore: true */ fileRoot(), "cars", carId);
}

export function userFilesDir(userId: string) {
  return path.join(/* turbopackIgnore: true */ fileRoot(), "users", userId);
}

export async function deleteCarFiles(carId: string) {
  await rm(/* turbopackIgnore: true */ carFilesDir(carId), { recursive: true, force: true });
}

export async function deleteUserFiles(userId: string) {
  await rm(/* turbopackIgnore: true */ userFilesDir(userId), { recursive: true, force: true });
}
