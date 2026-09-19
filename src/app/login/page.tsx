import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasskeyAuthForm } from "@/components/passkey-auth-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Car Data</h1>
        <p className="text-muted-foreground">
          Track the mileage of your cars over time.
        </p>
      </div>
      <PasskeyAuthForm />
    </main>
  );
}
