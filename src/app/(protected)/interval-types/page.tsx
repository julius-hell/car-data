import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DeleteIntervalTypeButton, IntervalTypeForm } from "@/components/intervals/interval-type-form";
import { requirePermission } from "@/lib/actor";
import { intervalTypeName } from "@/lib/interval-names";
import { listIntervalTypes } from "@/lib/intervals";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("IntervalTypes");
  return { title: t("title") };
}

export default async function IntervalTypesPage() {
  const actor = await requirePermission("manageFleet");
  const [types, t, ti] = await Promise.all([
    listIntervalTypes(actor.organizationId),
    getTranslations("IntervalTypes"),
    getTranslations("Intervals"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("description")}</p>
      </div>

      <ul className="flex flex-col gap-3" data-testid="interval-types">
        {types.map((type) => {
          const name = intervalTypeName(type, ti);
          return (
            <li
              key={type.id}
              data-testid="interval-type"
              data-name={name}
              className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p>
                  <span className="font-medium">{name}</span>{" "}
                  <span className="text-muted-foreground text-sm">
                    · {t(`subjects.${type.subject}`)}
                    {type.builtIn ? ` · ${t("builtIn")}` : ""}
                  </span>
                </p>
                {!type.builtIn && <DeleteIntervalTypeButton typeId={type.id} name={name} />}
              </div>
              <IntervalTypeForm
                type={{
                  id: type.id,
                  name,
                  builtIn: Boolean(type.builtIn),
                  subject: type.subject,
                  periodMonths: type.periodMonths,
                  periodKm: type.periodKm,
                  dueSoonDays: type.dueSoonDays,
                  dueSoonKm: type.dueSoonKm,
                }}
              />
            </li>
          );
        })}
      </ul>

      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5">
        <div>
          <h2 className="font-semibold">{t("newTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("newDescription")}</p>
        </div>
        <IntervalTypeForm />
      </section>
    </main>
  );
}
