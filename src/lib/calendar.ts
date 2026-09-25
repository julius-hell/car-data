import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Actor } from "@/lib/actor";
import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { member, organization, user } from "@/lib/db/schema";
import { monthStart } from "@/lib/due";
import { collectDueItems, dueItemLink, type DueItem } from "@/lib/due-items";
import { intervalTypeName } from "@/lib/interval-names";
import { addDaysIso } from "@/lib/today";
import { translatorsFor } from "@/lib/translators";

export function newCalendarToken() {
  return randomBytes(24).toString("base64url");
}

export async function ensureCalendarToken(userId: string) {
  const row = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { calendarToken: true } });
  if (row?.calendarToken) return row.calendarToken;
  const token = newCalendarToken();
  await db.update(user).set({ calendarToken: token }).where(eq(user.id, userId));
  return token;
}

export async function regenerateCalendarToken(userId: string) {
  await db.update(user).set({ calendarToken: newCalendarToken() }).where(eq(user.id, userId));
}

export function calendarPath(token: string) {
  return `/calendar/${token}`;
}

// The member behind a feed token, if they still belong to an active organization.
async function actorForToken(token: string): Promise<(Actor & { locale: string | null }) | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = await db
    .select({ user, member, organization })
    .from(user)
    .innerJoin(member, eq(member.userId, user.id))
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(user.calendarToken, token), eq(organization.status, "active")));
  if (!row) return null;
  return {
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: row.member.role,
    organizationId: row.organization.id,
    organizationName: row.organization.name,
    organizationStatus: row.organization.status,
    locale: row.user.locale,
  };
}

// iCalendar text: escape specials and fold long lines at 75 octets.
function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compact = (iso: string) => iso.replaceAll("-", "");

// Due dates only: money, licence details and damage stay out of calendars.
const FEED_KINDS = new Set<DueItem["kind"]>(["carInterval", "driverCheck", "contractEnd"]);

export async function calendarFeed(token: string) {
  const actor = await actorForToken(token);
  if (!actor) return null;
  const [items, t] = await Promise.all([collectDueItems(actor, { includeOk: true }), translatorsFor(actor.locale)]);
  const months = new Intl.DateTimeFormat(t.locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;

  const events = items
    .filter((item) => FEED_KINDS.has(item.kind) && item.date)
    .map((item) => {
      const name = item.intervalType ? intervalTypeName(item.intervalType, t.intervals) : t.calendar("contractEnd");
      const subject = item.car?.licencePlate ?? item.person?.name ?? "";
      const month = item.precision === "month";
      const start = month ? monthStart(item.date!) : item.date!;
      const summary = month
        ? t.calendar("dueInMonth", { name, month: months.format(new Date(`${start}T00:00:00Z`)), subject })
        : t.calendar("event", { name, subject });
      return [
        "BEGIN:VEVENT",
        `UID:${item.id.replace(":", "-")}@car-data`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compact(start)}`,
        `DTEND;VALUE=DATE:${compact(addDaysIso(start, 1))}`,
        `SUMMARY:${escapeText(summary)}`,
        `URL:${appUrl(dueItemLink(item, actor))}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ];
    });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Car Data//Fleet//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(t.calendar("name", { organization: actor.organizationName }))}`,
    ...events.flat(),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
