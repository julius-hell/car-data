import { expect, type Page } from "@playwright/test";

export const PASSWORD = "correct horse battery";

export type Account = { name: string; email: string; password: string };

// Unique per call so parallel tests never share an account.
export function newAccount(prefix = "user"): Account {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { name: `${prefix} ${id}`, email: `${prefix.toLowerCase()}-${id}@example.test`, password: PASSWORD };
}

export async function signUp(page: Page, account: Account = newAccount()) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(account.name);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/cars");
  return account;
}

export async function signIn(page: Page, { email, password }: Pick<Account, "email" | "password">) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
}
