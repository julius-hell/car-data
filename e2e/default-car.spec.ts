import { expect, test, type Page } from "@playwright/test";
import { addCar, deleteCar } from "./helpers/cars";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

const row = (page: Page, name: string) =>
  page.getByRole("listitem").filter({ hasText: name });

async function signOutAndBackIn(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await page.getByRole("button", { name: "Sign in with passkey" }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

test.beforeEach(async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Owner ${Date.now()}-${Math.random()}`);
});

test("the first car becomes the default and the root lands on it", async ({ page }) => {
  const carId = await addCar(page, "First");
  await expect(row(page, "First")).toContainText("Default");
  await expect(row(page, "First").getByRole("button", { name: /Set .* as default/ })).toHaveCount(0);

  await page.goto("/");
  await expect(page).toHaveURL(`/cars/${carId}`);
});

test("setting another car as default moves the badge and the landing", async ({ page }) => {
  await addCar(page, "First");
  const secondId = await addCar(page, "Second");
  await expect(row(page, "Second")).not.toContainText("Default");

  await page.getByRole("button", { name: "Set Second as default" }).click();
  await expect(row(page, "Second")).toContainText("Default");
  await expect(row(page, "First")).not.toContainText("Default");

  await page.goto("/");
  await expect(page).toHaveURL(`/cars/${secondId}`);
});

test("deleting the default car clears it and the root lands on the list", async ({ page }) => {
  await addCar(page, "First");
  await addCar(page, "Second");

  await deleteCar(page, "First");
  await expect(row(page, "Second")).not.toContainText("Default");

  await page.goto("/");
  await expect(page).toHaveURL("/cars");
});

test("signing in lands on the default car", async ({ page }) => {
  const carId = await addCar(page, "Daily");
  await signOutAndBackIn(page);
  await expect(page).toHaveURL(`/cars/${carId}`);
  await expect(page.getByRole("heading", { name: "Daily" })).toBeVisible();
});

test("signing in with cars but no default lands on the list", async ({ page }) => {
  await addCar(page, "First");
  await addCar(page, "Second");
  await deleteCar(page, "First");

  await signOutAndBackIn(page);
  await expect(page).toHaveURL("/cars");
});

test("signing in with no cars lands on the first-car prompt", async ({ page }) => {
  await signOutAndBackIn(page);
  await expect(page).toHaveURL("/cars");
  await expect(page.getByText("Add your first car")).toBeVisible();
});
