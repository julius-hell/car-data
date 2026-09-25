import { expect, type Page } from "@playwright/test";

export async function addCar(page: Page, name: string) {
  await page.goto("/cars");
  const dialog = page.getByRole("dialog");
  // The trigger needs hydration; retry the click until the dialog opens.
  await expect(async () => {
    await page.getByRole("button", { name: "Add car" }).click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Add car" }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row).toBeVisible();
  const href = await row.getByRole("link").getAttribute("href");
  return href!.split("/").pop()!;
}

export async function deleteCar(page: Page, name: string) {
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Delete" }).click();
  // While the dialog is open the page behind it is aria-hidden, so wait for
  // it to close before judging the list.
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("listitem").filter({ hasText: name })).toBeHidden();
}
