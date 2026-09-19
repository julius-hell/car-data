import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">You are offline</h1>
      <p className="text-muted-foreground">
        Car Data needs a connection to load your readings. Try again once you
        are back online.
      </p>
    </main>
  );
}
