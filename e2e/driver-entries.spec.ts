import { expect, test, type Page } from "@playwright/test";
import { addCar, assignDriver } from "./helpers/cars";
import { inDays } from "./helpers/dates";
import { displayDate } from "./helpers/format";
import { addMember, memberRow, setupOrganization } from "./helpers/org";

const rows = (page: Page) => page.getByTestId("entries").locator("tbody tr");

async function logReading(page: Page, odometer: number, date?: string) {
  await page.getByLabel(/Odometer/).fill(String(odometer));
  if (date) await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByRole("button", { name: "Add reading" }).click();
}

async function driverWithCar(page: Page, browser: import("@playwright/test").Browser) {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "LO-G 1");
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name, { from: inDays(-30) });
  await driver.page.goto(`/cars/${carId}`);
  return { carId, driver };
}

test("drivers log readings and see only their own; admins see who recorded what", async ({ page, browser }) => {
  const { carId, driver } = await driverWithCar(page, browser);

  await page.goto(`/cars/${carId}`);
  await logReading(page, 10_000, inDays(-20));
  await expect(rows(page)).toHaveCount(1);

  await driver.page.reload();
  await expect(driver.page.getByText("No readings yet.")).toBeVisible();
  await logReading(driver.page, 9_000, inDays(-1));
  await expect(driver.page.getByTestId("entry-warning")).toContainText("lower than the latest reading of 10,000 km");
  await driver.page.getByLabel(/Odometer/).fill("10500");
  await driver.page.getByRole("button", { name: "Save anyway" }).click();
  await expect(rows(driver.page)).toHaveCount(1);
  await expect(rows(driver.page).first()).toContainText("10,500 km");
  await expect(driver.page.getByTestId("mileage-chart")).toHaveCount(0);
  await expect(driver.page.getByTestId("stat-per-day")).toHaveCount(0);

  await page.reload();
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).first().getByTestId("entry-recorded-by")).toHaveText(driver.account.name);
  await driver.context.close();
});

test("drivers fix and delete their own readings", async ({ page, browser }) => {
  const { driver } = await driverWithCar(page, browser);
  await logReading(driver.page, 1234, inDays(-2));
  await expect(rows(driver.page)).toHaveCount(1);

  await driver.page
    .getByRole("button", { name: `Edit reading 1,234 on ${displayDate(inDays(-2))}` })
    .click();
  const dialog = driver.page.getByRole("dialog");
  await dialog.getByLabel(/Odometer/).fill("12340");
  await dialog.getByLabel("Note").fill("typo");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(rows(driver.page).first()).toContainText("12,340 km");
  await expect(rows(driver.page).first()).toContainText("typo");

  await driver.page
    .getByRole("button", { name: `Delete reading 12,340 on ${displayDate(inDays(-2))}` })
    .click();
  await expect(driver.page.getByText("No readings yet.")).toBeVisible();
  await driver.context.close();
});

test("admins edit any reading", async ({ page, browser }) => {
  const { carId, driver } = await driverWithCar(page, browser);
  await logReading(driver.page, 5000, inDays(-3));
  await expect(rows(driver.page)).toHaveCount(1);

  await page.goto(`/cars/${carId}`);
  await page.getByRole("button", { name: `Edit reading 5,000 on ${displayDate(inDays(-3))}` }).click();
  await page.getByRole("dialog").getByLabel(/Odometer/).fill("5050");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(rows(page).first()).toContainText("5,050 km");
  await expect(rows(page).first().getByTestId("entry-recorded-by")).toHaveText(driver.account.name);
  await driver.context.close();
});

test("a removed driver's name stays on their readings", async ({ page, browser }) => {
  const { carId, driver } = await driverWithCar(page, browser);
  await logReading(driver.page, 777, inDays(-1));
  await expect(rows(driver.page)).toHaveCount(1);

  await page.goto("/team");
  await memberRow(page, driver.account.email).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(memberRow(page, driver.account.email)).toHaveCount(0);

  await page.goto(`/cars/${carId}`);
  await expect(rows(page).first().getByTestId("entry-recorded-by")).toHaveText(driver.account.name);
  await driver.context.close();
});

test("viewers can't log readings", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "NO-LOG 1");
  const viewer = await addMember(browser, page, "viewer");
  await viewer.page.goto(`/cars/${carId}`);
  await expect(viewer.page.getByRole("button", { name: "Add reading" })).toHaveCount(0);
  await expect(viewer.page.getByRole("button", { name: /Edit reading/ })).toHaveCount(0);
  await viewer.context.close();
});
