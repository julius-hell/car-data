import { expect, test } from "@playwright/test";

test("the app renders its landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Car Data" })).toBeVisible();
});
