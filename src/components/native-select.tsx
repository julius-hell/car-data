import { cn } from "@/lib/utils";

// A plain <select> styled like the other inputs; native so it works well on phones.
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
