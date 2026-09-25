import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { DriverChecks } from "@/components/intervals/driver-checks";
import { requirePermission } from "@/lib/actor";
import { listMemberAssignments } from "@/lib/assignments";
import { isoDateToDate } from "@/lib/dates";
import { listMembers } from "@/lib/organizations";
import { todayIso } from "@/lib/today";

async function loadMember(userId: string) {
  const actor = await requirePermission("manageMembers");
  const member = (await listMembers(actor.organizationId)).find((m) => m.userId === userId);
  if (!member) notFound();
  return { actor, member };
}

export async function generateMetadata(props: PageProps<"/team/members/[userId]">): Promise<Metadata> {
  const { member } = await loadMember((await props.params).userId);
  return { title: member.name };
}

// One member: their role and which cars they drive and drove.
export default async function MemberPage(props: PageProps<"/team/members/[userId]">) {
  const { actor, member } = await loadMember((await props.params).userId);
  const [assignments, t, tRoles, ta, format] = await Promise.all([
    listMemberAssignments(actor.organizationId, member.userId),
    getTranslations("Team"),
    getTranslations("Invitations"),
    getTranslations("Assignments"),
    getFormatter(),
  ]);
  const today = todayIso();
  const formatDate = (iso: string) => format.dateTime(isoDateToDate(iso), { dateStyle: "medium" });
  const current = assignments.filter((a) => a.startsOn <= today && (a.endsOn === null || a.endsOn >= today));
  const past = assignments.filter((a) => !current.includes(a));
  const period = (a: (typeof assignments)[number]) =>
    a.endsOn
      ? ta("fromUntil", { from: formatDate(a.startsOn), until: formatDate(a.endsOn) })
      : ta("since", { from: formatDate(a.startsOn) });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/team"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {t("title")}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{member.name}</h1>
          <p className="text-muted-foreground text-sm">
            {member.email} · {tRoles(`role.${member.role}`)}
          </p>
        </div>
      </div>

      <section className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-5">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("driverChecksTitle")}</h2>
        <DriverChecks organizationId={actor.organizationId} userId={member.userId} manage />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("currentCarsTitle")}</h2>
        {current.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noCurrentCars")}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm" data-testid="member-current-cars">
            {current.map((a) => (
              <li key={a.id}>
                <Link href={`/cars/${a.carId}`} className="font-mono font-semibold underline-offset-4 hover:underline">
                  {a.licencePlate}
                </Link>{" "}
                <span className="text-muted-foreground">{period(a)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("pastCarsTitle")}</h2>
        {past.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noPastCars")}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm" data-testid="member-past-cars">
            {past.map((a) => (
              <li key={a.id}>
                <Link href={`/cars/${a.carId}`} className="font-mono font-semibold underline-offset-4 hover:underline">
                  {a.licencePlate}
                </Link>{" "}
                <span className="text-muted-foreground">{period(a)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
