// Mirrors how the app renders a stored YYYY-MM-DD date for English readers.
export function displayDate(isoDate: string, locale = "en") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
