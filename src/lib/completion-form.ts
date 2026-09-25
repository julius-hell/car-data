import type { AttachmentError } from "@/lib/attachments";
import type { CompletionInput, DueOverride } from "@/lib/completions";
import { COMPLETION_RESULTS, type CompletionResult } from "@/lib/db/schema";
import type { DuePrecision } from "@/lib/due";
import { parseDueDate } from "@/lib/interval-form";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_MAX = 200;

export type CompletionFormError =
  | "errorDate"
  | "errorOdometer"
  | "errorResult"
  | "errorCost"
  | "errorText"
  | "errorOverride"
  | "errorLicence";

export type CompletionState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: CompletionFormError | AttachmentError };

const text = (value: FormDataEntryValue | null) => {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

// "1234", "1234.5", "1234,56" euros to cents.
export function parseEuroCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  if (raw === "") return { value: null };
  if (!/^\d+([.,]\d{1,2})?$/.test(raw)) return { error: true as const };
  const [euros, cents = ""] = raw.split(/[.,]/);
  return { value: Number(euros) * 100 + Number(cents.padEnd(2, "0")) };
}

export function parseCompletionForm(
  formData: FormData,
  { subject, precision, hasKm }: { subject: "car" | "driver"; precision: DuePrecision; hasKm: boolean },
): { input: CompletionInput; override: DueOverride } | { error: CompletionFormError } {
  const completedOn = String(formData.get("completedOn") ?? "");
  if (!DATE.test(completedOn) || Number.isNaN(Date.parse(completedOn))) return { error: "errorDate" };

  let odometer: number | null = null;
  let result: CompletionResult | null = null;
  if (subject === "car") {
    const rawOdometer = text(formData.get("odometer"));
    if (rawOdometer !== null) {
      odometer = Number(rawOdometer);
      if (!Number.isInteger(odometer) || odometer < 0) return { error: "errorOdometer" };
    }
    const rawResult = formData.get("result");
    if (!COMPLETION_RESULTS.includes(rawResult as CompletionResult)) return { error: "errorResult" };
    result = rawResult as CompletionResult;
  }

  const cost = parseEuroCents(formData.get("cost"));
  if ("error" in cost) return { error: "errorCost" };
  const provider = text(formData.get("provider"));
  const note = text(formData.get("note"));
  const licenceClasses = text(formData.get("licenceClasses"));
  if ([provider, note, licenceClasses].some((v) => v && v.length > TEXT_MAX)) return { error: "errorText" };
  const licenceExpiresRaw = text(formData.get("licenceExpiresOn"));
  if (licenceExpiresRaw !== null && (!DATE.test(licenceExpiresRaw) || Number.isNaN(Date.parse(licenceExpiresRaw)))) {
    return { error: "errorLicence" };
  }

  const overrideDue = parseDueDate(formData.get("overrideDueOn"), precision);
  if ("error" in overrideDue) return { error: "errorOverride" };
  const overrideOdometerRaw = hasKm ? text(formData.get("overrideDueOdometer")) : null;
  const overrideOdometer = overrideOdometerRaw === null ? null : Number(overrideOdometerRaw);
  if (overrideOdometer !== null && (!Number.isInteger(overrideOdometer) || overrideOdometer < 0)) {
    return { error: "errorOverride" };
  }
  const override =
    overrideDue.value !== null || overrideOdometer !== null
      ? { nextDueOn: overrideDue.value, nextDueOdometer: overrideOdometer }
      : null;

  return {
    input: {
      completedOn,
      odometer,
      result,
      provider,
      costCents: cost.value,
      note,
      licenceClasses,
      licenceExpiresOn: licenceExpiresRaw,
    },
    override,
  };
}
