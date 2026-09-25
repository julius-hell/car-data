import { expect, test, type Page } from "@playwright/test";
import { addCar } from "./helpers/cars";
import { displayDate } from "./helpers/format";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

const dots = (page: Page) =>
  page.getByTestId("mileage-chart").locator("circle.recharts-line-dot");
const rows = (page: Page) => page.getByTestId("entries").locator("tbody tr");

async function addReading(page: Page, odometer: number, date: string) {
  const before = await rows(page).count();
  await page.getByLabel(/Odometer/).fill(String(odometer));
  await page.getByLabel("Date").fill(date);
  await page.getByRole("button", { name: "Add reading" }).click();
  await expect(rows(page)).toHaveCount(before + 1);
}

test.beforeEach(async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Plotter ${Date.now()}-${Math.random()}`);
  const carId = await addCar(page, "Plotted");
  await page.goto(`/cars/${carId}`);
});

test("shows an empty state until the first reading, then one point per reading", async ({ page }) => {
  await expect(page.getByTestId("mileage-chart-empty")).toBeVisible();

  await addReading(page, 1000, "2026-01-10");
  await expect(page.getByTestId("mileage-chart")).toBeVisible();
  await expect(dots(page)).toHaveCount(1);

  await addReading(page, 1500, "2026-02-10");
  await expect(dots(page)).toHaveCount(2);

  await addReading(page, 2400, "2026-03-10");
  await expect(dots(page)).toHaveCount(3);
});

test("the y-axis and tooltip carry the car's unit", async ({ page }) => {
  await addReading(page, 12000, "2026-01-01");
  await addReading(page, 12500, "2026-01-20");
  const chart = page.getByTestId("mileage-chart");
  await expect(chart.getByText(/^12,\d{3}$/).first()).toBeVisible();

  await chart.scrollIntoViewIfNeeded();
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await expect(chart.locator(".recharts-tooltip-wrapper")).toContainText("12,500 km");
});

test("deleting a reading removes its point", async ({ page }) => {
  await addReading(page, 300, "2026-04-01");
  await addReading(page, 400, "2026-04-02");
  await expect(dots(page)).toHaveCount(2);
  await page
    .getByRole("button", { name: `Delete reading 400 on ${displayDate("2026-04-02")}` })
    .click();
  await expect(dots(page)).toHaveCount(1);
});

test("the chart fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addReading(page, 100, "2026-01-01");
  await addReading(page, 200, "2026-12-31");
  await expect(dots(page)).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    )
    .toBeLessThanOrEqual(0);
});

test("the series colour follows the colour scheme", async ({ page }) => {
  await addReading(page, 100, "2026-01-01");
  await addReading(page, 200, "2026-02-01");
  const line = page.getByTestId("mileage-chart").locator("path.recharts-curve").last();
  const stroke = () => line.evaluate((el) => getComputedStyle(el).stroke);

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(stroke).toBe("rgb(42, 120, 214)");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(stroke).toBe("rgb(57, 135, 229)");
});
