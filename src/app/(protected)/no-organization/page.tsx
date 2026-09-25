import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getMembership } from "@/lib/actor";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NoOrganization");
  return { title: t("title") };
}

export default async function NoOrganizationPage() {
  const { user } = await requireSession();
  if (user.isOperator || (await getMembership())) redirect("/");
  const t = await getTranslations("NoOrganization");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      <p className="text-muted-foreground" data-testid="no-organization">
        {t("description")}
      </p>
    </main>
  );
}
