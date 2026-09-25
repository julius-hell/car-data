// When something is due and how urgent it is. Pure: callers pass today's
// date (YYYY-MM-DD in the fleet's time zone), the latest odometer reading
// and the car's recent km per day.

export type DueLevel = "ok" | "soon" | "overdue" | "missing";

export type DuePrecision = "month" | "day";

export type DueTarget = {
  precision: DuePrecision;
  // For month precision, any day of the due month (stored as its first day).
  nextDueOn: string | null;
  nextDueOdometer: number | null;
  dueSoonDays: number;
  dueSoonKm: number | null;
};

export type DueContext = { today: string; latestOdometer: number | null; kmPerDay: number | null };

export type DueStatus = {
  level: DueLevel;
  // The last day the item is still in time (the due month's last day for month precision).
  dueDate: string | null;
  daysLeft: number | null;
  remainingKm: number | null;
  // When the km part is expected to be reached at the current rate.
  estimatedDate: string | null;
};

const DAY_MS = 86_400_000;
const LEVEL_ORDER: Record<DueLevel, number> = { ok: 0, missing: 1, soon: 2, overdue: 3 };

const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

export function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function monthEnd(iso: string) {
  const date = new Date(toTime(monthStart(iso)));
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return toIso(date.getTime());
}

export function addMonths(iso: string, months: number) {
  const date = new Date(toTime(iso));
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  // Clamp to the target month's length: 31 Jan + 1 month is 28/29 Feb.
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return toIso(date.getTime());
}

export function daysBetween(from: string, to: string) {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS);
}

export function worstLevel(levels: DueLevel[]): DueLevel {
  return levels.reduce<DueLevel>((worst, level) => (LEVEL_ORDER[level] > LEVEL_ORDER[worst] ? level : worst), "ok");
}

export function dueStatus(target: DueTarget, { today, latestOdometer, kmPerDay }: DueContext): DueStatus {
  let dateLevel: DueLevel | null = null;
  let dueDate: string | null = null;
  let daysLeft: number | null = null;
  if (target.nextDueOn) {
    const start = target.precision === "month" ? monthStart(target.nextDueOn) : target.nextDueOn;
    dueDate = target.precision === "month" ? monthEnd(target.nextDueOn) : target.nextDueOn;
    daysLeft = daysBetween(today, dueDate);
    dateLevel = daysLeft < 0 ? "overdue" : daysBetween(today, start) <= target.dueSoonDays ? "soon" : "ok";
  }

  let kmLevel: DueLevel | null = null;
  let remainingKm: number | null = null;
  let estimatedDate: string | null = null;
  if (target.nextDueOdometer !== null) {
    if (latestOdometer === null) {
      kmLevel = "ok";
    } else {
      remainingKm = target.nextDueOdometer - latestOdometer;
      kmLevel = remainingKm <= 0 ? "overdue" : target.dueSoonKm !== null && remainingKm <= target.dueSoonKm ? "soon" : "ok";
      if (remainingKm > 0 && kmPerDay && kmPerDay > 0) {
        estimatedDate = toIso(toTime(today) + Math.ceil(remainingKm / kmPerDay) * DAY_MS);
        // A date estimate inside the time window counts as due soon too.
        if (kmLevel === "ok" && daysBetween(today, estimatedDate) <= target.dueSoonDays) kmLevel = "soon";
      }
    }
  }

  const levels: DueLevel[] = [];
  if (dateLevel) levels.push(dateLevel);
  if (kmLevel) levels.push(kmLevel);
  return {
    level: levels.length === 0 ? "missing" : worstLevel(levels),
    dueDate,
    daysLeft,
    remainingKm,
    estimatedDate,
  };
}

// When an interval is next due after a completion. Major defects call for a
// re-inspection within a month; a licence check is due again no later than
// the licence expires.
export function nextDueAfter(
  done: {
    completedOn: string;
    odometer: number | null;
    result: "passed" | "minor_defects" | "major_defects" | null;
    licenceExpiresOn?: string | null;
  },
  rule: { precision: DuePrecision; periodMonths: number; periodKm: number | null },
  previous: { nextDueOdometer: number | null },
): { nextDueOn: string; nextDueOdometer: number | null } {
  if (done.result === "major_defects") {
    const recheck = addMonths(done.completedOn, 1);
    return {
      nextDueOn: rule.precision === "month" ? monthStart(recheck) : recheck,
      nextDueOdometer: previous.nextDueOdometer,
    };
  }
  let nextDueOn = addMonths(done.completedOn, rule.periodMonths);
  if (rule.precision === "month") nextDueOn = monthStart(nextDueOn);
  if (done.licenceExpiresOn && done.licenceExpiresOn < nextDueOn) nextDueOn = done.licenceExpiresOn;
  return {
    nextDueOn,
    nextDueOdometer: rule.periodKm !== null && done.odometer !== null ? done.odometer + rule.periodKm : null,
  };
}
