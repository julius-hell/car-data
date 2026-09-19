import { redirect } from "next/navigation";
import { getDefaultCarId } from "@/lib/cars";
import { requireSession } from "@/lib/session";

export default async function Home() {
  const { user } = await requireSession();
  const defaultCarId = await getDefaultCarId(user.id);
  redirect(defaultCarId ? `/cars/${defaultCarId}` : "/cars");
}
