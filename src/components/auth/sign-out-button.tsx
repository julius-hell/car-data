"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const t = useTranslations("Header");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push(redirectTo);
        router.refresh();
      }}
    >
      {t("signOut")}
    </Button>
  );
}
