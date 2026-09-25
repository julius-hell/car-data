import { expect, test } from "@playwright/test";
import { newAccount, signIn } from "./helpers/auth";
import { countEmails, linkIn, waitForEmail } from "./helpers/mail";
import {
  acceptInvitation,
  addMember,
  createOrganization,
  inviteMember,
  memberRow,
  pathOf,
  setupOrganization,
} from "./helpers/org";

test("the first admin's invitation is emailed and verifies their address", async ({ page, browser }) => {
  const admin = newAccount("admin");
  const organization = await createOrganization(browser, { admin });

  const mail = await waitForEmail(admin.email, { subject: organization.name });
  const link = linkIn(mail);
  expect(link).toContain("proof=");
  // The copyable link works too, but only the emailed one carries the proof.
  expect(pathOf(link)).toContain(new URL(organization.inviteLink).pathname);

  await acceptInvitation(page, link);
  await expect(page).toHaveURL("/dashboard");
  await page.goto("/team");
  await expect(memberRow(page, admin.email).getByTestId("email-verified")).toHaveAttribute("data-verified", "true");
  expect(await countEmails(admin.email, "Confirm your email")).toBe(0);
});

test("joining through a copied link sends a verification email", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const driver = await addMember(browser, page, "driver");

  const invitation = await waitForEmail(driver.account.email, { subject: "invitation" });
  expect(invitation.text).toContain("driver");

  const verification = await waitForEmail(driver.account.email, { subject: "Confirm your email" });
  await driver.page.goto(pathOf(linkIn(verification)));
  await page.goto("/team");
  await expect(memberRow(page, driver.account.email).getByTestId("email-verified")).toHaveAttribute(
    "data-verified",
    "true",
  );
  await driver.context.close();
});

test("verified members reset a forgotten password by email", async ({ page, browser }) => {
  const admin = newAccount("admin");
  const organization = await createOrganization(browser, { admin });
  await acceptInvitation(page, linkIn(await waitForEmail(admin.email, { subject: organization.name })));
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL("/forgot-password");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByTestId("reset-requested")).toBeVisible();

  const mail = await waitForEmail(admin.email, { subject: "Reset your password" });
  await page.goto(pathOf(linkIn(mail)));
  await expect(page).toHaveURL(/\/set-password\?token=/);
  await page.getByLabel("New password").fill("remembered now");
  await page.getByRole("button", { name: "Set password" }).click();
  await signIn(page, { email: admin.email, password: "remembered now" });
  await expect(page).toHaveURL("/dashboard");
});

test("unverified and unknown addresses get no reset email, and the page doesn't tell", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const driver = await addMember(browser, page, "driver");
  await driver.context.close();

  const visitor = await browser.newContext();
  const visitorPage = await visitor.newPage();
  for (const email of [driver.account.email, `nobody-${Date.now()}@example.test`]) {
    await visitorPage.goto("/forgot-password");
    await visitorPage.getByLabel("Email").fill(email);
    await visitorPage.getByRole("button", { name: "Send reset link" }).click();
    await expect(visitorPage.getByTestId("reset-requested")).toBeVisible();
  }
  await visitor.close();
  // Give a stray email time to arrive before checking it didn't.
  await page.waitForTimeout(1500);
  expect(await countEmails(driver.account.email, "Reset your password")).toBe(0);
});

test("emails use the recipient's language", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Deutsch" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");

  // Invitations go out in the inviting admin's language.
  const invitee = newAccount("fahrer");
  await page.goto("/team");
  await page.getByLabel("Name", { exact: true }).fill(invitee.name);
  await page.getByLabel("E-Mail", { exact: true }).fill(invitee.email);
  await page.getByRole("button", { name: "Einladung erstellen" }).click();
  const invitation = await waitForEmail(invitee.email);
  expect(invitation.subject).toContain("Deine Einladung");

  // The German choice is stored on the account, so another device uses it too.
  const account = page.context();
  const cookies = (await account.cookies()).filter((c) => c.name !== "locale");
  const other = await browser.newContext();
  await other.addCookies(cookies);
  const otherPage = await other.newPage();
  await otherPage.goto("/team");
  await expect(otherPage.locator("html")).toHaveAttribute("lang", "de");
  await other.close();
});

test("German is the default for browsers in other languages", async ({ browser }) => {
  const french = await browser.newContext({ locale: "fr-FR" });
  const page = await french.newPage();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await french.close();
});

test("re-issued invitations are emailed again", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const invitee = newAccount("viewer");
  await inviteMember(page, invitee, "viewer");
  await waitForEmail(invitee.email);
  await page.getByTestId("invitation").getByRole("button", { name: "New link" }).click();
  await expect.poll(() => countEmails(invitee.email)).toBe(2);
});
