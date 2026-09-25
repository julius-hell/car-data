import { redirect } from "next/navigation";
import { getMembership } from "@/lib/actor";
import { currentCarsOf } from "@/lib/assignments";
import { requireSession } from "@/lib/session";

// The app root only decides where each person lands.
export default async function Home() {
  const { user } = await requireSession();
  if (user.isOperator) redirect("/operator");
  const actor = await getMembership();
  if (!actor) redirect("/no-organization");
  if (actor.organizationStatus !== "active") redirect("/deactivated");
  if (actor.role !== "driver") redirect("/dashboard");
  // Drivers with exactly one car go straight to it.
  const cars = await currentCarsOf(actor.userId);
  redirect(cars.length === 1 ? `/cars/${cars[0].car.id}` : "/my-cars");
}
