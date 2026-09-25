import { AppHeader } from "@/components/app-header";
import { getMembership } from "@/lib/actor";
import { requireSession } from "@/lib/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireSession();
  const membership = user.isOperator ? null : await getMembership();
  const actor = membership?.organizationStatus === "active" ? membership : null;

  return (
    <>
      <AppHeader
        userName={user.name}
        context={user.isOperator ? { kind: "operator" } : actor ? { kind: "member", organizationName: actor.organizationName, role: actor.role } : null}
      />
      {children}
    </>
  );
}
