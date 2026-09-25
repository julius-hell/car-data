"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSetPasswordToken, isEmail, NAME_MAX_LENGTH, normalizeEmail } from "@/lib/accounts";
import { assertCan, isRole, requireActor } from "@/lib/actor";
import { appUrl } from "@/lib/app-url";
import { sendInvitationEmail } from "@/lib/invitation-mail";
import { getLocale } from "next-intl/server";
import {
  cancelInvitation,
  changeMemberRole,
  createInvitation,
  findMember,
  hasOpenInvitation,
  invitationBlocker,
  ORGANIZATION_NAME_MAX_LENGTH,
  reissueInvitation,
  removeMember,
  renameOrganization,
} from "@/lib/organizations";

async function requireAdmin() {
  const actor = await requireActor();
  assertCan(actor, "manageMembers");
  return actor;
}

export type InviteState =
  | { status: "idle" }
  | { status: "invited"; name: string }
  | {
      status: "error";
      message: "errorName" | "errorEmail" | "errorRole" | "errorMember" | "errorOperator" | "errorPending";
    };

export async function inviteMember(_previous: InviteState, formData: FormData): Promise<InviteState> {
  const actor = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const role = formData.get("role");
  if (!name || name.length > NAME_MAX_LENGTH) return { status: "error", message: "errorName" };
  if (!isEmail(email)) return { status: "error", message: "errorEmail" };
  if (!isRole(role)) return { status: "error", message: "errorRole" };
  const blocker = await invitationBlocker(email);
  if (blocker) return { status: "error", message: blocker === "operator" ? "errorOperator" : "errorMember" };
  if (await hasOpenInvitation(actor.organizationId, email)) return { status: "error", message: "errorPending" };

  const created = await createInvitation({
    organizationId: actor.organizationId,
    inviterId: actor.userId,
    name,
    email,
    role,
  });
  await sendInvitationEmail(created, actor.organizationName, await getLocale());
  revalidatePath("/team");
  return { status: "invited", name };
}

export async function revokeMemberInvitation(invitationId: string) {
  const actor = await requireAdmin();
  await cancelInvitation(actor.organizationId, invitationId);
  revalidatePath("/team");
}

export async function reissueMemberInvitation(invitationId: string) {
  const actor = await requireAdmin();
  const reissued = await reissueInvitation(actor.organizationId, invitationId, actor.userId);
  if (reissued) await sendInvitationEmail(reissued, actor.organizationName, await getLocale());
  revalidatePath("/team");
}

export type MemberActionState = { status: "idle" } | { status: "saved" } | { status: "error"; message: "errorLastAdmin" | "errorGone" };

export async function updateMemberRole(
  userId: string,
  _previous: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const actor = await requireAdmin();
  const role = formData.get("role");
  if (!isRole(role)) return { status: "error", message: "errorGone" };
  const result = await changeMemberRole(actor.organizationId, userId, role);
  if (result === "lastAdmin") return { status: "error", message: "errorLastAdmin" };
  if (result === "notFound") return { status: "error", message: "errorGone" };
  revalidatePath("/team");
  if (userId === actor.userId) redirect("/");
  return { status: "saved" };
}

export async function removeMemberAction(userId: string): Promise<MemberActionState> {
  const actor = await requireAdmin();
  const result = await removeMember(actor.organizationId, userId);
  if (result === "lastAdmin") return { status: "error", message: "errorLastAdmin" };
  if (result === "notFound") return { status: "error", message: "errorGone" };
  revalidatePath("/team");
  if (userId === actor.userId) redirect("/login");
  return { status: "saved" };
}

export type ResetLinkState = { status: "idle" } | { status: "created"; link: string } | { status: "error" };

export async function createMemberResetLink(userId: string): Promise<ResetLinkState> {
  const actor = await requireAdmin();
  const target = await findMember(actor.organizationId, userId);
  if (!target) return { status: "error" };
  const token = await createSetPasswordToken(target.userId);
  return { status: "created", link: appUrl(`/set-password?token=${token}`) };
}

export type RenameState = { status: "idle" } | { status: "saved" } | { status: "error" };

export async function renameOrganizationAction(_previous: RenameState, formData: FormData): Promise<RenameState> {
  const actor = await requireActor();
  assertCan(actor, "manageOrganization");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > ORGANIZATION_NAME_MAX_LENGTH) return { status: "error" };
  await renameOrganization(actor.organizationId, name);
  revalidatePath("/", "layout");
  return { status: "saved" };
}
