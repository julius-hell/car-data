import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DamageReportList } from "@/components/damage/damage-report-list";
import { can, requirePermission } from "@/lib/actor";
import { listOpenReports } from "@/lib/damage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Damage");
  return { title: t("openTitle") };
}

// Every open damage report of the fleet.
export default async function DamagePage() {
  const actor = await requirePermission("viewFleet");
  const [reports, t] = await Promise.all([listOpenReports(actor), getTranslations("Damage")]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("openTitle")}</h1>
      </div>
      {reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noneOpen")}</p>
      ) : (
        <DamageReportList reports={reports} canResolve={can(actor, "manageFleet")} />
      )}
    </main>
  );
}
