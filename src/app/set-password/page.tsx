import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("setPasswordTitle") };
}

export default async function SetPasswordPage(props: PageProps<"/set-password">) {
  const token = (await props.searchParams).token;
  const t = await getTranslations("Auth");

  return (
    <AuthShell>
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader>
          <CardTitle>{t("setPasswordTitle")}</CardTitle>
          <CardDescription>{t("setPasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {typeof token === "string" && token ? (
            <SetPasswordForm token={token} />
          ) : (
            <p className="text-destructive text-sm">{t("errorInvalidLink")}</p>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
