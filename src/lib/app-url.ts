// Absolute links for things people copy or receive by email.
export function appUrl(path: string) {
  return new URL(path, process.env.BETTER_AUTH_URL ?? "http://localhost:3000").toString();
}
