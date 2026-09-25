import { expect } from "@playwright/test";

type MailpitSummary = { ID: string; Subject: string; To: { Address: string }[] };
export type ReceivedMail = { subject: string; text: string; html: string };

const mailpit = () => process.env.MAILPIT_URL ?? "http://localhost:8025";

async function search(to: string, subject?: string) {
  const query = `to:"${to}"${subject ? ` subject:"${subject}"` : ""}`;
  const response = await fetch(`${mailpit()}/api/v1/search?query=${encodeURIComponent(query)}`);
  const body = (await response.json()) as { messages: MailpitSummary[] };
  return body.messages;
}

// Waits for an email to `to` (optionally with a subject containing `subject`)
// and returns the newest one. Recipients are unique per test, so parallel
// tests never see each other's mail.
export async function waitForEmail(to: string, { subject }: { subject?: string } = {}) {
  let found: MailpitSummary | undefined;
  await expect
    .poll(
      async () => {
        found = (await search(to, subject))[0];
        return Boolean(found);
      },
      { timeout: 15_000, message: `no email to ${to}${subject ? ` about "${subject}"` : ""}` },
    )
    .toBe(true);
  const response = await fetch(`${mailpit()}/api/v1/message/${found!.ID}`);
  const message = (await response.json()) as { Subject: string; Text: string; HTML: string };
  return { subject: message.Subject, text: message.Text, html: message.HTML } satisfies ReceivedMail;
}

export async function countEmails(to: string, subject?: string) {
  return (await search(to, subject)).length;
}

// The first link in the plain-text body that points at the app.
export function linkIn(mail: ReceivedMail) {
  const match = mail.text.match(/https?:\/\/\S+/);
  if (!match) throw new Error(`no link in "${mail.subject}"`);
  return match[0];
}
