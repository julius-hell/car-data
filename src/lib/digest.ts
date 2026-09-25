import { and, eq } from "drizzle-orm";
import type { Actor } from "@/lib/actor";
import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { member, organization, user } from "@/lib/db/schema";
import { collectDueItems, dueItemLink, type DueItem } from "@/lib/due-items";
import { intervalTypeName } from "@/lib/interval-names";
import { isEmailEnabled, sendMail, type Mail } from "@/lib/mail";
import { translatorsFor } from "@/lib/translators";

type Recipient = Actor & { locale: string | null };

// Admins who get the digest: verified email, opted in, active organization.
async function recipients(): Promise<Recipient[]> {
  const rows = await db
    .select({ user, member, organization })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(
      and(
        eq(member.role, "admin"),
        eq(organization.status, "active"),
        eq(user.emailVerified, true),
        eq(user.digestOptIn, true),
      ),
    );
  return rows.map((row) => ({
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: row.member.role,
    organizationId: row.organization.id,
    organizationName: row.organization.name,
    organizationStatus: row.organization.status,
    locale: row.user.locale,
  }));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export async function composeDigest(recipient: Recipient, items: DueItem[]): Promise<Mail> {
  const t = await translatorsFor(recipient.locale);
  const dates = new Intl.DateTimeFormat(t.locale, { dateStyle: "medium", timeZone: "UTC" });
  const months = new Intl.DateTimeFormat(t.locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const when = (item: DueItem) => {
    if (item.kind === "damage") return t.dashboard("reportedOn", { date: dates.format(new Date(`${item.date}T00:00:00Z`)) });
    if (item.kind === "allowance") return t.dashboard("projectedOver", { km: item.km ?? 0 });
    if (!item.date) return t.dashboard("noDueDate");
    const date = (item.precision === "month" ? months : dates).format(new Date(`${item.date}T00:00:00Z`));
    return item.kind === "contractEnd" ? t.dashboard("endsOn", { date }) : t.dashboard("dueOn", { date });
  };
  const lines = items.map((item) => ({
    level: t.due(`level.${item.level}`),
    title: item.intervalType ? intervalTypeName(item.intervalType, t.intervals) : t.dashboard(`kinds.${item.kind}`),
    subject: item.car?.licencePlate ?? item.person?.name ?? "",
    when: when(item),
    url: appUrl(dueItemLink(item, recipient)),
  }));
  const subject = t.email("digestSubject", { count: items.length, organization: recipient.organizationName });
  const intro = t.email("digestIntro", { organization: recipient.organizationName });
  const footer = t.email("digestFooter");
  const text = [
    t.email("greeting", { name: recipient.name }),
    intro,
    ...lines.map((l) => `• ${l.level}: ${l.title} · ${l.subject} · ${l.when}\n  ${l.url}`),
    `${t.email("digestAction")}: ${appUrl("/dashboard")}`,
    footer,
  ].join("\n\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1c1917;max-width:600px;margin:0 auto;padding:24px">
<p>${escapeHtml(t.email("greeting", { name: recipient.name }))}</p>
<p>${escapeHtml(intro)}</p>
<ul style="padding-left:18px">${lines
    .map(
      (l) =>
        `<li style="margin-bottom:8px"><strong>${escapeHtml(l.level)}</strong>: <a href="${escapeHtml(l.url)}">${escapeHtml(l.title)} · ${escapeHtml(l.subject)}</a> · ${escapeHtml(l.when)}</li>`,
    )
    .join("")}</ul>
<p><a href="${escapeHtml(appUrl("/dashboard"))}" style="display:inline-block;background:#2a78d6;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escapeHtml(t.email("digestAction"))}</a></p>
<p style="font-size:12px;color:#78716c">${escapeHtml(footer)}</p>
</body></html>`;
  return { to: recipient.email, subject, text, html };
}

// Sends each admin their organization's overdue and due-soon items; admins
// with nothing to report get no email. Returns how many were sent.
export async function sendDigests() {
  if (!isEmailEnabled()) return 0;
  let sent = 0;
  for (const recipient of await recipients()) {
    const items = (await collectDueItems(recipient)).filter((i) => i.level === "overdue" || i.level === "soon");
    if (items.length === 0) continue;
    await sendMail(await composeDigest(recipient, items));
    sent += 1;
  }
  return sent;
}
