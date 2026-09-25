import { expect, test, type Page } from "@playwright/test";
import { addCar } from "./helpers/cars";
import { displayDate } from "./helpers/format";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

const rows = (page: Page) => page.getByTestId("entries").locator("tbody tr");

async function addReading(
  page: Page,
  odometer: number,
  { date, note }: { date?: string; note?: string } = {},
) {
  await page.getByLabel(/Odometer/).fill(String(odometer));
  if (date) await page.getByLabel("Date").fill(date);
  if (note) await page.getByLabel("Note (optional)").fill(note);
  await page.getByRole("button", { name: "Add reading" }).click();
}

test.beforeEach(async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Logger ${Date.now()}-${Math.random()}`);
  const carId = await addCar(page, "Logbook");
  await page.goto(`/cars/${carId}`);
});

test("a reading defaults to today and appears at the top with the unit", async ({ page }) => {
  const today = await page.evaluate(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  });
  await expect(page.getByLabel("Date")).toHaveValue(today);
  await expect(page.getByText("No readings yet.")).toBeVisible();

  await addReading(page, 12345);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText(displayDate(today));
  await expect(rows(page).first()).toContainText("12,345 km");
  await expect(page.getByLabel(/Odometer/)).toHaveValue("");
});

test("readings are listed newest first with their notes", async ({ page }) => {
  await addReading(page, 20000, { date: "2026-03-01", note: "spring check" });
  await expect(rows(page)).toHaveCount(1);
  await addReading(page, 19000, { date: "2026-01-15", note: "winter tyres" });
  await expect(page.getByTestId("entry-warning")).toBeVisible();
  await page.getByRole("button", { name: "Save anyway" }).click();
  await expect(rows(page)).toHaveCount(2);
  await addReading(page, 21000, { date: "2026-05-20" });
  await expect(rows(page)).toHaveCount(3);

  await expect(rows(page).nth(0)).toContainText(displayDate("2026-05-20"));
  await expect(rows(page).nth(1)).toContainText(displayDate("2026-03-01"));
  await expect(rows(page).nth(1)).toContainText("spring check");
  await expect(rows(page).nth(2)).toContainText(displayDate("2026-01-15"));
  await expect(rows(page).nth(2)).toContainText("winter tyres");
});

test("a reading lower than the latest warns but can still be saved", async ({ page }) => {
  await addReading(page, 50000, { date: "2026-02-01" });
  await expect(rows(page)).toHaveCount(1);

  await addReading(page, 49000, { date: "2026-02-02", note: "typo fix" });
  const warning = page.getByTestId("entry-warning");
  await expect(warning).toContainText("49,000 km is lower than the latest reading of 50,000 km");
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByLabel(/Odometer/)).toHaveValue("49000");
  await expect(page.getByLabel("Note (optional)")).toHaveValue("typo fix");

  await page.getByRole("button", { name: "Save anyway" }).click();
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).first()).toContainText("49,000 km");
  await expect(warning).toBeHidden();
});

test("a reading can be deleted", async ({ page }) => {
  await addReading(page, 777, { date: "2026-04-04" });
  await expect(rows(page)).toHaveCount(1);
  await page
    .getByRole("button", { name: `Delete reading 777 on ${displayDate("2026-04-04")}` })
    .click();
  await expect(page.getByText("No readings yet.")).toBeVisible();
});

test("the form fits a phone screen without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addReading(page, 1234, { note: "a fairly long note about a service visit" });
  await expect(rows(page)).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(0);
});
