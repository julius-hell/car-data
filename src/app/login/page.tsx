import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { FormMessage } from "@/components/form-message";
import { safeNextPath } from "@/lib/next-path";
import { getSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("title") };
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = safeNextPath(searchParams.next) ?? "/";
  if (await getSession()) redirect(next);
  const t = await getTranslations("Auth");

  return (
    <AuthShell>
      <div className="flex w-full max-w-sm flex-col gap-3">
        {searchParams.passwordSet === "1" && (
          <FormMessage kind="success" testId="login-notice">
            {t("passwordSetNotice")}
          </FormMessage>
        )}
        <SignInForm next={next} />
      </div>
    </AuthShell>
  );
}
