import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Offline");
  return { title: t("title") };
}

export default async function OfflinePage() {
  const t = await getTranslations("Offline");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      <p className="text-muted-foreground max-w-sm">{t("description")}</p>
    </main>
  );
}
