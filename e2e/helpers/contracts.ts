import { expect, type Page } from "@playwright/test";

export type ContractInput = {
  kind: "owned" | "leased" | "financed" | "rented";
  fields?: Record<string, string>;
  services?: string[];
  files?: { name: string; mimeType: string; buffer: Buffer }[];
};

// Fills the contract dialog on the car page; `fields` maps labels to values.
export async function saveContract(page: Page, { kind, fields = {}, services = [], files }: ContractInput) {
  await page.getByRole("button", { name: /Add contract|Edit contract/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Held as").selectOption(kind);
  for (const [label, value] of Object.entries(fields)) await dialog.getByLabel(label, { exact: true }).fill(value);
  for (const service of services) await dialog.getByLabel(service).check();
  if (files) await dialog.getByLabel("Contract documents (optional)").setInputFiles(files);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
}
