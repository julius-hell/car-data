import { redirect } from "next/navigation";
import { getDefaultCarId } from "@/lib/cars";
import { getSession } from "@/lib/session";

// Target of the PWA "Log reading" shortcut: straight into the default car's
// reading form, or the car list when there is no default yet.
export default async function LogPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/log");
  const defaultCarId = await getDefaultCarId(session.user.id);
  redirect(defaultCarId ? `/cars/${defaultCarId}?log=1` : "/cars");
}
