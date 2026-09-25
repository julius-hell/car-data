"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isEmail, NAME_MAX_LENGTH, normalizeEmail } from "@/lib/accounts";
import { requireOperator } from "@/lib/actor";
import {
  cancelInvitation,
  createOrganizationWithAdminInvitation,
  emailHasMembership,
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
  if (await emailHasMembership(adminEmail)) return { status: "error", message: "errorEmailTaken" };

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
