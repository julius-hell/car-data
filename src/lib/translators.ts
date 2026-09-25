import { createTranslator } from "next-intl";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

// Translators for a recipient's language, outside a request (emails, feeds).
export async function translatorsFor(locale: string | null | undefined) {
  const resolved: Locale = isLocale(locale) ? locale : defaultLocale;
  const messages = (await import(`../../messages/${resolved}.json`)).default;
  return {
    locale: resolved,
    email: createTranslator({ locale: resolved, messages, namespace: "Email" }),
    dashboard: createTranslator({ locale: resolved, messages, namespace: "Dashboard" }),
    intervals: createTranslator({ locale: resolved, messages, namespace: "Intervals" }),
    due: createTranslator({ locale: resolved, messages, namespace: "Due" }),
    calendar: createTranslator({ locale: resolved, messages, namespace: "Calendar" }),
  };
}
