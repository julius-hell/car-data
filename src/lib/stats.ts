import { isoDateToDate } from "@/lib/dates";

export type Reading = { recordedAt: string; odometer: number };

const DAY_MS = 86_400_000;
const RATE_WINDOW_DAYS = 90;

type Point = { t: number; odometer: number };

function toPoints(readings: Reading[]): Point[] {
  return [...readings]
    .map((r) => ({ t: isoDateToDate(r.recordedAt).getTime(), odometer: r.odometer }))
    .sort((a, b) => a.t - b.t);
}

// Odometer at an arbitrary instant, interpolated between the surrounding
// readings and clamped to the first/last reading outside the recorded span.
function odometerAt(points: Point[], t: number): number {
  if (t <= points[0].t) return points[0].odometer;
  const last = points[points.length - 1];
  if (t >= last.t) return last.odometer;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (t <= b.t) {
      if (b.t === a.t) return b.odometer;
      return a.odometer + ((b.odometer - a.odometer) * (t - a.t)) / (b.t - a.t);
    }
  }
  return last.odometer;
}

export type MileageStats = {
  thisYear: number | null;
  perDay: number | null;
  projectedPerYear: number | null;
};

export function mileageStats(readings: Reading[], now: Date): MileageStats {
  const points = toPoints(readings);
  if (points.length < 2) return { thisYear: null, perDay: null, projectedPerYear: null };

  const first = points[0];
  const last = points[points.length - 1];
  const yearStart = Date.UTC(now.getUTCFullYear(), 0, 1);
  const thisYear = Math.max(0, Math.round(last.odometer - odometerAt(points, yearStart)));

  const windowStart = Math.max(first.t, last.t - RATE_WINDOW_DAYS * DAY_MS);
  const days = (last.t - windowStart) / DAY_MS;
  const perDay = days > 0 ? (last.odometer - odometerAt(points, windowStart)) / days : null;

  return {
    thisYear,
    perDay,
    projectedPerYear: perDay === null ? null : Math.round(perDay * 365.25),
  };
}

export type MonthDistance = { month: string; distance: number | null };

// Distance per calendar month for the trailing window, attributed by
// interpolating the odometer at each month boundary. Months entirely outside
// the recorded span are null rather than zero.
export function monthlyDistances(readings: Reading[], now: Date, months = 12): MonthDistance[] {
  const points = toPoints(readings);
  const result: MonthDistance[] = [];
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  for (let i = months - 1; i >= 0; i--) {
    const start = Date.UTC(year, month - i, 1);
    const end = Date.UTC(year, month - i + 1, 1);
    const label = new Date(start).toISOString().slice(0, 7);
    if (points.length < 2 || end <= points[0].t || start >= points[points.length - 1].t + DAY_MS) {
      result.push({ month: label, distance: null });
      continue;
    }
    const distance = odometerAt(points, Math.min(end, now.getTime())) - odometerAt(points, start);
    result.push({ month: label, distance: Math.max(0, Math.round(distance)) });
  }
  return result;
}
