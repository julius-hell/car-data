"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { resolveDamage, type DamageState } from "@/app/(protected)/damage/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResolveDamageForm({ reportId }: { reportId: string }) {
  const t = useTranslations("Damage");
  const [state, action, pending] = useActionState<DamageState, FormData>(resolveDamage.bind(null, reportId), {
    status: "idle",
  });
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Input name="resolutionNote" placeholder={t("resolutionPlaceholder")} aria-label={t("resolutionNote")} className="max-w-sm" />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {t("resolve")}
        </Button>
      </div>
      {state.status === "error" && <FormMessage kind="error">{t(state.message)}</FormMessage>}
    </form>
  );
}
