import { createTranslator } from "next-intl";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import type { Mail } from "@/lib/mail";

async function translator(locale: string | null | undefined) {
  const resolved: Locale = isLocale(locale) ? locale : defaultLocale;
  const messages = (await import(`../../messages/${resolved}.json`)).default;
  return createTranslator({ locale: resolved, messages, namespace: "Email" });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Every email is a greeting, a few paragraphs, one button and a footer; the
// plain-text part carries the same content with the link spelled out.
function layout({
  to,
  subject,
  paragraphs,
  action,
  footer,
}: {
  to: string;
  subject: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footer: string;
}): Mail {
  const text = [...paragraphs, ...(action ? [`${action.label}: ${action.url}`] : []), "", footer].join("\n\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1c1917;max-width:560px;margin:0 auto;padding:24px">
${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
${action ? `<p><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#2a78d6;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${escapeHtml(action.label)}</a></p><p style="font-size:12px;color:#78716c">${escapeHtml(action.url)}</p>` : ""}
<p style="font-size:12px;color:#78716c">${escapeHtml(footer)}</p>
</body></html>`;
  return { to, subject, text, html };
}

export async function invitationEmail({
  to,
  name,
  organization,
  role,
  url,
  locale,
}: {
  to: string;
  name: string;
  organization: string;
  role: string;
  url: string;
  locale?: string | null;
}) {
  const t = await translator(locale);
  const roleLabel = t(`role.${role}`);
  return layout({
    to,
    subject: t("invitationSubject", { organization }),
    paragraphs: [t("greeting", { name }), t("invitationBody", { organization, role: roleLabel })],
    action: { label: t("invitationAction"), url },
    footer: t("invitationFooter"),
  });
}

export async function resetPasswordEmail({ to, name, url, locale }: { to: string; name: string; url: string; locale?: string | null }) {
  const t = await translator(locale);
  return layout({
    to,
    subject: t("resetSubject"),
    paragraphs: [t("greeting", { name }), t("resetBody")],
    action: { label: t("resetAction"), url },
    footer: t("resetFooter"),
  });
}

export async function verifyEmail({ to, name, url, locale }: { to: string; name: string; url: string; locale?: string | null }) {
  const t = await translator(locale);
  return layout({
    to,
    subject: t("verifySubject"),
    paragraphs: [t("greeting", { name }), t("verifyBody")],
    action: { label: t("verifyAction"), url },
    footer: t("verifyFooter"),
  });
}
