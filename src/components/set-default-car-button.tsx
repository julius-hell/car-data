"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { setDefaultCar } from "@/app/(protected)/cars/actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ carName }: { carName: string }) {
  const t = useTranslations("Cars");
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={t("setDefaultLabel", { name: carName })}
    >
      {pending ? t("saving") : t("setDefault")}
    </Button>
  );
}

export function SetDefaultCarButton({ carId, carName }: { carId: string; carName: string }) {
  return (
    <form action={setDefaultCar.bind(null, carId)}>
      <SubmitButton carName={carName} />
    </form>
  );
}
