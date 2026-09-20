import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand";
import { PasskeyAuthForm } from "@/components/passkey-auth-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-10 overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="bg-primary/10 pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark className="size-14" />
        <div>
          <h1 className="text-3xl">
            <Wordmark />
          </h1>
          <p className="text-muted-foreground mt-1">
            Every reading on your odometer, kept for good.
          </p>
        </div>
      </div>
      <PasskeyAuthForm />
      <p className="text-muted-foreground max-w-xs text-center text-xs">
        No passwords. Your passkey stays on your device and is the only thing
        that can open this account.
      </p>
    </main>
  );
}
