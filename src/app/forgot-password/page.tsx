import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isEmailEnabled } from "@/lib/mail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("forgotTitle") };
}

export default async function ForgotPasswordPage() {
  if (!isEmailEnabled()) notFound();
  const t = await getTranslations("Auth");

  return (
    <AuthShell>
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader>
          <CardTitle>{t("forgotTitle")}</CardTitle>
          <CardDescription>{t("forgotDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ForgotPasswordForm />
          <Link href="/login" className="text-primary text-center text-sm underline-offset-4 hover:underline">
            {t("backToSignIn")}
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
