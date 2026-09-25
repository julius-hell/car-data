import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { NewOrganizationForm } from "@/components/operator/new-organization-form";
import { requireOperator } from "@/lib/actor";
import { listOrganizationsWithCounts } from "@/lib/organizations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Operator");
  return { title: t("title") };
}

export default async function OperatorPage() {
  await requireOperator();
  const [organizations, t, format] = await Promise.all([
    listOrganizationsWithCounts(),
    getTranslations("Operator"),
    getFormatter(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      </div>

      <section className="flex flex-col gap-3">
        {organizations.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <div className="bg-card overflow-x-auto rounded-xl border shadow-xs">
            <table data-testid="organizations" className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr className="border-b">
                  <th className="px-4 py-2 font-medium">{t("organizationName")}</th>
                  <th className="px-4 py-2 font-medium">{t("status")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("members")}</th>
                  <th className="px-4 py-2 text-right font-medium">{t("cars")}</th>
                  <th className="px-4 py-2 font-medium">{t("created")}</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((organization) => (
                  <tr key={organization.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/operator/organizations/${organization.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {organization.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2" data-testid="organization-status">
                      {t(`statusValue.${organization.status}`)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums" data-testid="organization-members">
                      {format.number(organization.members)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums" data-testid="organization-cars">
                      {format.number(organization.cars)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {format.dateTime(organization.createdAt, { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5">
        <div>
          <h2 className="font-semibold">{t("newTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("newDescription")}</p>
        </div>
        <NewOrganizationForm />
      </section>
    </main>
  );
}
