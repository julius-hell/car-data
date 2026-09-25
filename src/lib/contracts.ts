import { eq, inArray } from "drizzle-orm";
import { parseKmRate } from "@/lib/allowance";
import { parseEuroCents } from "@/lib/completion-form";
import { db } from "@/lib/db";
import {
  contract,
  CONTRACT_KINDS,
  INCLUDED_SERVICES,
  type Contract,
  type ContractKind,
  type IncludedService,
} from "@/lib/db/schema";
import { addMonths, daysBetween, type DueLevel } from "@/lib/due";
import { addDaysIso } from "@/lib/today";

export async function getContract(carId: string) {
  return db.query.contract.findFirst({ where: eq(contract.carId, carId) });
}

export async function contractsByCar(carIds: string[]) {
  if (carIds.length === 0) return new Map<string, Contract>();
  const rows = await db.query.contract.findMany({ where: inArray(contract.carId, carIds) });
  return new Map(rows.map((row) => [row.carId, row]));
}

// A term of 36 months from 15 Jan 2024 ends on 14 Jan 2027.
export function termEnd(startOn: string, termMonths: number) {
  return addDaysIso(addMonths(startOn, termMonths), -1);
}

export type ContractStatus = { level: DueLevel; endOn: string; daysLeft: number } | null;

// Leased, financed and rented cars count down to their contract end: due
// soon inside the alert window, overdue once the end has passed.
export function contractStatus(row: Pick<Contract, "kind" | "endOn" | "endAlertMonths">, today: string): ContractStatus {
  if (row.kind === "owned" || !row.endOn) return null;
  const daysLeft = daysBetween(today, row.endOn);
  const alertFrom = addMonths(row.endOn, -row.endAlertMonths);
  return {
    endOn: row.endOn,
    daysLeft,
    level: daysLeft < 0 ? "overdue" : today >= alertFrom ? "soon" : "ok",
  };
}

// Everything an admin enters in the contract form; the return is recorded separately.
export type ContractValues = Omit<Contract, "id" | "carId" | "updatedAt" | "returnedOn" | "returnOdometer" | "returnNotes">;

export type ContractFormError =
  | "errorKind"
  | "errorDate"
  | "errorTerm"
  | "errorMoney"
  | "errorText"
  | "errorAlert"
  | "errorAllowance"
  | "errorRate";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Reads the fields that belong to the chosen kind; the others are cleared.
export function parseContractForm(formData: FormData): { values: ContractValues } | { error: ContractFormError } {
  const kind = formData.get("kind") as ContractKind;
  if (!CONTRACT_KINDS.includes(kind)) return { error: "errorKind" };

  const text = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value === "" ? null : value;
  };
  const date = (name: string) => {
    const value = text(name);
    if (value === null) return { value: null };
    return DATE.test(value) && !Number.isNaN(Date.parse(value)) ? { value } : { error: true as const };
  };
  const money = (name: string) => parseEuroCents(formData.get(name));

  const values: ContractValues = {
    kind,
    counterparty: null,
    contractNumber: null,
    startOn: null,
    termMonths: null,
    endOn: null,
    monthlyRateCents: null,
    downPaymentCents: null,
    balloonPaymentCents: null,
    purchasedOn: null,
    purchasePriceCents: null,
    includedServices: [],
    includedOther: null,
    endAlertMonths: 6,
    kmPerYear: null,
    handoverOdometer: null,
    excessKmRate: null,
    underKmRate: null,
  };

  const alert = text("endAlertMonths");
  if (alert !== null) {
    const months = Number(alert);
    if (!Number.isInteger(months) || months < 0 || months > 36) return { error: "errorAlert" };
    values.endAlertMonths = months;
  }

  if (kind === "owned") {
    const purchasedOn = date("purchasedOn");
    const price = money("purchasePrice");
    if ("error" in purchasedOn) return { error: "errorDate" };
    if ("error" in price) return { error: "errorMoney" };
    values.purchasedOn = purchasedOn.value;
    values.purchasePriceCents = price.value;
    return { values };
  }

  values.counterparty = text("counterparty");
  values.contractNumber = text("contractNumber");
  if ([values.counterparty, values.contractNumber].some((v) => v && v.length > 100)) return { error: "errorText" };
  const startOn = date("startOn");
  if ("error" in startOn) return { error: "errorDate" };
  values.startOn = startOn.value;
  const rate = money("monthlyRate");
  if ("error" in rate) return { error: "errorMoney" };
  values.monthlyRateCents = rate.value;

  if (kind === "rented") {
    const endOn = date("endOn");
    if ("error" in endOn) return { error: "errorDate" };
    if (endOn.value && values.startOn && endOn.value < values.startOn) return { error: "errorDate" };
    values.endOn = endOn.value;
  } else {
    const term = text("termMonths");
    if (term !== null) {
      const months = Number(term);
      if (!Number.isInteger(months) || months < 1 || months > 120) return { error: "errorTerm" };
      values.termMonths = months;
    }
    const down = money("downPayment");
    if ("error" in down) return { error: "errorMoney" };
    values.downPaymentCents = down.value;
    if (values.startOn && values.termMonths) values.endOn = termEnd(values.startOn, values.termMonths);
  }

  if (kind === "financed") {
    const balloon = money("balloonPayment");
    if ("error" in balloon) return { error: "errorMoney" };
    values.balloonPaymentCents = balloon.value;
  } else {
    values.includedServices = formData
      .getAll("includedServices")
      .filter((service): service is IncludedService => INCLUDED_SERVICES.includes(service as IncludedService));
    values.includedOther = text("includedOther");
    if (values.includedOther && values.includedOther.length > 200) return { error: "errorText" };

    for (const [name, key] of [
      ["kmPerYear", "kmPerYear"],
      ["handoverOdometer", "handoverOdometer"],
    ] as const) {
      const raw = text(name);
      if (raw === null) continue;
      const number = Number(raw);
      if (!Number.isInteger(number) || number < 0) return { error: "errorAllowance" };
      values[key] = number;
    }
    const excess = parseKmRate(formData.get("excessKmRate"));
    const under = parseKmRate(formData.get("underKmRate"));
    if ("error" in excess || "error" in under) return { error: "errorRate" };
    values.excessKmRate = excess.value;
    values.underKmRate = under.value;
  }
  return { values };
}

export async function saveContract(carId: string, values: ContractValues) {
  const [saved] = await db
    .insert(contract)
    .values({ carId, ...values })
    .onConflictDoUpdate({ target: contract.carId, set: { ...values, updatedAt: new Date() } })
    .returning();
  return saved;
}
