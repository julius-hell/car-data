import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AcceptInvitationForm } from "@/components/accept-invitation-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { findUserByEmail } from "@/lib/accounts";
import { findInvitationWithOrganization, invitationBlocker, invitationState } from "@/lib/organizations";
import { getSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invite");
  return { title: t("title") };
}

export default async function InvitePage(props: PageProps<"/invite/[invitationId]">) {
  const { invitationId } = await props.params;
  const [found, session, t, tRoles] = await Promise.all([
    findInvitationWithOrganization(invitationId),
    getSession(),
    getTranslations("Invite"),
    getTranslations("Invitations"),
  ]);
  const state = found ? invitationState(found.invitation) : null;
  const blocked = found && state === "pending" ? await invitationBlocker(found.invitation.email) : null;

  if (!found || state !== "pending" || found.organization.status !== "active" || blocked) {
    return (
      <AuthShell>
        <Card data-testid="invite-unavailable" className="w-full max-w-sm shadow-sm">
          <CardHeader>
            <CardTitle>{t("unavailableTitle")}</CardTitle>
            <CardDescription>
              {state === "expired"
                ? t("expired")
                : state === "accepted"
                  ? t("used")
                  : blocked
                    ? t("taken")
                    : t("unavailable")}
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }

  const { invitation, organization } = found;
  const hasAccount = Boolean(await findUserByEmail(invitation.email));
  return (
    <AuthShell>
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader>
          <CardTitle>{t("heading", { organization: organization.name })}</CardTitle>
          <CardDescription data-testid="invite-summary">
            {t("summary", { organization: organization.name, role: tRoles(`role.${invitation.role}`) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session ? (
            <div className="flex flex-col gap-3 text-sm">
              <p>{t("signedInAs", { email: session.user.email })}</p>
              <SignOutButton redirectTo={`/invite/${invitation.id}`} />
            </div>
          ) : (
            <AcceptInvitationForm
              invitationId={invitation.id}
              name={invitation.name}
              email={invitation.email}
              hasAccount={hasAccount}
            />
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
