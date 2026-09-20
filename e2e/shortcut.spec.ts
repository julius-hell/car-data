import { expect, test } from "@playwright/test";
import { addCar } from "./helpers/cars";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

test("the manifest offers a Log reading shortcut", async ({ page }) => {
  await page.goto("/login");
  const href = (await page.locator('link[rel="manifest"]').getAttribute("href"))!;
  const manifest = await (await page.request.get(href)).json();
  const shortcut = manifest.shortcuts?.[0];
  expect(shortcut?.url).toBe("/log");
  expect(shortcut?.name).toBe("Log reading");
  const icon = await page.request.get(shortcut.icons[0].src);
  expect(icon.ok()).toBe(true);
});

test("/log opens the default car's form with the odometer focused", async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Quick ${Date.now()}`);
  const carId = await addCar(page, "Daily");
  await page.goto("/log");
  await expect(page).toHaveURL(`/cars/${carId}?log=1`);
  await expect(page.getByLabel(/Odometer/)).toBeFocused();
  await page.goto("/cars");
  await page.getByRole("link", { name: "Log reading" }).click();
  await expect(page).toHaveURL(`/cars/${carId}?log=1`);
});

test("/log without a default car lands on the car list", async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Empty ${Date.now()}`);
  await page.goto("/log");
  await expect(page).toHaveURL("/cars");
  await expect(page.getByRole("link", { name: "Log reading" })).toHaveCount(0);
});

test("/log while signed out continues to /log after signing in", async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Returning ${Date.now()}`);
  const carId = await addCar(page, "Weekend");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/log");
  await expect(page).toHaveURL("/login?next=/log");
  await page.getByRole("button", { name: "Sign in with passkey" }).click();
  await expect(page).toHaveURL(`/cars/${carId}?log=1`);
});

test("the login destination cannot point off-site", async ({ page }) => {
  await enableVirtualPasskeys(page);
  await page.goto("/login?next=https://evil.example");
  await page.getByLabel("Name").fill(`Careful ${Date.now()}`);
  await page.getByRole("button", { name: "Create account with passkey" }).click();
  await expect(page).toHaveURL("/cars");
});
