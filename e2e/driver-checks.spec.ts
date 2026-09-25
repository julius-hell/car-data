import { expect, test, type Page } from "@playwright/test";
import { addCar, assignDriver } from "./helpers/cars";
import { inDays, inMonths } from "./helpers/dates";
import { pdf } from "./helpers/files";
import { displayDate } from "./helpers/format";
import { intervalRow, openHistory } from "./helpers/intervals";
import { addMember, memberRow, setupOrganization } from "./helpers/org";

async function openMember(page: Page, email: string, name: string) {
  await page.goto("/team");
  await memberRow(page, email).getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

async function driverOnCar(page: Page, browser: import("@playwright/test").Browser) {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "CH-K 1");
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name, { from: inDays(-10) });
  await openMember(page, driver.account.email, driver.account.name);
  return { carId, driver };
}

test("assigning a car starts the driver's checks without a due date", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  await addCar(page, "CH-K 0");
  const driver = await addMember(browser, page, "driver");
  await openMember(page, driver.account.email, driver.account.name);
  await expect(page.getByTestId("driver-checks")).toHaveCount(0);

  const carId = await addCar(page, "CH-K 2");
  await assignDriver(page, carId, driver.account.name);
  await openMember(page, driver.account.email, driver.account.name);
  await expect(intervalRow(page, "Licence check")).toHaveAttribute("data-level", "missing");
  await expect(intervalRow(page, "UVV instruction")).toHaveAttribute("data-level", "missing");
  await driver.context.close();
});

test("a licence check records classes and expiry and is due again by the expiry at the latest", async ({ page, browser }) => {
  const { driver } = await driverOnCar(page, browser);
  const check = intervalRow(page, "Licence check");

  await check.getByRole("button", { name: "Record completion of Licence check" }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel(/Report|files/i)).toHaveCount(0);
  await dialog.getByLabel("Licence classes").fill("B, BE");
  await dialog.getByLabel("Licence valid until").fill(inYears(10));
  await dialog.getByLabel("Checked by").fill("Fleet office");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(check.getByTestId("due-summary")).toContainText(`Due ${displayDate(inMonths(6))}`);
  await openHistory(check);
  await expect(check.getByTestId("completion")).toContainText("classes B, BE");

  await check.getByRole("button", { name: "Record completion of Licence check" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Licence classes").fill("B");
  await dialog.getByLabel("Licence valid until").fill(inMonths(2));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(check.getByTestId("due-summary")).toContainText(`Due ${displayDate(inMonths(2))}`);
  await driver.context.close();
});

function inYears(years: number) {
  return inMonths(12 * years);
}

test("a UVV instruction can carry a signed attendance list", async ({ page, browser }) => {
  const { driver } = await driverOnCar(page, browser);
  const instruction = intervalRow(page, "UVV instruction");
  await instruction.getByRole("button", { name: "Record completion of UVV instruction" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Note").fill("annual briefing");
  await dialog.getByLabel(/Report or invoice/).setInputFiles([pdf("attendance.pdf")]);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(instruction.getByTestId("due-summary")).toContainText(`Due ${displayDate(inMonths(12))}`);
  await openHistory(instruction);
  const href = (await instruction.getByTestId("attachment-link").getAttribute("href"))!;
  expect((await page.request.get(href)).ok()).toBe(true);

  const viewer = await addMember(browser, page, "viewer");
  expect((await viewer.context.request.get(href)).status()).toBe(404);
  expect((await viewer.page.goto("/team"))?.status()).toBe(404);
  expect((await driver.context.request.get(href)).status()).toBe(404);
  await viewer.context.close();
  await driver.context.close();
});

test("drivers see their own check due dates; the checks outlive the assignment", async ({ page, browser }) => {
  const { carId, driver } = await driverOnCar(page, browser);
  const licence = intervalRow(page, "Licence check");
  await licence.getByRole("button", { name: "Edit Licence check" }).click();
  await page.getByRole("dialog").getByLabel("Next due", { exact: true }).fill(inDays(20));
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(licence).toHaveAttribute("data-level", "soon");

  await driver.page.goto("/my-cars");
  await expect(intervalRow(driver.page, "Licence check")).toHaveAttribute("data-level", "soon");
  await expect(intervalRow(driver.page, "Licence check").getByTestId("due-summary")).toContainText("20 days left");
  await expect(driver.page.getByRole("button", { name: /Record completion|Edit Licence/ })).toHaveCount(0);

  await page.goto(`/cars/${carId}`);
  const row = page.getByTestId("current-assignment");
  await row.getByLabel(/End date for/).fill(inDays(-1));
  await row.getByRole("button", { name: "End" }).click();
  await expect(page.getByTestId("current-assignment")).toHaveCount(0);
  await openMember(page, driver.account.email, driver.account.name);
  await expect(intervalRow(page, "Licence check")).toHaveAttribute("data-level", "soon");
  await driver.context.close();
});
