import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { InvitationList } from "@/components/invitation-list";
import { ResetLinkButton } from "@/components/reset-link-button";
import { DeleteOrganizationForm } from "@/components/operator/delete-organization-form";
import { Button } from "@/components/ui/button";
import { requireOperator } from "@/lib/actor";
import { findOrganization, listAdmins, listInvitations } from "@/lib/organizations";
import {
  createAdminResetLink,
  deactivateOrganization,
  reactivateOrganization,
  reissueOrganizationInvitation,
  revokeOrganizationInvitation,
} from "../../actions";

export async function generateMetadata(
  props: PageProps<"/operator/organizations/[organizationId]">,
): Promise<Metadata> {
  await requireOperator();
  const { organizationId } = await props.params;
  const organization = await findOrganization(organizationId);
  return { title: organization?.name };
}

export default async function OperatorOrganizationPage(
  props: PageProps<"/operator/organizations/[organizationId]">,
) {
  await requireOperator();
  const { organizationId } = await props.params;
  const organization = await findOrganization(organizationId);
  if (!organization) notFound();
  const [admins, invitations, t] = await Promise.all([
    listAdmins(organization.id),
    listInvitations(organization.id),
    getTranslations("Operator"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/operator"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          {t("allOrganizations")}
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
          <span data-testid="organization-status" className="text-muted-foreground text-sm">
            {t(`statusValue.${organization.status}`)}
          </span>
          <form
            action={(organization.status === "active" ? deactivateOrganization : reactivateOrganization).bind(
              null,
              organization.id,
            )}
            className="ml-auto"
          >
            <Button type="submit" variant="outline" size="sm">
              {organization.status === "active" ? t("deactivate") : t("reactivate")}
            </Button>
          </form>
        </div>
        {organization.status === "deactivated" && (
          <p className="text-muted-foreground text-sm">{t("deactivatedHint")}</p>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("admins")}</h2>
        {admins.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noAdmins")}</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="organization-admins">
            {admins.map((admin) => (
              <li
                key={admin.userId}
                data-testid="organization-admin"
                className="bg-card flex flex-col gap-2 rounded-xl border p-3 text-sm shadow-xs"
              >
                <p>
                  <span className="font-medium">{admin.name}</span>{" "}
                  <span className="text-muted-foreground">{admin.email}</span>
                </p>
                <ResetLinkButton
                  action={createAdminResetLink.bind(null, organization.id, admin.userId)}
                  name={admin.name}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("invitations")}
        </h2>
        <InvitationList
          invitations={invitations}
          revokeAction={revokeOrganizationInvitation.bind(null, organization.id)}
          reissueAction={reissueOrganizationInvitation.bind(null, organization.id)}
        />
      </section>

      <section className="border-destructive/40 flex flex-col gap-3 rounded-xl border p-4 sm:p-5">
        <div>
          <h2 className="text-destructive font-semibold">{t("deleteTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("deleteDescription")}</p>
        </div>
        <DeleteOrganizationForm organizationId={organization.id} name={organization.name} />
      </section>
    </main>
  );
}
