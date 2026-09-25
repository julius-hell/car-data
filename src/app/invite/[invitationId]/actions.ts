"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createUserWithPassword,
  findUserByEmail,
  NAME_MAX_LENGTH,
  passwordProblem,
} from "@/lib/accounts";
import { auth } from "@/lib/auth";
import {
  addMember,
  findInvitationWithOrganization,
  invitationState,
  markInvitationAccepted,
} from "@/lib/organizations";

export type AcceptInvitationState =
  | { status: "idle" }
  | {
      status: "error";
      message: "errorInvalid" | "errorName" | "passwordTooShort" | "passwordTooLong" | "errorEmailTaken";
    };

export async function acceptInvitation(
  invitationId: string,
  _previous: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const found = await findInvitationWithOrganization(invitationId);
  if (!found || invitationState(found.invitation) !== "pending") {
    return { status: "error", message: "errorInvalid" };
  }
  const { invitation } = found;

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || name.length > NAME_MAX_LENGTH) return { status: "error", message: "errorName" };
  const problem = passwordProblem(password);
  if (problem) return { status: "error", message: problem };
  if (await findUserByEmail(invitation.email)) return { status: "error", message: "errorEmailTaken" };

  const created = await createUserWithPassword({ name, email: invitation.email, password });
  await addMember(invitation.organizationId, created.id, invitation.role);
  await markInvitationAccepted(invitation.id);

  await auth.api.signInEmail({
    body: { email: invitation.email, password },
    headers: await headers(),
  });
  redirect("/");
}
