import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { getMembership } from "@/lib/actor";
import { isEmailEnabled } from "@/lib/mail";
import { setDigestOptIn } from "./actions";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const { user } = await requireSession();
  const [t, membership] = await Promise.all([getTranslations("Settings"), getMembership()]);
  // The digest is for admins, and only exists where email can be sent.
  const showDigest = membership?.role === "admin" && isEmailEnabled();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground text-sm">
          {user.name} · {user.email}
        </p>
      </div>
      <section className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-5">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("language")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("languageDescription")}</p>
        <div>
          <LocaleSwitcher />
        </div>
      </section>
      {showDigest && (
        <section className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-5" data-testid="digest-setting">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("digest")}</h2>
          <p className="text-sm" data-testid="digest-state">
            {user.digestOptIn ? t("digestOn") : t("digestOff")}
          </p>
          {!user.emailVerified && <p className="text-muted-foreground text-sm">{t("digestNeedsVerification")}</p>}
          <form action={setDigestOptIn.bind(null, !user.digestOptIn)}>
            <Button type="submit" variant="outline" size="sm">
              {user.digestOptIn ? t("digestTurnOff") : t("digestTurnOn")}
            </Button>
          </form>
        </section>
      )}
      <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("password")}
        </h2>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
