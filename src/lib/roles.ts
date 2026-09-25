// Shared with client components, so it must not import server-only code.
export const ROLES = ["admin", "driver", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
