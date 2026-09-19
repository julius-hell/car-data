"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AppHeader({ userName }: { userName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Car Data
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground truncate text-sm">{userName}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={signOut}
            disabled={pending}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
