"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { BrandMark, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

// The service worker keeps visited pages for offline use; drop them so a
// shared device shows nothing of this account after sign-out.
async function clearOfflineCaches() {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export function AppHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    await clearOfflineCaches();
    router.push("/login");
  }

  return (
    <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <BrandMark />
          <Wordmark className="text-lg" />
        </Link>
        <div className="flex min-w-0 items-center gap-1">
          <span className="text-muted-foreground min-w-0 truncate px-2 text-sm">{userName}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={signOut}
            disabled={pending}
            className="shrink-0"
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
