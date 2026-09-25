"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSetPasswordToken, isEmail, NAME_MAX_LENGTH, normalizeEmail } from "@/lib/accounts";
import { requireOperator } from "@/lib/actor";
import { appUrl } from "@/lib/app-url";
import {
  cancelInvitation,
  findMember,
  createOrganizationWithAdminInvitation,
  invitationBlocker,
  ORGANIZATION_NAME_MAX_LENGTH,
  reissueInvitation,
} from "@/lib/organizations";

export type CreateOrganizationState =
  | { status: "idle" }
  | { status: "error"; message: "errorName" | "errorAdminName" | "errorEmail" | "errorEmailTaken" };

export async function createOrganization(
  _previous: CreateOrganizationState,
  formData: FormData,
): Promise<CreateOrganizationState> {
  const operator = await requireOperator();
  const name = String(formData.get("name") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = normalizeEmail(formData.get("adminEmail"));

  if (!name || name.length > ORGANIZATION_NAME_MAX_LENGTH) return { status: "error", message: "errorName" };
  if (!adminName || adminName.length > NAME_MAX_LENGTH) return { status: "error", message: "errorAdminName" };
  if (!isEmail(adminEmail)) return { status: "error", message: "errorEmail" };
  if (await invitationBlocker(adminEmail)) return { status: "error", message: "errorEmailTaken" };

  const { organizationId } = await createOrganizationWithAdminInvitation({
    name,
    adminName,
    adminEmail,
    operatorId: operator.id,
  });
  revalidatePath("/operator");
  redirect(`/operator/organizations/${organizationId}`);
}

export async function revokeOrganizationInvitation(organizationId: string, invitationId: string) {
  await requireOperator();
  await cancelInvitation(organizationId, invitationId);
  revalidatePath(`/operator/organizations/${organizationId}`);
}

export async function reissueOrganizationInvitation(organizationId: string, invitationId: string) {
  const operator = await requireOperator();
  await reissueInvitation(organizationId, invitationId, operator.id);
  revalidatePath(`/operator/organizations/${organizationId}`);
}

export type AdminResetLinkState = { status: "idle" } | { status: "created"; link: string } | { status: "error" };

// Recovery for an organization whose admins are locked out: the operator may
// issue reset links for admins only, never for other members.
export async function createAdminResetLink(organizationId: string, userId: string): Promise<AdminResetLinkState> {
  await requireOperator();
  const target = await findMember(organizationId, userId);
  if (!target || target.role !== "admin") return { status: "error" };
  const token = await createSetPasswordToken(target.userId);
  return { status: "created", link: appUrl(`/set-password?token=${token}`) };
}
