// Calendar dates (YYYY-MM-DD) are judged in the fleet's time zone, so an
// assignment ending "today" ends at local midnight rather than UTC's.
export function todayIso(now = new Date(), timeZone = process.env.APP_TIME_ZONE ?? "Europe/Berlin") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
