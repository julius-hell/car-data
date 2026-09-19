import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="text-muted-foreground">
        There is nothing at this address.
      </p>
      <Link href="/" className="underline underline-offset-4">
        Back to your cars
      </Link>
    </main>
  );
}
