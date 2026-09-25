import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { findUserByEmail, normalizeEmail } from "@/lib/accounts";
import { db } from "@/lib/db";
import { car, invitation, member, organization, user } from "@/lib/db/schema";
import type { Role } from "@/lib/actor";

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

// Whether an email may be invited: every person belongs to exactly one
// organization, so an address that already has a membership is refused.
export async function emailHasMembership(email: string) {
  const existing = await findUserByEmail(email);
  if (!existing) return false;
  const membership = await db.query.member.findFirst({ where: eq(member.userId, existing.id) });
  return Boolean(membership);
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
