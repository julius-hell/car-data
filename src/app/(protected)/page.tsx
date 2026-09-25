import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { requireSession } from "@/lib/session";

// The app root only decides where each person lands.
export default async function Home() {
  const { user } = await requireSession();
  if (user.isOperator) redirect("/operator");
  const actor = await getActor();
  if (!actor) redirect("/no-organization");
  redirect(actor.role === "driver" ? "/my-cars" : "/cars");
}
