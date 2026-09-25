import { expect, test } from "@playwright/test";
import { addCar, assignDriver } from "./helpers/cars";
import { inDays } from "./helpers/dates";
import { addMember, memberRow, setupOrganization } from "./helpers/org";

test("an assigned driver lands on their car and sees it read-only", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "DR-IV 1", { make: "Opel", model: "Vivaro", costCenter: "900" });
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name);

  await page.goto("/cars");
  await expect(page.getByTestId("fleet-car").getByTestId("car-drivers")).toHaveText(
    `Driven by ${driver.account.name}`,
  );
  await page.goto("/team");
  await expect(memberRow(page, driver.account.email).getByTestId("member-cars")).toContainText("DR-IV 1");

  await driver.page.goto("/");
  await expect(driver.page).toHaveURL(`/cars/${carId}`);
  await expect(driver.page.getByRole("heading", { level: 1 })).toHaveText("DR-IV 1");
  await expect(driver.page.getByTestId("car-make-model")).toHaveText("Opel Vivaro");
  await expect(driver.page.getByTestId("car-details")).toHaveCount(0);
  await expect(driver.page.getByRole("button", { name: /Edit|Retire|Delete|Add photo/ })).toHaveCount(0);
  await expect(driver.page.getByText("Drivers", { exact: true })).toHaveCount(0);
  await driver.context.close();
});

test("drivers with several cars get a list, and see nothing else", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const first = await addCar(page, "MU-LT 1");
  const second = await addCar(page, "MU-LT 2");
  const other = await addCar(page, "MU-LT 3");
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, first, driver.account.name);
  await assignDriver(page, second, driver.account.name);

  await driver.page.goto("/");
  await expect(driver.page).toHaveURL("/my-cars");
  await expect(driver.page.getByTestId("my-car")).toHaveCount(2);
  expect((await driver.page.goto(`/cars/${other}`))?.status()).toBe(404);
  await driver.context.close();
});

test("several drivers share a car; ending an assignment ends access", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "PO-OL 1");
  const anna = await addMember(browser, page, "driver");
  const ben = await addMember(browser, page, "driver");
  await assignDriver(page, carId, anna.account.name, { from: inDays(-10) });
  await assignDriver(page, carId, ben.account.name);
  await expect(page.getByTestId("current-assignment")).toHaveCount(2);

  const annaRow = page.getByTestId("current-assignment").filter({ hasText: anna.account.name });
  await annaRow.getByLabel(/End date for/).fill(inDays(-1));
  await annaRow.getByRole("button", { name: "End" }).click();
  await expect(page.getByTestId("current-assignment")).toHaveCount(1);
  await expect(page.getByTestId("past-assignment").filter({ hasText: anna.account.name })).toBeVisible();

  expect((await anna.page.goto(`/cars/${carId}`))?.status()).toBe(404);
  await ben.page.goto(`/cars/${carId}`);
  await expect(ben.page.getByRole("heading", { level: 1 })).toHaveText("PO-OL 1");

  await page.goto("/team");
  await memberRow(page, anna.account.email).getByRole("link", { name: anna.account.name }).click();
  await expect(page.getByTestId("member-past-cars")).toContainText("PO-OL 1");
  await anna.context.close();
  await ben.context.close();
});

test("an assignment ending today still counts today; a future one not yet", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const today = await addCar(page, "DA-TE 1");
  const later = await addCar(page, "DA-TE 2");
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, today, driver.account.name, { from: inDays(-3), until: inDays(0) });
  await assignDriver(page, later, driver.account.name, { from: inDays(5) });
  await expect(page.getByTestId("past-assignment")).toContainText("upcoming");

  await driver.page.goto("/");
  await expect(driver.page).toHaveURL(`/cars/${today}`);
  expect((await driver.page.goto(`/cars/${later}`))?.status()).toBe(404);
  await driver.context.close();
});

test("viewers can't be assigned and overlapping assignments are refused", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "VI-EW 2");
  const viewer = await addMember(browser, page, "viewer");
  const driver = await addMember(browser, page, "driver");
  await page.goto(`/cars/${carId}`);
  const options = await page.getByLabel("Driver", { exact: true }).locator("option").allTextContents();
  expect(options).toContain(driver.account.name);
  expect(options).not.toContain(viewer.account.name);

  await assignDriver(page, carId, driver.account.name);
  await page.getByLabel("Driver", { exact: true }).selectOption({ label: driver.account.name });
  await page.getByRole("button", { name: "Assign" }).click();
  await expect(page.getByTestId("assign-error")).toContainText("already has an assignment");
  await viewer.context.close();
  await driver.context.close();
});

test("removing a member ends their assignments", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "RE-MV 1");
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name, { from: inDays(-7) });

  await page.goto("/team");
  await memberRow(page, driver.account.email).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(memberRow(page, driver.account.email)).toHaveCount(0);

  await page.goto(`/cars/${carId}`);
  await expect(page.getByTestId("current-assignment")).toHaveCount(0);
  await expect(page.getByTestId("past-assignment")).toContainText(driver.account.name);
  await driver.context.close();
});
