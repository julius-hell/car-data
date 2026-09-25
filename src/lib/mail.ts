import nodemailer, { type Transporter } from "nodemailer";

// Email is optional per deployment: it is on when an SMTP host and a sender
// address are configured. Without it, nothing is sent and the app falls back
// to links that admins copy and hand over.
export function isEmailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

let transporter: Transporter | null = null;

function transport() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
      : undefined,
  });
  return transporter;
}

export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail) {
  if (!isEmailEnabled()) return false;
  await transport().sendMail({ from: process.env.SMTP_FROM, ...mail });
  return true;
}
