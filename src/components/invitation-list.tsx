import { getFormatter, getTranslations } from "next-intl/server";
import { CopyField } from "@/components/copy-field";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/app-url";
import { invitationPath, invitationState, type Invitation } from "@/lib/organizations";

// Open invitations with their copyable links. Accepted and revoked ones are
// history and not shown.
export async function InvitationList({
  invitations,
  revokeAction,
  reissueAction,
}: {
  invitations: Invitation[];
  revokeAction: (invitationId: string) => Promise<void>;
  reissueAction: (invitationId: string) => Promise<void>;
}) {
  const t = await getTranslations("Invitations");
  const format = await getFormatter();
  const now = new Date();
  const open = invitations
    .map((invitation) => ({ invitation, state: invitationState(invitation, now) }))
    .filter(({ state }) => state === "pending" || state === "expired");

  if (open.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("none")}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {open.map(({ invitation, state }) => (
        <li
          key={invitation.id}
          data-testid="invitation"
          data-state={state}
          className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{invitation.name}</p>
              <p className="text-muted-foreground truncate text-sm">
                {invitation.email} · {t(`role.${invitation.role}`)}
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              {state === "expired"
                ? t("expired")
                : t("expires", { date: format.dateTime(invitation.expiresAt, { dateStyle: "medium" }) })}
            </p>
          </div>
          {state === "pending" && (
            <CopyField
              value={appUrl(invitationPath(invitation.id))}
              label={t("linkLabel", { name: invitation.name })}
              testId="invitation-link"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <form action={reissueAction.bind(null, invitation.id)}>
              <Button type="submit" variant="outline" size="sm">
                {t("reissue")}
              </Button>
            </form>
            {state === "pending" && (
              <form action={revokeAction.bind(null, invitation.id)}>
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  {t("revoke")}
                </Button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
