"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createUserWithPassword,
  findUserByEmail,
  NAME_MAX_LENGTH,
  passwordProblem,
  verifyUserPassword,
} from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { isValidProof } from "@/lib/invitation-mail";
import { isEmailEnabled } from "@/lib/mail";
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import type { Role } from "@/lib/roles";
import {
  addMember,
  findInvitationWithOrganization,
  invitationBlocker,
  invitationState,
  markInvitationAccepted,
} from "@/lib/organizations";

export type AcceptInvitationState =
  | { status: "idle" }
  | {
      status: "error";
      message:
        | "errorInvalid"
        | "errorName"
        | "passwordTooShort"
        | "passwordTooLong"
        | "errorWrongPassword"
        | "errorTaken";
    };

async function openInvitation(invitationId: string) {
  const found = await findInvitationWithOrganization(invitationId);
  if (!found || invitationState(found.invitation) !== "pending" || found.organization.status !== "active") {
    return null;
  }
  return found.invitation;
}

async function join(
  invitation: { id: string; organizationId: string; email: string; role: Role },
  account: { id: string; emailVerified: boolean },
  password: string,
  proof: FormDataEntryValue | null,
): Promise<never> {
  await addMember(invitation.organizationId, account.id, invitation.role);
  await markInvitationAccepted(invitation.id);
  // The emailed link proves the invitee reads this mailbox; a copied link
  // doesn't, so they get a verification email instead.
  if (isValidProof(invitation, proof)) {
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, account.id));
  } else if (!account.emailVerified && isEmailEnabled()) {
    await auth.api.sendVerificationEmail({ body: { email: invitation.email, callbackURL: "/" } });
  }
  await auth.api.signInEmail({ body: { email: invitation.email, password }, headers: await headers() });
  redirect("/");
}

// A person without an account joins by choosing a name and a password.
export async function acceptInvitation(
  invitationId: string,
  _previous: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const invitation = await openInvitation(invitationId);
  if (!invitation) return { status: "error", message: "errorInvalid" };

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || name.length > NAME_MAX_LENGTH) return { status: "error", message: "errorName" };
  const problem = passwordProblem(password);
  if (problem) return { status: "error", message: problem };
  if (await findUserByEmail(invitation.email)) return { status: "error", message: "errorTaken" };

  const created = await createUserWithPassword({ name, email: invitation.email, password });
  await db.update(user).set({ locale: await getLocale() }).where(eq(user.id, created.id));
  return join(invitation, created, password, formData.get("proof"));
}

// Someone who had an account before (e.g. removed from an organization)
// joins with their existing password instead of creating a second account.
export async function acceptInvitationWithAccount(
  invitationId: string,
  _previous: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const invitation = await openInvitation(invitationId);
  if (!invitation) return { status: "error", message: "errorInvalid" };
  if (await invitationBlocker(invitation.email)) return { status: "error", message: "errorTaken" };
  const existing = await findUserByEmail(invitation.email);
  if (!existing) return { status: "error", message: "errorInvalid" };

  const password = String(formData.get("password") ?? "");
  if (!(await verifyUserPassword(existing.id, password))) {
    return { status: "error", message: "errorWrongPassword" };
  }
  return join(invitation, existing, password, formData.get("proof"));
}
