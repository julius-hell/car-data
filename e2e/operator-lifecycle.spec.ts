import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/auth";
import { addCar } from "./helpers/cars";
import { addMember, operatorPage, setupOrganization } from "./helpers/org";

test("a deactivated organization's members see only a notice until it is reactivated", async ({ page, browser }) => {
  const organization = await setupOrganization(page, browser);
  const carId = await addCar(page, "D-EAK 1");
  const driver = await addMember(browser, page, "driver");

  const operator = await operatorPage(browser);
  await operator.goto(organization.organizationUrl);
  await operator.getByRole("button", { name: "Deactivate" }).click();
  await expect(operator.getByTestId("organization-status")).toHaveText("Deactivated");

  await page.goto("/cars");
  await expect(page).toHaveURL("/deactivated");
  await expect(page.getByTestId("organization-deactivated")).toBeVisible();
  await page.goto(`/cars/${carId}`);
  await expect(page).toHaveURL("/deactivated");
  expect((await page.request.get(`/cars/${carId}/photo`)).status()).toBe(404);
  await driver.page.goto("/");
  await expect(driver.page).toHaveURL("/deactivated");

  // Signing in again still lands on the notice.
  await page.context().clearCookies();
  await signIn(page, organization.admin);
  await expect(page).toHaveURL("/deactivated");

  await operator.getByRole("button", { name: "Reactivate" }).click();
  await expect(operator.getByTestId("organization-status")).toHaveText("Active");
  await page.goto(`/cars/${carId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("D-EAK 1");
  await operator.context().close();
  await driver.context.close();
});

test("deleting an organization erases it and its members' accounts", async ({ page, browser }) => {
  const organization = await setupOrganization(page, browser);
  await addCar(page, "D-EL 1");
  const driver = await addMember(browser, page, "driver");

  const operator = await operatorPage(browser);
  await operator.goto(organization.organizationUrl);
  await operator.getByLabel(/to confirm/).fill("wrong name");
  await operator.getByRole("button", { name: "Delete permanently" }).click();
  await expect(operator.getByTestId("delete-organization-error")).toBeVisible();

  await operator.getByLabel(/to confirm/).fill(organization.name);
  await operator.getByRole("button", { name: "Delete permanently" }).click();
  await expect(operator).toHaveURL("/operator");
  await expect(operator.getByTestId("organizations").getByText(organization.name)).toHaveCount(0);
  expect((await operator.goto(organization.organizationUrl))?.status()).toBe(404);

  // The accounts are gone, so their credentials no longer work.
  for (const account of [organization.admin, driver.account]) {
    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/login");
    await visitor.getByLabel("Email").fill(account.email);
    await visitor.getByLabel("Password").fill(account.password);
    await visitor.getByRole("button", { name: "Sign in" }).click();
    await expect(visitor.getByTestId("auth-error")).toBeVisible();
    await context.close();
  }

  // The operator is unaffected.
  await operator.goto("/operator");
  await expect(operator.getByRole("heading", { name: "Organizations" })).toBeVisible();
  await operator.context().close();
  await driver.context.close();
});
