import { expect, test, type Page } from "@playwright/test";
import { addCar } from "./helpers/cars";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

const DAY_MS = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

async function addReading(page: Page, odometer: number, date: string) {
  const rows = page.getByTestId("entries").locator("tbody tr");
  const before = await rows.count();
  await page.getByLabel(/Odometer/).fill(String(odometer));
  await page.getByLabel("Date").fill(date);
  await page.getByRole("button", { name: "Add reading" }).click();
  await expect(rows).toHaveCount(before + 1);
}

test.beforeEach(async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Analyst ${Date.now()}-${Math.random()}`);
});

test("statistics are derived from the readings", async ({ page }) => {
  const carId = await addCar(page, "Golf");
  await page.goto(`/cars/${carId}`);
  await expect(page.getByTestId("stat-per-day")).toContainText("Needs two readings");
  await expect(page.getByTestId("monthly-chart-empty")).toBeVisible();

  // 1,800 km over exactly the 90-day rate window: 20 km/day, 7,305 km/year.
  await addReading(page, 10000, daysAgo(100));
  await addReading(page, 11800, daysAgo(10));

  await expect(page.getByTestId("stat-per-day")).toContainText(/20\s*km/);
  await expect(page.getByTestId("stat-projected")).toContainText(/7,305\s*km/);
  await expect(page.getByTestId("stat-this-year")).toContainText(/\d/);
  await expect(page.getByTestId("monthly-chart")).toBeVisible();
  await expect(page.getByTestId("monthly-chart").locator(".recharts-bar-rectangle")).not.toHaveCount(0);
});

test("distance this year only counts from the first of January", async ({ page }) => {
  const carId = await addCar(page, "Polo");
  await page.goto(`/cars/${carId}`);
  const year = new Date().getUTCFullYear();
  // 100 km/day across the year boundary; the year start is interpolated.
  await addReading(page, 50000, `${year - 1}-12-22`);
  await addReading(page, 52000, `${year}-01-11`);
  await addReading(page, 53000, `${year}-01-21`);
  // Jan 1 sits 10 days into the first 20-day gap: 50,000 + 1,000 = 51,000.
  await expect(page.getByTestId("stat-this-year")).toContainText(/2,000\s*km/);
});
