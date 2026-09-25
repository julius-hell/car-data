import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { findUserByEmail, normalizeEmail } from "@/lib/accounts";
import { db } from "@/lib/db";
import { car, invitation, member, organization, session, user } from "@/lib/db/schema";
import type { Role } from "@/lib/actor";
import { ensureBuiltInTypes } from "@/lib/intervals";

export const ORGANIZATION_NAME_MAX_LENGTH = 100;
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Invitation = typeof invitation.$inferSelect;
export type InvitationState = "pending" | "expired" | "canceled" | "accepted";

export function invitationState(row: Pick<Invitation, "status" | "expiresAt">, now = new Date()): InvitationState {
  if (row.status === "accepted") return "accepted";
  if (row.status === "canceled" || row.status === "rejected") return "canceled";
  return row.expiresAt < now ? "expired" : "pending";
}

export function invitationPath(id: string) {
  return `/invite/${id}`;
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${randomBytes(3).toString("hex")}`;
}

export async function listOrganizationsWithCounts() {
  const members = db
    .select({ organizationId: member.organizationId, members: count().as("members") })
    .from(member)
    .groupBy(member.organizationId)
    .as("members");
  const cars = db
    .select({ organizationId: car.organizationId, cars: count().as("cars") })
    .from(car)
    .groupBy(car.organizationId)
    .as("cars");
  return db
    .select({
      id: organization.id,
      name: organization.name,
      status: organization.status,
      createdAt: organization.createdAt,
      members: sql<number>`coalesce(${members.members}, 0)`.mapWith(Number),
      cars: sql<number>`coalesce(${cars.cars}, 0)`.mapWith(Number),
    })
    .from(organization)
    .leftJoin(members, eq(members.organizationId, organization.id))
    .leftJoin(cars, eq(cars.organizationId, organization.id))
    .orderBy(asc(organization.name));
}

export async function findOrganization(id: string) {
  return db.query.organization.findFirst({ where: eq(organization.id, id) });
}

export async function listAdmins(organizationId: string) {
  return db
    .select({ userId: user.id, name: user.name, email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.organizationId, organizationId), eq(member.role, "admin")))
    .orderBy(asc(user.name));
}

export async function listInvitations(organizationId: string) {
  return db.query.invitation.findMany({
    where: eq(invitation.organizationId, organizationId),
    orderBy: [desc(invitation.createdAt)],
  });
}

export async function findInvitationWithOrganization(id: string) {
  if (typeof id !== "string" || id.length > 64) return undefined;
  const [row] = await db
    .select({ invitation, organization })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(eq(invitation.id, id));
  return row;
}

export async function createInvitation({
  organizationId,
  inviterId,
  name,
  email,
  role,
}: {
  organizationId: string;
  inviterId: string;
  name: string;
  email: string;
  role: Role;
}) {
  const [created] = await db
    .insert(invitation)
    .values({
      // The id is the secret in the link, so it must be unguessable.
      id: randomBytes(24).toString("base64url"),
      organizationId,
      inviterId,
      name,
      email: normalizeEmail(email),
      role,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    })
    .returning();
  return created;
}

export async function createOrganizationWithAdminInvitation({
  name,
  adminName,
  adminEmail,
  operatorId,
}: {
  name: string;
  adminName: string;
  adminEmail: string;
  operatorId: string;
}) {
  const id = randomUUID();
  await db.insert(organization).values({ id, name, slug: slugify(name) });
  await ensureBuiltInTypes(id);
  const created = await createInvitation({
    organizationId: id,
    inviterId: operatorId,
    name: adminName,
    email: adminEmail,
    role: "admin",
  });
  return { organizationId: id, invitation: created };
}

export async function cancelInvitation(organizationId: string, invitationId: string) {
  const [canceled] = await db
    .update(invitation)
    .set({ status: "canceled" })
    .where(
      and(
        eq(invitation.id, invitationId),
        eq(invitation.organizationId, organizationId),
        eq(invitation.status, "pending"),
      ),
    )
    .returning();
  return canceled;
}

// Replaces a pending or expired invitation with a fresh link for the same
// person and role; the old link stops working.
export async function reissueInvitation(organizationId: string, invitationId: string, inviterId: string) {
  const existing = await db.query.invitation.findFirst({
    where: and(eq(invitation.id, invitationId), eq(invitation.organizationId, organizationId)),
  });
  if (!existing || existing.status !== "pending") return undefined;
  await cancelInvitation(organizationId, invitationId);
  return createInvitation({
    organizationId,
    inviterId,
    name: existing.name,
    email: existing.email,
    role: existing.role,
  });
}

export async function addMember(organizationId: string, userId: string, role: Role) {
  await db.insert(member).values({ id: randomUUID(), organizationId, userId, role });
}

export async function markInvitationAccepted(invitationId: string) {
  await db.update(invitation).set({ status: "accepted" }).where(eq(invitation.id, invitationId));
}

export type InviteBlocker = "member" | "operator";

// Why an email can't be invited, if it can't: every person belongs to exactly
// one organization, and operators never belong to any.
export async function invitationBlocker(email: string): Promise<InviteBlocker | null> {
  const existing = await findUserByEmail(email);
  if (!existing) return null;
  if (existing.isOperator) return "operator";
  const membership = await db.query.member.findFirst({ where: eq(member.userId, existing.id) });
  return membership ? "member" : null;
}

export async function hasOpenInvitation(organizationId: string, email: string) {
  const rows = await db.query.invitation.findMany({
    where: and(
      eq(invitation.organizationId, organizationId),
      eq(invitation.email, normalizeEmail(email)),
      eq(invitation.status, "pending"),
    ),
  });
  return rows.some((row) => invitationState(row) === "pending");
}

export async function listMembers(organizationId: string) {
  return db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: member.role,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, organizationId))
    .orderBy(asc(user.name));
}

export async function findMember(organizationId: string, userId: string) {
  if (typeof userId !== "string" || userId.length > 64) return undefined;
  return db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
  });
}

export type MemberChangeResult = "ok" | "notFound" | "lastAdmin";

// Changes a member's role, refusing to leave the organization without an admin.
// Runs in a transaction that locks the organization's admin rows so two
// admins demoting each other at once can't both succeed.
export async function changeMemberRole(
  organizationId: string,
  userId: string,
  role: Role,
): Promise<MemberChangeResult> {
  return db.transaction(async (tx) => {
    const admins = await tx
      .select({ userId: member.userId })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.role, "admin")))
      .for("update");
    const target = await tx.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    });
    if (!target) return "notFound";
    if (target.role === "admin" && role !== "admin" && admins.length <= 1) return "lastAdmin";
    await tx.update(member).set({ role }).where(eq(member.id, target.id));
    return "ok";
  });
}

export async function removeMember(organizationId: string, userId: string): Promise<MemberChangeResult> {
  return db.transaction(async (tx) => {
    const admins = await tx
      .select({ userId: member.userId })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.role, "admin")))
      .for("update");
    const target = await tx.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    });
    if (!target) return "notFound";
    if (target.role === "admin" && admins.length <= 1) return "lastAdmin";
    await tx.delete(member).where(eq(member.id, target.id));
    await tx.delete(session).where(eq(session.userId, userId));
    return "ok";
  });
}

export async function renameOrganization(organizationId: string, name: string) {
  await db.update(organization).set({ name }).where(eq(organization.id, organizationId));
}

export async function setOrganizationStatus(organizationId: string, status: "active" | "deactivated") {
  await db.update(organization).set({ status }).where(eq(organization.id, organizationId));
}

// Erases an organization: its cars, entries, invitations and memberships go
// with it (cascades), and so do its members' accounts, since each person
// belongs to this one organization only. Returns the deleted cars' ids so
// their files can be removed.
export async function deleteOrganization(organizationId: string) {
  return db.transaction(async (tx) => {
    const cars = await tx.select({ id: car.id }).from(car).where(eq(car.organizationId, organizationId));
    const members = await tx
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, organizationId));
    await tx.delete(organization).where(eq(organization.id, organizationId));
    for (const { userId } of members) {
      await tx.delete(user).where(and(eq(user.id, userId), eq(user.isOperator, false)));
    }
    return cars.map((c) => c.id);
  });
}
