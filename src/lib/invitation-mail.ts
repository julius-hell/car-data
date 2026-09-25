import { createHmac, timingSafeEqual } from "node:crypto";
import { appUrl } from "@/lib/app-url";
import { invitationEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { invitationPath, type Invitation } from "@/lib/organizations";

// The emailed link carries a proof that the copyable link lacks: accepting
// with it shows the invitee read the mailbox, so their email counts as verified.
function proofFor(invitation: Pick<Invitation, "id" | "email">) {
  return createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
    .update(`invitation:${invitation.id}:${invitation.email}`)
    .digest("base64url");
}

export function isValidProof(invitation: Pick<Invitation, "id" | "email">, proof: unknown) {
  if (typeof proof !== "string" || !proof) return false;
  const expected = Buffer.from(proofFor(invitation));
  const given = Buffer.from(proof);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function sendInvitationEmail(
  invitation: Invitation,
  organizationName: string,
  locale: string | null | undefined,
) {
  const url = appUrl(`${invitationPath(invitation.id)}?proof=${proofFor(invitation)}`);
  return sendMail(
    await invitationEmail({
      to: invitation.email,
      name: invitation.name,
      organization: organizationName,
      role: invitation.role,
      url,
      locale,
    }),
  );
}
