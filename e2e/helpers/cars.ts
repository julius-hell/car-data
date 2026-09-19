import { expect, type Page } from "@playwright/test";

export async function addCar(page: Page, name: string, unit?: "km" | "mi") {
  await page.goto("/cars");
  const dialog = page.getByRole("dialog");
  // The trigger needs hydration; retry the click until the dialog opens.
  await expect(async () => {
    await page.getByRole("button", { name: "Add car" }).click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await dialog.getByLabel("Name").fill(name);
  if (unit) await dialog.getByLabel("Unit").selectOption(unit);
  await dialog.getByRole("button", { name: "Add car" }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row).toBeVisible();
  const href = await row.getByRole("link").getAttribute("href");
  return href!.split("/").pop()!;
}
