"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { CopyField } from "@/components/copy-field";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";

type ResetLinkResult = { status: "idle" } | { status: "created"; link: string } | { status: "error" };

// Issues a one-time password-reset link that an admin (or the operator)
// hands over; works whether or not the deployment can send email.
export function ResetLinkButton({ action, name }: { action: () => Promise<ResetLinkResult>; name: string }) {
  const t = useTranslations("Team");
  const [result, setResult] = useState<ResetLinkResult>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        className="self-start"
        aria-label={t("resetLinkLabel", { name })}
        onClick={() => startTransition(async () => setResult(await action()))}
      >
        {t("resetLink")}
      </Button>
      {result.status === "created" && (
        <>
          <CopyField value={result.link} label={t("resetLinkField", { name })} testId="reset-link" />
          <p className="text-muted-foreground text-xs">{t("resetLinkHint")}</p>
        </>
      )}
      {result.status === "error" && <FormMessage kind="error">{t("errorGone")}</FormMessage>}
    </div>
  );
}
