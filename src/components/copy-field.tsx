"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// A read-only value (usually a link) with a button that copies it.
export function CopyField({ value, label, testId }: { value: string; label: string; testId?: string }) {
  const t = useTranslations("Common");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the field stays selectable.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        readOnly
        value={value}
        aria-label={label}
        data-testid={testId}
        onFocus={(event) => event.currentTarget.select()}
        className="font-mono text-xs"
      />
      <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0">
        {copied ? <CheckIcon aria-hidden className="size-4" /> : <CopyIcon aria-hidden className="size-4" />}
        {copied ? t("copied") : t("copy")}
      </Button>
    </div>
  );
}
