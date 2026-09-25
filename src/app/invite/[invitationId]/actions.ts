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
  userId: string,
  password: string,
): Promise<never> {
  await addMember(invitation.organizationId, userId, invitation.role);
  await markInvitationAccepted(invitation.id);
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
  return join(invitation, created.id, password);
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
  return join(invitation, existing.id, password);
}
