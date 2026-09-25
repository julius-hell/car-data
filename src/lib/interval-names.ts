import type { IntervalType } from "@/lib/db/schema";

type Translate = (key: string) => string;

// Built-in types are named by the translations, custom ones by their admins.
export function intervalTypeName(type: { builtIn: IntervalType["builtIn"] | string | null; name: string | null }, t: Translate) {
  return type.builtIn ? t(`types.${type.builtIn}`) : (type.name ?? "");
}
