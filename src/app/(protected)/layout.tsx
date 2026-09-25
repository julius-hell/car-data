import { AppHeader } from "@/components/app-header";
import { getActor } from "@/lib/actor";
import { requireSession } from "@/lib/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();
  const actor = user.isOperator ? null : await getActor();

  return (
    <>
      <AppHeader
        userName={user.name}
        context={user.isOperator ? { kind: "operator" } : actor ? { kind: "member", organizationName: actor.organizationName } : null}
      />
      {children}
    </>
  );
}
