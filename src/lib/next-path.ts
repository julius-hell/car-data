// Only same-site paths may be used as a post-login destination.
export function safeNextPath(value: unknown): string | null {
  return typeof value === "string" && /^\/(?!\/)/.test(value) ? value : null;
}
