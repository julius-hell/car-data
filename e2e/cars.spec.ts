import { expect, test } from "@playwright/test";
import { addCar } from "./helpers/cars";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

test.beforeEach(async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Driver ${Date.now()}-${Math.random()}`);
});

test("a new user is prompted to add their first car", async ({ page }) => {
  await expect(page).toHaveURL("/cars");
  await expect(page.getByText("Add your first car")).toBeVisible();
});

test("add cars with the default and an explicit unit", async ({ page }) => {
  await addCar(page, "Civic");
  await addCar(page, "Mustang", "mi");

  const civic = page.getByRole("listitem").filter({ hasText: "Civic" });
  const mustang = page.getByRole("listitem").filter({ hasText: "Mustang" });
  await expect(civic).toContainText("km");
  await expect(mustang).toContainText("mi");
  await expect(page.getByText("Add your first car")).toBeHidden();
});

test("the car page shows the car's name and unit", async ({ page }) => {
  const carId = await addCar(page, "Golf", "mi");
  await page.getByRole("link", { name: /Golf/ }).click();
  await expect(page).toHaveURL(`/cars/${carId}`);
  await expect(page.getByRole("heading", { name: "Golf" })).toBeVisible();
  await expect(page.getByTestId("car-unit")).toHaveText("mi");
});

test("deleting a car asks for confirmation first", async ({ page }) => {
  await addCar(page, "Panda");
  await page.getByRole("button", { name: "Delete Panda" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Delete Panda?");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Panda" })).toBeVisible();

  await page.getByRole("button", { name: "Delete Panda" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Panda" })).toBeHidden();
  await expect(page.getByText("Add your first car")).toBeVisible();
});

test("another user's car is not found", async ({ page, browser }) => {
  const carId = await addCar(page, "Secret");

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await enableVirtualPasskeys(otherPage);
  await signUp(otherPage, `Intruder ${Date.now()}`);

  const response = await otherPage.goto(`/cars/${carId}`);
  expect(response?.status()).toBe(404);
  await expect(otherPage.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(otherPage.getByText("Secret")).toBeHidden();

  const garbage = await otherPage.goto("/cars/not-a-car");
  expect(garbage?.status()).toBe(404);
  await otherContext.close();
});
