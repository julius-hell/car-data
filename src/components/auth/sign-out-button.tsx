import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function SignOutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const t = await getTranslations("Header");
  return (
    <form action="/sign-out" method="post">
      <input type="hidden" name="next" value={redirectTo} />
      <Button type="submit" variant="outline">
        {t("signOut")}
      </Button>
    </form>
  );
}
