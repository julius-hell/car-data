// Inline feedback under a form: errors are announced, successes are polite.
export function FormMessage({
  kind,
  children,
  testId,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      data-testid={testId}
      className={
        kind === "error" ? "text-destructive text-sm" : "text-sm text-emerald-700 dark:text-emerald-400"
      }
    >
      {children}
    </p>
  );
}
