import type { DuePrecision } from "@/lib/due";

const MONTH = /^\d{4}-\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function optionalInt(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (text === "") return { value: null };
  const number = Number(text);
  return Number.isInteger(number) && number >= 0 ? { value: number } : { error: true as const };
}

// A due date from a form: "YYYY-MM" for month precision (stored as the
// month's first day), "YYYY-MM-DD" otherwise. Empty means unknown.
export function parseDueDate(value: FormDataEntryValue | null, precision: DuePrecision) {
  const text = String(value ?? "").trim();
  if (text === "") return { value: null };
  if (precision === "month") {
    const month = text.slice(0, 7);
    return MONTH.test(month) && !Number.isNaN(Date.parse(`${month}-01`)) ? { value: `${month}-01` } : { error: true as const };
  }
  return DATE.test(text) && !Number.isNaN(Date.parse(text)) ? { value: text } : { error: true as const };
}

export type DueFields = {
  nextDueOn: string | null;
  nextDueOdometer: number | null;
  periodMonths: number | null;
  periodKm: number | null;
};

export function parseDueFields(
  formData: FormData,
  precision: DuePrecision,
): { values: DueFields } | { error: "errorDue" | "errorOdometer" | "errorPeriod" } {
  const nextDueOn = parseDueDate(formData.get("nextDueOn"), precision);
  if ("error" in nextDueOn) return { error: "errorDue" };
  const nextDueOdometer = optionalInt(formData.get("nextDueOdometer"));
  if ("error" in nextDueOdometer) return { error: "errorOdometer" };
  const periodMonths = optionalInt(formData.get("periodMonths"));
  const periodKm = optionalInt(formData.get("periodKm"));
  if ("error" in periodMonths || "error" in periodKm || periodMonths.value === 0 || periodKm.value === 0) {
    return { error: "errorPeriod" };
  }
  return {
    values: {
      nextDueOn: nextDueOn.value,
      nextDueOdometer: nextDueOdometer.value,
      periodMonths: periodMonths.value,
      periodKm: periodKm.value,
    },
  };
}
