import { getFormatter, getTranslations } from "next-intl/server";
import { DueBadge } from "@/components/due-badge";
import { projectAllowance } from "@/lib/allowance";
import type { Contract } from "@/lib/db/schema";
import { odometerContext } from "@/lib/intervals";
import { todayIso } from "@/lib/today";

// Km driven against the allowance, projected to the contract end.
export async function AllowancePanel({ contract }: { contract: Contract }) {
  if (
    contract.returnedOn ||
    !contract.startOn ||
    !contract.endOn ||
    contract.kmPerYear === null ||
    contract.handoverOdometer === null
  ) {
    return null;
  }
  const [context, t, format] = await Promise.all([
    odometerContext([contract.carId]),
    getTranslations("Contracts"),
    getFormatter(),
  ]);
  const projection = projectAllowance(
    {
      startOn: contract.startOn,
      endOn: contract.endOn,
      termMonths: contract.termMonths,
      kmPerYear: contract.kmPerYear,
      handoverOdometer: contract.handoverOdometer,
      excessKmRate: contract.excessKmRate,
      underKmRate: contract.underKmRate,
    },
    { today: todayIso(), ...(context.get(contract.carId) ?? { latestOdometer: null, kmPerDay: null }) },
  );
  const km = (value: number) => `${format.number(value)} km`;
  const euros = (cents: number) => format.number(cents / 100, { style: "currency", currency: "EUR" });

  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3 text-sm" data-testid="allowance" data-level={projection.level}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{t("allowance")}</span>
        <DueBadge level={projection.level} testId="allowance-level" />
      </div>
      <p data-testid="allowance-to-date">
        {projection.drivenToDate === null
          ? t("noReadingsYet")
          : t("drivenVsAllowance", {
              driven: km(projection.drivenToDate),
              allowance: km(projection.allowanceToDate),
              total: km(projection.allowanceTotal),
            })}
      </p>
      <p data-testid="allowance-projection">
        {projection.projectedEndOdometer === null || projection.projectedDifference === null
          ? t("needsTwoReadings")
          : projection.projectedDifference > 0
            ? t("projectedExcess", {
                odometer: km(projection.projectedEndOdometer),
                km: km(projection.projectedDifference),
              })
            : t("projectedShortfall", {
                odometer: km(projection.projectedEndOdometer),
                km: km(-projection.projectedDifference),
              })}
        {projection.expectedCostCents !== null && ` ${t("expectedCost", { amount: euros(projection.expectedCostCents) })}`}
        {projection.expectedCreditCents !== null &&
          ` ${t("expectedCredit", { amount: euros(projection.expectedCreditCents) })}`}
      </p>
    </div>
  );
}
