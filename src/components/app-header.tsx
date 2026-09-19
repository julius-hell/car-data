"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
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
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          Car Data
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-muted-foreground min-w-0 truncate text-sm">{userName}</span>
          <Button
            type="button"
            variant="outline"
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
