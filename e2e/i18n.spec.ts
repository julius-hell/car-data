import { expect, test } from "@playwright/test";
import { addCar } from "./helpers/cars";
import { signUp } from "./helpers/auth";

test("the browser language picks the locale", async ({ browser }) => {
  const german = await browser.newContext({ locale: "de-DE" });
  const page = await german.newPage();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("button", { name: "Anmelden", exact: true })).toBeVisible();
  await german.close();
});

test("switching to German translates the app and formats numbers and dates", async ({ page }) => {
  await signUp(page);
  const carId = await addCar(page, "Golf");
  await page.goto(`/cars/${carId}`);
  await page.getByLabel(/Odometer/).fill("12345");
  await page.getByLabel("Date").fill("2026-08-15");
  await page.getByRole("button", { name: "Add reading" }).click();
  await expect(page.getByTestId("entries").locator("tbody tr")).toHaveCount(1);

  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "Deutsch" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("heading", { name: "Kilometerstand im Verlauf" })).toBeVisible();
  await expect(page.getByTestId("entries").locator("tbody tr").first()).toContainText("12.345");
  await expect(page.getByTestId("entries").locator("tbody tr").first()).toContainText("15.08.2026");
  await expect(page.getByRole("button", { name: "Eintragen" })).toBeVisible();

  await page.goto("/cars");
  await expect(page.getByRole("heading", { name: "Deine Autos" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Golf" })).toContainText("1 Eintrag");

  await page.getByRole("group", { name: "Sprache" }).getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Your cars" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Golf" })).toContainText("1 reading");
});
