import { expect, test, type Page } from "@playwright/test";
import { addCar, assignDriver } from "./helpers/cars";
import { inDays } from "./helpers/dates";
import { intervalRow } from "./helpers/intervals";
import { addMember, memberRow, setupOrganization } from "./helpers/org";

const typeRow = (page: Page, name: string) => page.locator(`[data-testid="interval-type"][data-name="${name}"]`);

async function addType(page: Page, name: string, subject: "car" | "driver", months: string) {
  await page.goto("/interval-types");
  const form = page.getByRole("heading", { name: "New interval type" }).locator("xpath=../..");
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Applies to").selectOption(subject);
  await form.getByLabel("Every (months)").fill(months);
  await form.getByRole("button", { name: "Add interval type" }).click();
  await expect(typeRow(page, name)).toBeVisible();
}

test.beforeEach(async ({ page, browser }) => {
  await setupOrganization(page, browser);
});

test("changing a type's defaults changes every car that doesn't override them", async ({ page }) => {
  const carId = await addCar(page, "TY-PE 1");
  await page.goto("/interval-types");
  const service = typeRow(page, "Service");
  await service.getByLabel("Every (months)").fill("24");
  await service.getByLabel("or every (km)").fill("30000");
  await service.getByRole("button", { name: "Save" }).click();
  await expect(service).toContainText("Saved.");

  await page.goto(`/cars/${carId}`);
  await expect(intervalRow(page, "Service").getByTestId("interval-period")).toHaveText(
    "every 24 months or 30,000 km, whichever comes first",
  );
  await expect(typeRow(page, "HU/AU")).toHaveCount(0);
});

test("custom car types are tracked per car and can't be deleted while in use", async ({ page }) => {
  await addType(page, "First-aid kit", "car", "36");
  await addType(page, "Unused type", "car", "6");
  await expect(typeRow(page, "HU/AU").getByRole("button", { name: /Delete/ })).toHaveCount(0);

  const carId = await addCar(page, "TY-PE 2");
  await page.goto(`/cars/${carId}`);
  await page.getByLabel("Interval to track").selectOption({ label: "First-aid kit" });
  await page.getByRole("button", { name: "Track", exact: true }).click();
  await expect(intervalRow(page, "First-aid kit").getByTestId("interval-period")).toHaveText("every 36 months");

  await page.goto("/interval-types");
  await typeRow(page, "First-aid kit").getByRole("button", { name: "Delete First-aid kit" }).click();
  await expect(typeRow(page, "First-aid kit").getByTestId("delete-type-error")).toContainText("can't be deleted");
  await typeRow(page, "Unused type").getByRole("button", { name: "Delete Unused type" }).click();
  await expect(typeRow(page, "Unused type")).toHaveCount(0);
});

test("custom driver types apply to everyone who drives a company car", async ({ page, browser }) => {
  const carId = await addCar(page, "TY-PE 3");
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name, { from: inDays(-1) });

  await addType(page, "Tachograph card", "driver", "12");
  await page.goto("/team");
  await memberRow(page, driver.account.email).getByRole("link", { name: driver.account.name }).click();
  await expect(intervalRow(page, "Tachograph card")).toHaveAttribute("data-level", "missing");
  await driver.context.close();
});

test("only admins manage interval types", async ({ page, browser }) => {
  const viewer = await addMember(browser, page, "viewer");
  expect((await viewer.page.goto("/interval-types"))?.status()).toBe(404);
  await viewer.context.close();
});
