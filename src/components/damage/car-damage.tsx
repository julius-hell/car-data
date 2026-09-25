import { getTranslations } from "next-intl/server";
import { DamageReportList } from "@/components/damage/damage-report-list";
import { ReportDamageDialog } from "@/components/damage/report-damage-dialog";
import { can, type Actor } from "@/lib/actor";
import { listCarReports } from "@/lib/damage";

// Damage reports of one car: all of them for the fleet, a driver's own for them.
export async function CarDamage({ actor, carId, retired }: { actor: Actor; carId: string; retired: boolean }) {
  const [reports, t] = await Promise.all([listCarReports(actor, carId), getTranslations("Damage")]);
  const canReport = can(actor, "addEntry") && !retired;

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {can(actor, "viewFleet") ? t("title") : t("myReports")}
        </h2>
        {canReport && <ReportDamageDialog carId={carId} />}
      </div>
      {reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <DamageReportList reports={reports} canResolve={can(actor, "manageFleet")} />
      )}
    </section>
  );
}
