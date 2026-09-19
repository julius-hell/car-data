export function photoUrl(carId: string, variant: "display" | "thumb", updatedAt: Date) {
  return `/cars/${carId}/photo?variant=${variant}&v=${updatedAt.getTime()}`;
}
