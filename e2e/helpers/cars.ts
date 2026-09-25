import { expect, type Page } from "@playwright/test";

export type CarDetails = {
  make?: string;
  model?: string;
  vin?: string;
  firstRegistration?: string;
  costCenter?: string;
  location?: string;
};

async function openAddCarDialog(page: Page) {
  await page.goto("/cars");
  const dialog = page.getByRole("dialog");
  // The trigger needs hydration; retry the click until the dialog opens.
  await expect(async () => {
    await page.getByRole("button", { name: "Add car" }).click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return dialog;
}

export async function fillCarForm(page: Page, plate: string | null, details: CarDetails) {
  const dialog = page.getByRole("dialog");
  if (plate !== null) await dialog.getByLabel("Licence plate").fill(plate);
  const fields: [string, string | undefined][] = [
    ["Make", details.make],
    ["Model", details.model],
    ["VIN", details.vin],
    ["First registration", details.firstRegistration],
    ["Cost center", details.costCenter],
    ["Location", details.location],
  ];
  for (const [label, value] of fields) {
    if (value !== undefined) await dialog.getByLabel(label, { exact: true }).fill(value);
  }
}

// Mirrors the app's normalisation so tests can find what they typed.
export const normalizePlate = (plate: string) =>
  plate.toUpperCase().trim().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-");

// Adds a car on the fleet page and returns its id.
export async function addCar(page: Page, plate: string, details: CarDetails = {}) {
  const dialog = await openAddCarDialog(page);
  await fillCarForm(page, plate, { make: "Volkswagen", model: "Golf", ...details });
  await dialog.getByRole("button", { name: "Add car" }).click();
  await expect(dialog).toBeHidden();
  const row = page.locator(`[data-testid="fleet-car"][data-plate="${normalizePlate(plate)}"]`);
  await expect(row).toBeVisible();
  const href = await row.getByRole("link").getAttribute("href");
  return href!.split("/").pop()!;
}

export async function tryAddCar(page: Page, plate: string, details: CarDetails = {}) {
  const dialog = await openAddCarDialog(page);
  await fillCarForm(page, plate, { make: "Volkswagen", model: "Golf", ...details });
  await dialog.getByRole("button", { name: "Add car" }).click();
  return dialog;
}

export async function deleteCar(page: Page, plate: string) {
  await page.getByRole("button", { name: `Delete ${plate}` }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Delete" }).click();
  // While the dialog is open the page behind it is aria-hidden, so wait for
  // it to close before judging the list.
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("fleet-car").filter({ hasText: plate })).toBeHidden();
}
