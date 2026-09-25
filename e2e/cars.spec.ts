import { expect, test } from "@playwright/test";
import { addCar } from "./helpers/cars";
import { signUp } from "./helpers/auth";

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test("a new user is prompted to add their first car", async ({ page }) => {
  await expect(page).toHaveURL("/cars");
  await expect(page.getByText("Add your first car")).toBeVisible();
});

test("added cars are listed with readings in km", async ({ page }) => {
  await addCar(page, "Civic");
  await addCar(page, "Mustang");

  await expect(page.getByRole("listitem").filter({ hasText: "Civic" })).toContainText("km");
  await expect(page.getByRole("listitem").filter({ hasText: "Mustang" })).toContainText("km");
  await expect(page.getByText("Add your first car")).toBeHidden();
});

test("the car page shows the car's name", async ({ page }) => {
  const carId = await addCar(page, "Golf");
  await page.getByRole("link", { name: /Golf/ }).click();
  await expect(page).toHaveURL(`/cars/${carId}`);
  await expect(page.getByRole("heading", { name: "Golf" })).toBeVisible();
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
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByRole("listitem").filter({ hasText: "Panda" })).toBeHidden();
  await expect(page.getByText("Add your first car")).toBeVisible();
});

test("another user's car is not found", async ({ page, browser }) => {
  const carId = await addCar(page, "Secret");

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signUp(otherPage);

  const response = await otherPage.goto(`/cars/${carId}`);
  expect(response?.status()).toBe(404);
  await expect(otherPage.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(otherPage.getByText("Secret")).toBeHidden();

  const garbage = await otherPage.goto("/cars/not-a-car");
  expect(garbage?.status()).toBe(404);
  await otherContext.close();
});
