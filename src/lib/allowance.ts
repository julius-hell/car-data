// Mileage allowance of a leased or rented car, projected to the contract end
// from the car's recent km per day. Pure; money in cents, rates in
// ten-thousandths of a euro per km.
import { daysBetween, type DueLevel } from "@/lib/due";

export type AllowanceTerms = {
  startOn: string;
  endOn: string;
  termMonths: number | null;
  kmPerYear: number;
  handoverOdometer: number;
  excessKmRate: number | null;
  underKmRate: number | null;
};

export type AllowanceProjection = {
  allowanceTotal: number;
  allowanceToDate: number;
  drivenToDate: number | null;
  projectedEndOdometer: number | null;
  // Positive: km over the allowance; negative: km under it.
  projectedDifference: number | null;
  expectedCostCents: number | null;
  expectedCreditCents: number | null;
  level: DueLevel;
};

export function projectAllowance(
  terms: AllowanceTerms,
  { today, latestOdometer, kmPerDay }: { today: string; latestOdometer: number | null; kmPerDay: number | null },
): AllowanceProjection {
  const termDays = Math.max(1, daysBetween(terms.startOn, terms.endOn) + 1);
  const allowanceTotal = Math.round(
    terms.termMonths ? (terms.kmPerYear * terms.termMonths) / 12 : (terms.kmPerYear * termDays) / 365,
  );
  const elapsed = Math.min(termDays, Math.max(0, daysBetween(terms.startOn, today)));
  const allowanceToDate = Math.round((allowanceTotal * elapsed) / termDays);

  const drivenToDate = latestOdometer === null ? null : latestOdometer - terms.handoverOdometer;
  const remainingDays = Math.max(0, daysBetween(today, terms.endOn));
  const projectedEndOdometer =
    latestOdometer === null || kmPerDay === null ? null : Math.round(latestOdometer + kmPerDay * remainingDays);
  const projectedDifference =
    projectedEndOdometer === null ? null : projectedEndOdometer - terms.handoverOdometer - allowanceTotal;

  const perKmCents = (rate: number | null, km: number) => (rate === null ? null : Math.round((rate * km) / 100));
  const expectedCostCents =
    projectedDifference !== null && projectedDifference > 0 ? perKmCents(terms.excessKmRate, projectedDifference) : null;
  const expectedCreditCents =
    projectedDifference !== null && projectedDifference < 0 ? perKmCents(terms.underKmRate, -projectedDifference) : null;

  const level: DueLevel =
    drivenToDate !== null && drivenToDate > allowanceTotal
      ? "overdue"
      : projectedDifference !== null && projectedDifference > 0
        ? "soon"
        : "ok";
  return {
    allowanceTotal,
    allowanceToDate,
    drivenToDate,
    projectedEndOdometer,
    projectedDifference,
    expectedCostCents,
    expectedCreditCents,
    level,
  };
}

// "0,085" or "0.085" euros per km to ten-thousandths of a euro (850).
export function parseKmRate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (raw === "") return { value: null };
  if (!/^\d+([.,]\d{1,4})?$/.test(raw)) return { error: true as const };
  const [whole, fraction = ""] = raw.split(/[.,]/);
  return { value: Number(whole) * 10_000 + Number(fraction.padEnd(4, "0")) };
}
