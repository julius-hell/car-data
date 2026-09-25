// Today's date as YYYY-MM-DD in the browser's timezone.
export function localIsoDate(now = new Date()) {
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}
