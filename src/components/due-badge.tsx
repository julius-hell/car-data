import { getTranslations } from "next-intl/server";
import type { DueLevel } from "@/lib/due";
import { cn } from "@/lib/utils";

const STYLES: Record<DueLevel, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  soon: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  overdue: "bg-destructive/15 text-destructive",
  missing: "bg-muted text-muted-foreground",
};

export async function DueBadge({ level, testId, className }: { level: DueLevel; testId?: string; className?: string }) {
  const t = await getTranslations("Due");
  return (
    <span
      data-testid={testId}
      data-level={level}
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap uppercase",
        STYLES[level],
        className,
      )}
    >
      {t(`level.${level}`)}
    </span>
  );
}
