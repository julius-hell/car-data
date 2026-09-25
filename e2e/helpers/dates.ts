// Dates as the app judges them: calendar days in the fleet's time zone.
const TIME_ZONE = process.env.APP_TIME_ZONE ?? "Europe/Berlin";

export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function inDays(days: number, from = today()) {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function inMonths(months: number, from = today()) {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function monthOf(isoDate: string) {
  return isoDate.slice(0, 7);
}

// How the app writes a due month for English readers, e.g. "March 2027".
export function displayMonth(isoDate: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate.slice(0, 7)}-01T00:00:00Z`),
  );
}
