// Calendar dates are stored as YYYY-MM-DD; interpret them in UTC so the
// day never shifts with the viewer's timezone.
export function isoDateToDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`);
}
