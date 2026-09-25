import { expect, type Browser, type Page } from "@playwright/test";
import { newAccount, PASSWORD, type Account } from "./auth";

export const OPERATOR_STATE = "e2e/.auth/operator.json";

// One operator per test run; the setup project creates it.
export const OPERATOR = {
  name: "Test Operator",
  email: `operator-${process.env.TEST_RUN_ID ?? Date.now()}@example.test`,
  password: PASSWORD,
};

export async function operatorPage(browser: Browser) {
  const context = await browser.newContext({ storageState: OPERATOR_STATE });
  return context.newPage();
}

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// The path of an absolute invitation or reset link, so tests follow it on
// whatever server they run against.
export function pathOf(link: string) {
  const url = new URL(link);
  return url.pathname + url.search;
}

// The operator creates an organization; returns its first admin's invitation link.
export async function createOrganization(
  browser: Browser,
  { name = uniqueName("Org"), admin = newAccount("admin") }: { name?: string; admin?: Account } = {},
) {
  const page = await operatorPage(browser);
  await page.goto("/operator");
  await page.getByLabel("Organization name").fill(name);
  await page.getByLabel("First admin's name").fill(admin.name);
  await page.getByLabel("First admin's email").fill(admin.email);
  await page.getByRole("button", { name: "Create organization" }).click();
  await page.waitForURL(/\/operator\/organizations\//);
  const inviteLink = await page.getByTestId("invitation-link").inputValue();
  const organizationUrl = page.url();
  await page.context().close();
  return { name, admin, inviteLink, organizationUrl };
}

export async function acceptInvitation(page: Page, link: string, password = PASSWORD) {
  await page.goto(pathOf(link));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page).not.toHaveURL(/\/invite\//);
}

// A fresh organization whose first admin is signed in on `page`.
export async function setupOrganization(page: Page, browser: Browser, options?: { name?: string }) {
  const organization = await createOrganization(browser, options);
  await acceptInvitation(page, organization.inviteLink);
  await expect(page).toHaveURL("/cars");
  return organization;
}
