import { expect, test } from "@playwright/test";
import { addMember, setupOrganization } from "./helpers/org";

// Runs against the server without SMTP settings.

test("without email, sign-in points to admins for password help", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("forgot-hint")).toContainText("Ask an admin");
  await expect(page.getByRole("link", { name: "Forgot your password?" })).toHaveCount(0);
  expect((await page.goto("/forgot-password"))?.status()).toBe(404);
});

test("without email, invitations work through copied links", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const driver = await addMember(browser, page, "driver");
  await expect(driver.page).toHaveURL("/my-cars");
  await driver.context.close();
});
