import { expect, test } from "@playwright/test";
import { newAccount, signIn, signOut, signUp } from "./helpers/auth";

test("a signed-out visitor is sent to the sign-in page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);
});

test("sign up, sign out and sign back in with email and password", async ({ page }) => {
  const account = await signUp(page);
  await expect(page.getByRole("banner")).toContainText(account.name);

  await page.goto("/login");
  await expect(page).toHaveURL("/cars");
  await page.goto("/signup");
  await expect(page).toHaveURL("/cars");

  await signOut(page);
  await page.goto("/");
  await expect(page).toHaveURL("/login");

  await signIn(page, account);
  await expect(page).toHaveURL("/cars");
  await expect(page.getByRole("banner")).toContainText(account.name);
});

test("an unknown email and a wrong password give the same error", async ({ page }) => {
  const account = await signUp(page);
  await signOut(page);

  const attempt = async (email: string, password: string) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    const error = page.getByTestId("auth-error");
    await expect(error).toBeVisible();
    return error.textContent();
  };

  const wrongPassword = await attempt(account.email, "not the password");
  const unknownEmail = await attempt(`nobody-${Date.now()}@example.test`, "whatever123");
  expect(wrongPassword).toBe(unknownEmail);
  await expect(page).toHaveURL("/login");
});

test("sign-up enforces the password rules and a name", async ({ page }) => {
  const account = newAccount();
  await page.goto("/signup");
  await page.getByLabel("Name").fill("   ");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("name-error")).toHaveText("Enter your name.");

  await page.getByLabel("Name").fill(account.name);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("password-error")).toContainText("at least 8 characters");
  await expect(page).toHaveURL("/signup");
});

test("changing the password signs out other sessions", async ({ page, browser }) => {
  const account = await signUp(page);

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, account);
  await otherPage.goto("/cars");
  await expect(otherPage).toHaveURL("/cars");

  await page.goto("/settings");
  await page.getByLabel("Current password").fill("wrong password");
  await page.getByLabel("New password").fill("a brand new password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByTestId("password-status")).toHaveText("The current password is incorrect.");

  await page.getByLabel("Current password").fill(account.password);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByTestId("password-status")).toContainText("Password changed");

  // This device stays signed in, the other one is out.
  await page.goto("/cars");
  await expect(page).toHaveURL("/cars");
  await otherPage.goto("/cars");
  await expect(otherPage).toHaveURL(/\/login/);

  await signIn(otherPage, { email: account.email, password: "a brand new password" });
  await expect(otherPage).toHaveURL("/cars");
  await other.close();
});
