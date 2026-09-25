import { redirect } from "next/navigation";
import { getMembership } from "@/lib/actor";
import { requireSession } from "@/lib/session";

// The app root only decides where each person lands.
export default async function Home() {
  const { user } = await requireSession();
  if (user.isOperator) redirect("/operator");
  const actor = await getMembership();
  if (!actor) redirect("/no-organization");
  if (actor.organizationStatus !== "active") redirect("/deactivated");
  redirect(actor.role === "driver" ? "/my-cars" : "/cars");
}
