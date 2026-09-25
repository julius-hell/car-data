import { expect, test } from "@playwright/test";
import { newAccount, signIn } from "./helpers/auth";
import { addCar } from "./helpers/cars";
import {
  acceptInvitation,
  addMember,
  inviteMember,
  memberRow,
  operatorPage,
  pathOf,
  setupOrganization,
} from "./helpers/org";

test("admins invite drivers and viewers who join with their own password", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const driver = await addMember(browser, page, "driver");
  const viewer = await addMember(browser, page, "viewer");

  await page.goto("/team");
  await expect(memberRow(page, driver.account.email).getByTestId("member-role")).toHaveValue("driver");
  await expect(memberRow(page, viewer.account.email).getByTestId("member-role")).toHaveValue("viewer");
  await expect(memberRow(page, driver.account.email).getByTestId("email-verified")).toHaveAttribute(
    "data-verified",
    "false",
  );
  await expect(page.getByTestId("invitation")).toHaveCount(0);

  await driver.context.close();
  await viewer.context.close();
});

test("open invitations can be revoked and re-issued; duplicates are refused", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const invitee = newAccount("driver");
  const firstLink = await inviteMember(page, invitee, "driver");

  await page.getByLabel("Name", { exact: true }).fill(invitee.name);
  await page.getByLabel("Email", { exact: true }).fill(invitee.email);
  await page.getByRole("button", { name: "Create invitation" }).click();
  await expect(page.getByTestId("invite-member-error")).toContainText("already an open invitation");

  const invitation = page.getByTestId("invitation").filter({ hasText: invitee.email });
  await invitation.getByRole("button", { name: "New link" }).click();
  await expect(invitation.getByTestId("invitation-link")).not.toHaveValue(firstLink);
  const secondLink = await invitation.getByTestId("invitation-link").inputValue();

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  await visitorPage.goto(pathOf(firstLink));
  await expect(visitorPage.getByTestId("invite-unavailable")).toBeVisible();

  await invitation.getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByTestId("invitation")).toHaveCount(0);
  await visitorPage.goto(pathOf(secondLink));
  await expect(visitorPage.getByTestId("invite-unavailable")).toBeVisible();
  await visitor.close();
});

test("a member of another organization can't be invited", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  const { admin: otherAdmin } = await setupOrganization(otherPage, browser);
  await other.close();

  await page.goto("/team");
  await page.getByLabel("Name", { exact: true }).fill("Poacher");
  await page.getByLabel("Email", { exact: true }).fill(otherAdmin.email);
  await page.getByRole("button", { name: "Create invitation" }).click();
  await expect(page.getByTestId("invite-member-error")).toContainText("already belongs to a member");
});

test("roles can change, but the last admin stays an admin", async ({ page, browser }) => {
  const { admin } = await setupOrganization(page, browser);
  const driver = await addMember(browser, page, "driver");

  await page.goto("/team");
  const self = memberRow(page, admin.email);
  await self.getByTestId("member-role").selectOption("viewer");
  await self.getByRole("button", { name: "Save" }).click();
  await expect(self.getByTestId("member-error")).toContainText("at least one admin");

  await self.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(self.getByTestId("member-error")).toContainText("at least one admin");

  const row = memberRow(page, driver.account.email);
  await row.getByTestId("member-role").selectOption("admin");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText("Role saved.");

  // With two admins, the original one may step down.
  await self.getByTestId("member-role").selectOption("viewer");
  await self.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL("/cars");
  expect((await page.goto("/team"))?.status()).toBe(404);
  await driver.context.close();
});

test("removed members lose access and can rejoin with their password", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const driver = await addMember(browser, page, "driver");
  await expect(driver.page).toHaveURL("/my-cars");

  await page.goto("/team");
  await memberRow(page, driver.account.email).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(memberRow(page, driver.account.email)).toHaveCount(0);

  await driver.page.goto("/my-cars");
  await expect(driver.page).toHaveURL(/\/login/);
  await signIn(driver.page, driver.account);
  await expect(driver.page).toHaveURL("/no-organization");

  // Invited again, they join with the password they already have.
  const link = await inviteMember(page, driver.account, "viewer");
  await driver.page.goto(pathOf(link));
  await expect(driver.page.getByText("Sign out to accept this invitation")).toBeVisible();
  await driver.page.getByRole("button", { name: "Sign out" }).click();
  await driver.page.goto(pathOf(link));
  await expect(driver.page.getByTestId("invite-existing-account")).toBeVisible();
  await driver.page.getByLabel("Password").fill("wrong password");
  await driver.page.getByRole("button", { name: "Join" }).click();
  await expect(driver.page.getByTestId("invite-error")).toHaveText("The password is incorrect.");
  await acceptInvitation(driver.page, link, driver.account.password);
  await expect(driver.page).toHaveURL("/cars");
  await driver.context.close();
});

test("admins hand out password reset links", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const driver = await addMember(browser, page, "driver");

  await page.goto("/team");
  const row = memberRow(page, driver.account.email);
  await row.getByRole("button", { name: /password reset link/i }).click();
  const link = await row.getByTestId("reset-link").inputValue();

  const phone = await browser.newContext();
  const phonePage = await phone.newPage();
  await phonePage.goto(pathOf(link));
  await phonePage.getByLabel("New password").fill("forgot it, new one");
  await phonePage.getByRole("button", { name: "Set password" }).click();
  await expect(phonePage.getByTestId("login-notice")).toBeVisible();

  // The reset signed the driver out everywhere, and the link is spent.
  await driver.page.goto("/my-cars");
  await expect(driver.page).toHaveURL(/\/login/);
  await signIn(phonePage, { email: driver.account.email, password: "forgot it, new one" });
  await expect(phonePage).toHaveURL("/my-cars");
  await phonePage.goto(pathOf(link));
  await phonePage.getByLabel("New password").fill("another password");
  await phonePage.getByRole("button", { name: "Set password" }).click();
  await expect(phonePage.getByTestId("auth-error")).toContainText("invalid or has expired");
  await phone.close();
  await driver.context.close();
});

test("the operator can issue a reset link for an organization's admin", async ({ page, browser }) => {
  const { admin, organizationUrl } = await setupOrganization(page, browser);
  const operator = await operatorPage(browser);
  await operator.goto(organizationUrl);
  const row = operator.getByTestId("organization-admin").filter({ hasText: admin.email });
  await row.getByRole("button", { name: /password reset link/i }).click();
  const link = await row.getByTestId("reset-link").inputValue();
  await operator.context().close();

  await page.context().clearCookies();
  await page.goto(pathOf(link));
  await page.getByLabel("New password").fill("recovered password");
  await page.getByRole("button", { name: "Set password" }).click();
  await signIn(page, { email: admin.email, password: "recovered password" });
  await expect(page).toHaveURL("/cars");
});

test("admins rename their organization", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  await page.goto("/team");
  await page.getByLabel("Organization name").fill("Renamed Fleet GmbH");
  await page.getByRole("button", { name: "Rename" }).click();
  await expect(page.getByTestId("header-context")).toHaveText("Renamed Fleet GmbH");
});

test("viewers see the fleet read-only", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "Shared");
  await page.goto(`/cars/${carId}`);
  await page.getByLabel(/Odometer/).fill("1000");
  await page.getByRole("button", { name: "Add reading" }).click();
  await expect(page.getByTestId("entries").locator("tbody tr")).toHaveCount(1);

  const viewer = await addMember(browser, page, "viewer");
  const viewerPage = viewer.page;
  await expect(viewerPage).toHaveURL("/cars");
  await expect(viewerPage.getByRole("listitem").filter({ hasText: "Shared" })).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: "Add car" })).toHaveCount(0);
  await expect(viewerPage.getByRole("button", { name: /Delete/ })).toHaveCount(0);

  await viewerPage.goto(`/cars/${carId}`);
  await expect(viewerPage.getByTestId("entries").locator("tbody tr")).toHaveCount(1);
  await expect(viewerPage.getByTestId("mileage-chart")).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: "Add reading" })).toHaveCount(0);
  await expect(viewerPage.getByRole("button", { name: /Delete reading/ })).toHaveCount(0);
  await expect(viewerPage.getByRole("button", { name: /photo/i })).toHaveCount(0);
  expect((await viewerPage.goto("/team"))?.status()).toBe(404);

  const upload = await viewer.context.request.post(`/cars/${carId}/photo`, {
    headers: { "sec-fetch-site": "same-origin" },
    multipart: { photo: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  expect(upload.status()).toBe(404);
  await viewer.context.close();
});

test("drivers without assigned cars see nothing of the fleet", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "Unassigned");
  const driver = await addMember(browser, page, "driver");

  await expect(driver.page).toHaveURL("/my-cars");
  await expect(driver.page.getByTestId("no-cars-assigned")).toBeVisible();
  expect((await driver.page.goto("/cars"))?.status()).toBe(404);
  expect((await driver.page.goto(`/cars/${carId}`))?.status()).toBe(404);
  expect((await driver.page.goto("/team"))?.status()).toBe(404);
  await driver.context.close();
});
