import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InvitationList } from "@/components/invitation-list";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import { MemberRow } from "@/components/team/member-row";
import { RenameOrganizationForm } from "@/components/team/rename-organization-form";
import { requirePermission } from "@/lib/actor";
import { currentPlatesByUser } from "@/lib/assignments";
import { listInvitations, listMembers } from "@/lib/organizations";
import { reissueMemberInvitation, revokeMemberInvitation } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team");
  return { title: t("title") };
}

export default async function TeamPage() {
  const actor = await requirePermission("manageMembers");
  const [members, invitations, plates, t] = await Promise.all([
    listMembers(actor.organizationId),
    listInvitations(actor.organizationId),
    currentPlatesByUser(actor.organizationId),
    getTranslations("Team"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      </div>

      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5">
        <h2 className="font-semibold">{t("organization")}</h2>
        <RenameOrganizationForm name={actor.organizationName} />
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5">
        <div>
          <h2 className="font-semibold">{t("inviteTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("inviteDescription")}</p>
        </div>
        <InviteMemberForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("invitations")}</h2>
        <InvitationList
          invitations={invitations}
          revokeAction={revokeMemberInvitation}
          reissueAction={reissueMemberInvitation}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("members")}</h2>
        <ul className="flex flex-col gap-3" data-testid="members">
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              member={{
                ...member,
                isSelf: member.userId === actor.userId,
                cars: plates.get(member.userId) ?? [],
              }}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}
