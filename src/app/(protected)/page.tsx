import { requireSession } from "@/lib/session";

export default async function Home() {
  const { user } = await requireSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Signed in as {user.name}
      </h1>
      <p className="text-muted-foreground">Your cars will show up here.</p>
    </main>
  );
}
