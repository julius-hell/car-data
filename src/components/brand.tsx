import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden
      className={cn("size-7 shrink-0 rounded-[22%] bg-primary text-primary-foreground", className)}
    >
      <polyline
        points="96,352 192,296 288,240 416,160"
        fill="none"
        stroke="currentColor"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="96" cy="352" r="30" fill="currentColor" />
      <circle cx="192" cy="296" r="30" fill="currentColor" />
      <circle cx="288" cy="240" r="30" fill="currentColor" />
      <circle cx="416" cy="160" r="30" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Car Data" className={cn("font-semibold tracking-[-0.02em]", className)}>
      <span aria-hidden>
        Car<span className="text-primary">Data</span>
      </span>
    </span>
  );
}
