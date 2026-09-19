import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();

  return (
    <>
      <AppHeader userName={user.name} />
      {children}
    </>
  );
}
