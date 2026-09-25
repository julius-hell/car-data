import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers/auth";
import { setupOrganization } from "./helpers/org";

test("a signed-out visitor is sent to the sign-in page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);
});

test("sign out and sign back in with email and password", async ({ page, browser }) => {
  const { admin, name } = await setupOrganization(page, browser);
  await expect(page.getByRole("banner")).toContainText(admin.name);
  await expect(page.getByTestId("header-context")).toHaveText(name);

  await page.goto("/login");
  await expect(page).toHaveURL("/cars");

  await signOut(page);
  await page.goto("/");
  await expect(page).toHaveURL("/login");

  await signIn(page, admin);
  await expect(page).toHaveURL("/cars");
  await expect(page.getByRole("banner")).toContainText(admin.name);
});

test("an unknown email and a wrong password give the same error", async ({ page, browser }) => {
  const { admin } = await setupOrganization(page, browser);
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

  const wrongPassword = await attempt(admin.email, "not the password");
  const unknownEmail = await attempt(`nobody-${Date.now()}@example.test`, "whatever123");
  expect(wrongPassword).toBe(unknownEmail);
  await expect(page).toHaveURL("/login");
});

test("public sign-up and the organization plugin's endpoints are disabled", async ({ page }) => {
  expect((await page.goto("/signup"))?.status()).toBe(404);
  const signUp = await page.request.post("/api/auth/sign-up/email", {
    data: { name: "Mallory", email: `mallory-${Date.now()}@example.test`, password: "long enough password" },
  });
  expect(signUp.ok()).toBe(false);
  const createOrg = await page.request.post("/api/auth/organization/create", {
    data: { name: "Sneaky", slug: `sneaky-${Date.now()}` },
  });
  expect(createOrg.status()).toBe(404);
});

test("changing the password signs out other sessions", async ({ page, browser }) => {
  const { admin } = await setupOrganization(page, browser);

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, admin);
  await expect(otherPage).toHaveURL("/cars");

  await page.goto("/settings");
  await page.getByLabel("Current password").fill("wrong password");
  await page.getByLabel("New password").fill("a brand new password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByTestId("password-status")).toHaveText("The current password is incorrect.");

  await page.getByLabel("Current password").fill(admin.password);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByTestId("password-status")).toContainText("Password changed");

  // This device stays signed in, the other one is out.
  await page.goto("/cars");
  await expect(page).toHaveURL("/cars");
  await otherPage.goto("/cars");
  await expect(otherPage).toHaveURL(/\/login/);

  await signIn(otherPage, { email: admin.email, password: "a brand new password" });
  await expect(otherPage).toHaveURL("/cars");
  await other.close();
});
