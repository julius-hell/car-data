import { expect, test, type Page } from "@playwright/test";
import { addCar, assignDriver } from "./helpers/cars";
import { displayMonth, inDays, inMonths, monthOf, today } from "./helpers/dates";
import { intervalRow } from "./helpers/intervals";
import { addMember, setupOrganization } from "./helpers/org";

test.beforeEach(async ({ page, browser }) => {
  await setupOrganization(page, browser);
});

async function addReading(page: Page, odometer: number, date: string) {
  const rows = page.getByTestId("entries").locator("tbody tr");
  const before = await rows.count();
  await page.getByLabel(/Odometer/).fill(String(odometer));
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByRole("button", { name: "Add reading" }).click();
  await expect(rows).toHaveCount(before + 1);
}

test("new cars track HU, UVV and service; a young car's first HU comes from its registration", async ({ page }) => {
  const registered = inMonths(-6);
  const carId = await addCar(page, "IN-T 1", { firstRegistration: registered });
  await page.goto(`/cars/${carId}`);

  const hu = intervalRow(page, "HU/AU");
  await expect(hu).toHaveAttribute("data-level", "ok");
  await expect(hu.getByTestId("due-summary")).toContainText(`Due ${displayMonth(inMonths(36, registered))}`);
  await expect(hu.getByTestId("interval-period")).toHaveText("every 24 months");
  await expect(intervalRow(page, "UVV inspection")).toHaveAttribute("data-level", "missing");
  await expect(intervalRow(page, "Service").getByTestId("interval-period")).toHaveText(
    "every 12 months or 15,000 km, whichever comes first",
  );

  const oldCarId = await addCar(page, "IN-T 2", { firstRegistration: "2015-05-01" });
  await page.goto(`/cars/${oldCarId}`);
  await expect(intervalRow(page, "HU/AU")).toHaveAttribute("data-level", "missing");
});

test("HU is due for its whole month; day intervals turn due soon inside their window", async ({ page }) => {
  const thisMonth = await addCar(page, "HU-M 1", { nextHu: monthOf(today()), nextUvv: inDays(10) });
  await page.goto(`/cars/${thisMonth}`);
  // Even at the end of the due month the HU is only due, not overdue.
  await expect(intervalRow(page, "HU/AU")).toHaveAttribute("data-level", "soon");
  await expect(intervalRow(page, "UVV inspection")).toHaveAttribute("data-level", "soon");
  await expect(intervalRow(page, "UVV inspection").getByTestId("due-summary")).toContainText("10 days left");

  const lastMonth = await addCar(page, "HU-M 2", { nextHu: monthOf(inMonths(-1)), nextUvv: inDays(-1) });
  await page.goto(`/cars/${lastMonth}`);
  await expect(intervalRow(page, "HU/AU")).toHaveAttribute("data-level", "overdue");
  await expect(intervalRow(page, "UVV inspection")).toHaveAttribute("data-level", "overdue");
  await expect(intervalRow(page, "UVV inspection").getByTestId("due-summary")).toContainText("1 day overdue");

  const later = await addCar(page, "HU-M 3", { nextHu: monthOf(inMonths(3)), nextUvv: inDays(60) });
  await page.goto(`/cars/${later}`);
  await expect(intervalRow(page, "HU/AU")).toHaveAttribute("data-level", "ok");
  await expect(intervalRow(page, "UVV inspection")).toHaveAttribute("data-level", "ok");
});

test("service falls due by months or km, whichever comes first", async ({ page }) => {
  const carId = await addCar(page, "SE-RV 1", { nextService: inDays(200), nextServiceKm: "20000" });
  await page.goto(`/cars/${carId}`);
  const service = intervalRow(page, "Service");

  await addReading(page, 18_200, inDays(-30));
  await addReading(page, 18_500, inDays(0)); // 10 km/day
  await expect(service).toHaveAttribute("data-level", "ok");
  await expect(service.getByTestId("due-summary")).toContainText("1,500 km to go");
  await expect(service.getByTestId("due-summary")).toContainText("≈");

  await addReading(page, 19_200, inDays(0));
  await expect(service).toHaveAttribute("data-level", "soon");

  await addReading(page, 20_100, inDays(0));
  await expect(service).toHaveAttribute("data-level", "overdue");
  await expect(service.getByTestId("due-summary")).toContainText("100 km overdue");
});

test("admins set due dates and periods, and choose what to track", async ({ page }) => {
  const carId = await addCar(page, "ED-IT 1");
  await page.goto(`/cars/${carId}`);

  const uvv = intervalRow(page, "UVV inspection");
  await uvv.getByRole("button", { name: "Edit UVV inspection" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Next due", { exact: true }).fill(inDays(90));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(uvv).toHaveAttribute("data-level", "ok");

  const service = intervalRow(page, "Service");
  await service.getByRole("button", { name: "Edit Service" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Period in months").fill("24");
  await dialog.getByLabel("Period in km").fill("30000");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(service.getByTestId("interval-period")).toHaveText(
    "every 24 months or 30,000 km, whichever comes first",
  );

  await page.getByRole("button", { name: "Stop tracking HU/AU" }).click();
  await expect(intervalRow(page, "HU/AU")).toHaveCount(0);
  await page.getByLabel("Interval to track").selectOption({ label: "HU/AU" });
  await page.getByRole("button", { name: "Track", exact: true }).click();
  await expect(intervalRow(page, "HU/AU")).toBeVisible();
});

test("the fleet list shows each car's most urgent status; drivers see theirs read-only", async ({ page, browser }) => {
  const overdue = await addCar(page, "WO-RST 1", { nextHu: monthOf(inMonths(-2)), nextUvv: inDays(100) });
  await addCar(page, "WO-RST 2", { nextHu: monthOf(inMonths(6)), nextUvv: inDays(100), nextService: inDays(100) });

  await page.goto("/cars");
  await expect(page.locator('[data-plate="WO-RST 1"]').getByTestId("car-level")).toHaveAttribute("data-level", "overdue");
  await expect(page.locator('[data-plate="WO-RST 2"]').getByTestId("car-level")).toHaveAttribute("data-level", "ok");

  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, overdue, driver.account.name);
  await driver.page.goto(`/cars/${overdue}`);
  await expect(intervalRow(driver.page, "HU/AU")).toHaveAttribute("data-level", "overdue");
  await expect(driver.page.getByRole("button", { name: /Edit HU|Stop tracking/ })).toHaveCount(0);
  await driver.context.close();
});
