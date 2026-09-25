"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { saveContractAction, type ContractState } from "@/app/(protected)/cars/[carId]/contract-actions";
import { FormMessage } from "@/components/form-message";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Contract, ContractKind } from "@/lib/db/schema";

const KINDS: ContractKind[] = ["owned", "leased", "financed", "rented"];
const SERVICES = ["maintenance", "tyres", "insurance", "vehicle_tax"] as const;
const euros = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  inputMode,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
  inputMode?: "decimal" | "numeric";
}) {
  const id = `contract-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} inputMode={inputMode} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

export function ContractDialog({ carId, contract }: { carId: string; contract: Contract | null }) {
  const t = useTranslations("Contracts");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ContractKind>(contract?.kind ?? "leased");
  const [state, action, pending] = useActionState<ContractState, FormData>(saveContractAction.bind(null, carId), {
    status: "idle",
  });
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "saved") setOpen(false);
  }
  // Values only carry over while the kind stays the same.
  const same = contract?.kind === kind ? contract : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {contract ? t("edit") : t("add")}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form action={action} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-kind">{t("kind")}</Label>
            <NativeSelect
              id="contract-kind"
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as ContractKind)}
            >
              {KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(`kinds.${option}`)}
                </option>
              ))}
            </NativeSelect>
          </div>

          {kind === "owned" ? (
            <div className="grid gap-4 sm:grid-cols-2" key="owned">
              <Field name="purchasedOn" label={t("purchasedOn")} type="date" defaultValue={same?.purchasedOn} />
              <Field name="purchasePrice" label={t("purchasePrice")} inputMode="decimal" defaultValue={euros(same?.purchasePriceCents)} />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2" key={kind}>
              <Field name="counterparty" label={t(`counterparty.${kind}`)} defaultValue={same?.counterparty} />
              <Field name="contractNumber" label={t("contractNumber")} defaultValue={same?.contractNumber} />
              <Field name="startOn" label={t("startOn")} type="date" defaultValue={same?.startOn} />
              {kind === "rented" ? (
                <Field name="endOn" label={t("endOn")} type="date" defaultValue={same?.endOn} />
              ) : (
                <Field name="termMonths" label={t("termMonths")} inputMode="numeric" defaultValue={same?.termMonths} />
              )}
              <Field name="monthlyRate" label={t("monthlyRate")} inputMode="decimal" defaultValue={euros(same?.monthlyRateCents)} />
              {kind !== "rented" && (
                <Field name="downPayment" label={t("downPayment")} inputMode="decimal" defaultValue={euros(same?.downPaymentCents)} />
              )}
              {kind === "financed" && (
                <Field
                  name="balloonPayment"
                  label={t("balloonPayment")}
                  inputMode="decimal"
                  defaultValue={euros(same?.balloonPaymentCents)}
                />
              )}
              <Field
                name="endAlertMonths"
                label={t("endAlertMonths")}
                inputMode="numeric"
                defaultValue={same?.endAlertMonths ?? 6}
              />
            </div>
          )}

          {(kind === "leased" || kind === "rented") && (
            <fieldset className="flex flex-col gap-2" key={`services-${kind}`}>
              <legend className="text-sm font-medium">{t("includedServices")}</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {SERVICES.map((service) => (
                  <label key={service} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="includedServices"
                      value={service}
                      defaultChecked={same?.includedServices.includes(service)}
                    />
                    {t(`services.${service}`)}
                  </label>
                ))}
              </div>
              <Field name="includedOther" label={t("includedOther")} defaultValue={same?.includedOther} />
            </fieldset>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-files">{t("documents")}</Label>
            <Input
              id="contract-files"
              name="files"
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.heic"
            />
          </div>
          {state.status === "error" && (
            <FormMessage kind="error" testId="contract-error">
              {t(state.message)}
            </FormMessage>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
