import { FileTextIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { AllowancePanel } from "@/components/contracts/allowance-panel";
import { ContractDialog } from "@/components/contracts/contract-dialog";
import { ReturnDialog } from "@/components/contracts/return-dialog";
import { DueBadge } from "@/components/due-badge";
import { listContractAttachments, listReturnAttachments } from "@/lib/attachments";
import { contractStatus, getContract } from "@/lib/contracts";
import { isoDateToDate } from "@/lib/dates";
import { todayIso } from "@/lib/today";

// How the car is held, for admins and viewers.
export async function CarContract({ carId, canManage }: { carId: string; canManage: boolean }) {
  const [contract, t, format] = await Promise.all([getContract(carId), getTranslations("Contracts"), getFormatter()]);
  const [files, returnFiles] = contract
    ? await Promise.all([listContractAttachments(contract.id), listReturnAttachments(contract.id)])
    : [[], []];
  // A returned contract is over; it no longer counts down.
  const status = contract && !contract.returnedOn ? contractStatus(contract, todayIso()) : null;
  const returnable = contract && (contract.kind === "leased" || contract.kind === "rented") && !contract.returnedOn;
  const date = (iso: string | null) => (iso ? format.dateTime(isoDateToDate(iso), { dateStyle: "medium" }) : null);
  const money = (cents: number | null) =>
    cents === null ? null : format.number(cents / 100, { style: "currency", currency: "EUR" });

  const rows: [string, string | null][] = contract
    ? contract.kind === "owned"
      ? [
          [t("purchasedOn"), date(contract.purchasedOn)],
          [t("purchasePrice"), money(contract.purchasePriceCents)],
        ]
      : [
          [t(`counterparty.${contract.kind}`), contract.counterparty],
          [t("contractNumber"), contract.contractNumber],
          [t("startOn"), date(contract.startOn)],
          [t("termMonths"), contract.termMonths ? t("months", { count: contract.termMonths }) : null],
          [t("endOn"), date(contract.endOn)],
          [t("monthlyRate"), money(contract.monthlyRateCents)],
          [t("downPayment"), money(contract.downPaymentCents)],
          [t("balloonPayment"), money(contract.balloonPaymentCents)],
          [
            t("includedServices"),
            [...contract.includedServices.map((s) => t(`services.${s}`)), contract.includedOther]
              .filter(Boolean)
              .join(", ") || null,
          ],
        ]
    : [];

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5" data-testid="contract">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("title")}</h2>
          {contract && (
            <span className="text-sm font-medium" data-testid="contract-kind">
              {t(`kinds.${contract.kind}`)}
            </span>
          )}
          {status && <DueBadge level={status.level} testId="contract-level" />}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {returnable && <ReturnDialog carId={carId} />}
            <ContractDialog carId={carId} contract={contract ?? null} />
          </div>
        )}
      </div>
      {!contract ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd data-testid="contract-field">{value}</dd>
              </div>
            ))}
        </dl>
      )}
      {status && status.level !== "ok" && (
        <p className="text-sm" data-testid="contract-ending">
          {status.daysLeft < 0
            ? t("ended", { date: date(status.endOn)! })
            : t("endsIn", { count: status.daysLeft, date: date(status.endOn)! })}
        </p>
      )}
      {contract && (contract.kind === "leased" || contract.kind === "rented") && (
        <AllowancePanel contract={contract} />
      )}
      {contract?.returnedOn && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3 text-sm" data-testid="contract-return">
          <p className="font-medium">
            {t("returnedSummary", {
              date: date(contract.returnedOn)!,
              odometer: format.number(contract.returnOdometer ?? 0),
            })}
          </p>
          {contract.returnNotes && <p className="whitespace-pre-line">{contract.returnNotes}</p>}
          {returnFiles.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {returnFiles.map((file) => (
                <li key={file.id}>
                  <a
                    href={`/attachments/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="return-attachment-link"
                    className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    <FileTextIcon aria-hidden className="size-4" />
                    {file.fileName}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {files.map((file) => (
            <li key={file.id}>
              <a
                href={`/attachments/${file.id}`}
                target="_blank"
                rel="noreferrer"
                data-testid="attachment-link"
                className="text-primary inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
              >
                <FileTextIcon aria-hidden className="size-4" />
                {file.fileName}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
