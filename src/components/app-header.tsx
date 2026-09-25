"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { BrandMark, Wordmark } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/roles";

export type HeaderContext =
  | { kind: "operator" }
  | { kind: "member"; organizationName: string; role: Role }
  | null;

function navItems(context: HeaderContext) {
  if (!context) return [];
  if (context.kind === "operator") return [{ href: "/operator", key: "organizations" }] as const;
  switch (context.role) {
    case "admin":
      return [
        { href: "/cars", key: "cars" },
        { href: "/damage", key: "damage" },
        { href: "/team", key: "team" },
        { href: "/interval-types", key: "intervalTypes" },
      ] as const;
    case "viewer":
      return [
        { href: "/cars", key: "cars" },
        { href: "/damage", key: "damage" },
      ] as const;
    case "driver":
      return [{ href: "/my-cars", key: "myCars" }] as const;
  }
}

export function AppHeader({ userName, context }: { userName: string; context: HeaderContext }) {
  const t = useTranslations("Header");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <BrandMark />
            <Wordmark className="hidden text-lg sm:inline" />
          </Link>
          {context && (
            <span
              data-testid="header-context"
              className="bg-muted text-muted-foreground min-w-0 truncate rounded-md px-2 py-0.5 text-xs font-medium"
            >
              {context.kind === "operator" ? t("operator") : context.organizationName}
            </span>
          )}
          <nav aria-label={t("navigation")} className="flex items-center gap-1">
            {navItems(context).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm transition-colors"
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground min-w-0 truncate text-sm transition-colors"
            aria-label={t("settingsLabel", { name: userName })}
          >
            {userName}
          </Link>
          <LocaleSwitcher />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={signOut}
            disabled={pending}
            className="shrink-0"
          >
            {t("signOut")}
          </Button>
        </div>
      </div>
    </header>
  );
}
