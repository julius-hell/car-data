import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  unit,
  detail,
  className,
  testId,
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn("bg-card flex flex-col gap-1 rounded-xl border p-4 shadow-xs", className)}
    >
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</p>
      <p className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
      </p>
      <p className="text-muted-foreground text-sm">{detail}</p>
    </div>
  );
}
