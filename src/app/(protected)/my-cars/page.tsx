import type { Metadata } from "next";
import { CarIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireActor } from "@/lib/actor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyCars");
  return { title: t("title") };
}

// A driver's home: the cars currently assigned to them.
export default async function MyCarsPage() {
  await requireActor();
  const t = await getTranslations("MyCars");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      <div
        data-testid="no-cars-assigned"
        className="bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center"
      >
        <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
          <CarIcon className="size-6" />
        </span>
        <div>
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("emptyDescription")}</p>
        </div>
      </div>
    </main>
  );
}
