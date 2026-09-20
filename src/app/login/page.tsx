import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BrandMark, Wordmark } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PasskeyAuthForm } from "@/components/passkey-auth-form";
import { safeNextPath } from "@/lib/next-path";
import { getSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("title") };
}

export default async function LoginPage(props: PageProps<"/login">) {
  const next = safeNextPath((await props.searchParams).next) ?? "/";
  if (await getSession()) redirect(next);
  const t = await getTranslations("Auth");

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-10 overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="bg-primary/10 pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark className="size-14" />
        <div>
          <h1 className="text-3xl">
            <Wordmark />
          </h1>
          <p className="text-muted-foreground mt-1">{t("tagline")}</p>
        </div>
      </div>
      <PasskeyAuthForm next={next} />
      <p className="text-muted-foreground max-w-xs text-center text-xs">{t("footer")}</p>
    </main>
  );
}
