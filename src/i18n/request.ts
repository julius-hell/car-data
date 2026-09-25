import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getSession } from "@/lib/session";
import { isLocale, LOCALE_COOKIE, negotiateLocale } from "./config";

// A chosen language (cookie, then the account's preference) beats the browser's.
async function resolveLocale() {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  const session = await getSession().catch(() => null);
  const accountLocale = session?.user.locale;
  if (isLocale(accountLocale)) return accountLocale;
  return negotiateLocale((await headers()).get("accept-language"));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "UTC",
  };
});
