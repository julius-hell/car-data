import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { member, organization } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

// The single place that decides who may see and do what. Everything that
// reads or writes organization data starts from an actor, so every query is
// scoped to the actor's organization.

import type { Role } from "@/lib/roles";

export { isRole, ROLES, type Role } from "@/lib/roles";

export type Actor = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  organizationName: string;
  organizationStatus: "active" | "deactivated";
};

export type Permission =
  | "viewFleet"
  | "manageFleet"
  | "addEntry"
  | "deleteEntry"
  | "manageMembers"
  | "manageOrganization";

const GRANTS: Record<Role, readonly Permission[]> = {
  admin: ["viewFleet", "manageFleet", "addEntry", "deleteEntry", "manageMembers", "manageOrganization"],
  viewer: ["viewFleet"],
  driver: [],
};

export function can(actor: Actor, permission: Permission) {
  return GRANTS[actor.role].includes(permission);
}

// Server actions call this; the UI never offers the action to someone who
// lacks the permission, so reaching it means a crafted request.
export function assertCan(actor: Actor, permission: Permission) {
  if (!can(actor, permission)) throw new Error("Not allowed.");
}

// The signed-in user's membership, whatever the organization's status.
export const getMembership = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  if (!session) return null;
  const [row] = await db
    .select({ member, organization })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, session.user.id));
  if (!row) return null;
  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: row.member.role,
    organizationId: row.organization.id,
    organizationName: row.organization.name,
    organizationStatus: row.organization.status,
  };
});

// The actor for anything that touches organization data: members of a
// deactivated organization get nothing.
export const getActor = cache(async (): Promise<Actor | null> => {
  const membership = await getMembership();
  return membership?.organizationStatus === "active" ? membership : null;
});

// For pages inside an organization. Signed-out visitors go to sign-in,
// operators see nothing of any organization, and users without a
// membership get a page explaining why.
export async function requireActor(): Promise<Actor> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.isOperator) notFound();
  const membership = await getMembership();
  if (!membership) redirect("/no-organization");
  if (membership.organizationStatus !== "active") redirect("/deactivated");
  return membership;
}

export async function requirePermission(permission: Permission): Promise<Actor> {
  const actor = await requireActor();
  if (!can(actor, permission)) notFound();
  return actor;
}

export async function requireOperator() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.isOperator) notFound();
  return session.user;
}
