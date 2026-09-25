import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignment, car, member, user } from "@/lib/db/schema";
import { addDaysIso, todayIso } from "@/lib/today";

export function currentOn(day: string) {
  return and(lte(assignment.startsOn, day), or(isNull(assignment.endsOn), gte(assignment.endsOn, day)));
}

export async function hasCurrentAssignment(userId: string, carId: string, day = todayIso()) {
  const row = await db.query.assignment.findFirst({
    where: and(eq(assignment.userId, userId), eq(assignment.carId, carId), currentOn(day)),
    columns: { id: true },
  });
  return Boolean(row);
}

// The active cars a person drives today, for their landing page.
export async function currentCarsOf(userId: string, day = todayIso()) {
  return db
    .select({ car, assignment })
    .from(assignment)
    .innerJoin(car, eq(car.id, assignment.carId))
    .where(and(eq(assignment.userId, userId), currentOn(day), isNull(car.retiredOn)))
    .orderBy(asc(car.licencePlate));
}

export async function listCarAssignments(carId: string) {
  return db
    .select({
      id: assignment.id,
      userId: assignment.userId,
      name: user.name,
      startsOn: assignment.startsOn,
      endsOn: assignment.endsOn,
    })
    .from(assignment)
    .innerJoin(user, eq(user.id, assignment.userId))
    .where(eq(assignment.carId, carId))
    .orderBy(desc(assignment.startsOn), desc(assignment.createdAt));
}

export async function listMemberAssignments(organizationId: string, userId: string) {
  return db
    .select({
      id: assignment.id,
      carId: car.id,
      licencePlate: car.licencePlate,
      startsOn: assignment.startsOn,
      endsOn: assignment.endsOn,
    })
    .from(assignment)
    .innerJoin(car, eq(car.id, assignment.carId))
    .where(and(eq(assignment.userId, userId), eq(car.organizationId, organizationId)))
    .orderBy(desc(assignment.startsOn), desc(assignment.createdAt));
}

// Current drivers per car (names), for the fleet list.
export async function currentDriversByCar(carIds: string[], day = todayIso()) {
  if (carIds.length === 0) return new Map<string, string[]>();
  const rows = await db
    .select({ carId: assignment.carId, name: user.name })
    .from(assignment)
    .innerJoin(user, eq(user.id, assignment.userId))
    .where(and(inArray(assignment.carId, carIds), currentOn(day)))
    .orderBy(asc(user.name));
  const byCar = new Map<string, string[]>();
  for (const row of rows) byCar.set(row.carId, [...(byCar.get(row.carId) ?? []), row.name]);
  return byCar;
}

// Current car plates per member, for the team page.
export async function currentPlatesByUser(organizationId: string, day = todayIso()) {
  const rows = await db
    .select({ userId: assignment.userId, plate: car.licencePlate })
    .from(assignment)
    .innerJoin(car, eq(car.id, assignment.carId))
    .where(and(eq(car.organizationId, organizationId), currentOn(day)))
    .orderBy(asc(car.licencePlate));
  const byUser = new Map<string, string[]>();
  for (const row of rows) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row.plate]);
  return byUser;
}

// Admins and drivers of the organization; viewers can't be assigned.
export async function listAssignableMembers(organizationId: string) {
  return db
    .select({ userId: user.id, name: user.name, role: member.role })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.organizationId, organizationId), inArray(member.role, ["admin", "driver"])))
    .orderBy(asc(user.name));
}

export type AssignResult = "ok" | "notAssignable" | "overlap";

export async function assign(
  organizationId: string,
  carId: string,
  userId: string,
  startsOn: string,
  endsOn: string | null,
): Promise<AssignResult> {
  const assignee = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
  });
  if (!assignee || assignee.role === "viewer") return "notAssignable";
  // One open-ended or overlapping period per person and car keeps the history readable.
  const overlapping = await db.query.assignment.findFirst({
    where: and(
      eq(assignment.carId, carId),
      eq(assignment.userId, userId),
      or(isNull(assignment.endsOn), gte(assignment.endsOn, startsOn)),
      endsOn ? lte(assignment.startsOn, endsOn) : undefined,
    ),
  });
  if (overlapping) return "overlap";
  await db.insert(assignment).values({ carId, userId, startsOn, endsOn });
  return "ok";
}

export async function endAssignment(carId: string, assignmentId: string, endsOn: string) {
  const existing = await db.query.assignment.findFirst({
    where: and(eq(assignment.id, assignmentId), eq(assignment.carId, carId)),
  });
  if (!existing) return "notFound" as const;
  if (endsOn < existing.startsOn) return "beforeStart" as const;
  await db.update(assignment).set({ endsOn }).where(eq(assignment.id, existing.id));
  return "ok" as const;
}

// When someone leaves the organization: assignments that already began end
// yesterday, ones that hadn't started yet are dropped.
export async function endAssignmentsOf(organizationId: string, userId: string, day = todayIso()) {
  const cars = db.select({ id: car.id }).from(car).where(eq(car.organizationId, organizationId));
  const yesterday = addDaysIso(day, -1);
  await db
    .delete(assignment)
    .where(and(eq(assignment.userId, userId), inArray(assignment.carId, cars), gte(assignment.startsOn, day)));
  await db
    .update(assignment)
    .set({ endsOn: yesterday })
    .where(
      and(
        eq(assignment.userId, userId),
        inArray(assignment.carId, cars),
        or(isNull(assignment.endsOn), gte(assignment.endsOn, day)),
      ),
    );
}
