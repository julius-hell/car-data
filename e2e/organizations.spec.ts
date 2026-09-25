import { expect, test } from "@playwright/test";
import { newAccount } from "./helpers/auth";
import { addCar } from "./helpers/cars";
import {
  createOrganization,
  operatorPage,
  pathOf,
  setupOrganization,
  uniqueName,
} from "./helpers/org";

test("the operator creates an organization and its first admin joins", async ({ page, browser }) => {
  const admin = newAccount("admin");
  const organization = await createOrganization(browser, { admin });

  await page.goto(pathOf(organization.inviteLink));
  await expect(page.getByTestId("invite-summary")).toContainText(organization.name);
  await expect(page.getByTestId("invite-summary")).toContainText("Admin");
  await expect(page.getByLabel("Email")).toHaveValue(admin.email);
  await expect(page.getByLabel("Email")).not.toBeEditable();

  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByTestId("invite-error")).toContainText("at least 8 characters");

  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page).toHaveURL("/cars");
  await expect(page.getByTestId("header-context")).toHaveText(organization.name);
  await addCar(page, "Transporter");

  const operator = await operatorPage(browser);
  await operator.goto("/operator");
  const row = operator.getByTestId("organizations").locator("tr").filter({ hasText: organization.name });
  await expect(row.getByTestId("organization-status")).toHaveText("Active");
  await expect(row.getByTestId("organization-members")).toHaveText("1");
  await expect(row.getByTestId("organization-cars")).toHaveText("1");

  await operator.goto(organization.organizationUrl);
  await expect(operator.getByTestId("organization-admins")).toContainText(admin.email);
  await expect(operator.getByTestId("invitation")).toHaveCount(0);
  await operator.context().close();
});

test("a used invitation link cannot be used again", async ({ page, browser }) => {
  const organization = await setupOrganization(page, browser);
  const stranger = await browser.newContext();
  const strangerPage = await stranger.newPage();
  await strangerPage.goto(pathOf(organization.inviteLink));
  await expect(strangerPage.getByTestId("invite-unavailable")).toContainText("already been used");
  await stranger.close();
});

test("the operator can revoke and re-issue the first admin's invitation", async ({ page, browser }) => {
  const organization = await createOrganization(browser);
  const operator = await operatorPage(browser);
  await operator.goto(organization.organizationUrl);

  await operator.getByRole("button", { name: "New link" }).click();
  await expect(operator.getByTestId("invitation-link")).not.toHaveValue(organization.inviteLink);
  const reissued = await operator.getByTestId("invitation-link").inputValue();

  await page.goto(pathOf(organization.inviteLink));
  await expect(page.getByTestId("invite-unavailable")).toBeVisible();

  await operator.getByRole("button", { name: "Revoke" }).click();
  await expect(operator.getByTestId("invitation")).toHaveCount(0);
  await page.goto(pathOf(reissued));
  await expect(page.getByTestId("invite-unavailable")).toBeVisible();
  await operator.context().close();
});

test("an email that already belongs to a member cannot be invited as first admin", async ({ page, browser }) => {
  const { admin } = await setupOrganization(page, browser);
  const operator = await operatorPage(browser);
  await operator.goto("/operator");
  await operator.getByLabel("Organization name").fill(uniqueName("Second"));
  await operator.getByLabel("First admin's name").fill("Someone");
  await operator.getByLabel("First admin's email").fill(admin.email);
  await operator.getByRole("button", { name: "Create organization" }).click();
  await expect(operator.getByTestId("organization-error")).toContainText("already belongs to a member");
  await operator.context().close();
});

test("organizations are isolated from each other and from the operator", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "Private");

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await setupOrganization(otherPage, browser);
  await expect(otherPage.getByRole("listitem").filter({ hasText: "Private" })).toHaveCount(0);
  expect((await otherPage.goto(`/cars/${carId}`))?.status()).toBe(404);
  expect((await other.request.get(`/cars/${carId}/photo`)).status()).toBe(404);
  await other.close();

  const operator = await operatorPage(browser);
  await operator.goto("/");
  await expect(operator).toHaveURL("/operator");
  expect((await operator.goto(`/cars/${carId}`))?.status()).toBe(404);
  expect((await operator.goto("/cars"))?.status()).toBe(404);
  await operator.context().close();
});

test("members can't open the operator area", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  expect((await page.goto("/operator"))?.status()).toBe(404);
});

