"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/utils";

const names: Record<(typeof locales)[number], string> = { en: "English", de: "Deutsch" };

export function LocaleSwitcher() {
  const t = useTranslations("Header");
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="bg-muted flex items-center rounded-md p-0.5 text-xs font-medium"
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-label={names[locale]}
          aria-pressed={locale === current}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setLocale(locale);
              router.refresh();
            })
          }
          className={cn(
            "rounded-[5px] px-2 py-1 uppercase transition-colors",
            locale === current
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
