import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { addCar } from "./helpers/cars";
import { saveContract } from "./helpers/contracts";
import { inDays, inMonths } from "./helpers/dates";
import { addMember, setupOrganization } from "./helpers/org";

test.beforeEach(async ({ page, browser }) => {
  await setupOrganization(page, browser);
});

async function addReading(page: Page, odometer: number, date: string) {
  const rows = page.getByTestId("entries").locator("tbody tr");
  const before = await rows.count();
  await page.getByLabel(/Odometer/).first().fill(String(odometer));
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByRole("button", { name: "Add reading" }).click();
  await expect(rows).toHaveCount(before + 1);
}

const lease = {
  kind: "leased" as const,
  fields: {
    Start: inMonths(-12),
    "Term (months)": "36",
    "Km per year": "10000",
    "Odometer at handover": "1000",
    "Excess km rate (EUR/km)": "0,08",
    "Under km credit (EUR/km)": "0.05",
  },
};

test("a car driving too much is projected over its allowance with the extra cost", async ({ page }) => {
  const carId = await addCar(page, "AL-OW 1");
  await page.goto(`/cars/${carId}`);
  await saveContract(page, lease);
  const allowance = page.getByTestId("allowance");
  await expect(allowance.getByTestId("allowance-to-date")).toHaveText("No mileage entries yet.");

  await addReading(page, 15_000, inDays(-100));
  await addReading(page, 18_000, inDays(-10));
  await expect(allowance.getByTestId("allowance-to-date")).toContainText("17,000 km driven so far");
  await expect(allowance.getByTestId("allowance-to-date")).toContainText("30,000 km in total");
  await expect(allowance.getByTestId("allowance-projection")).toContainText("over the allowance");
  await expect(allowance.getByTestId("allowance-projection")).toContainText("Expected extra cost €");
  await expect(allowance).toHaveAttribute("data-level", "soon");
});

test("a car driving little is projected under its allowance with the credit", async ({ page }) => {
  const carId = await addCar(page, "AL-OW 2");
  await page.goto(`/cars/${carId}`);
  await saveContract(page, lease);
  await addReading(page, 1_000, inDays(-100));
  await addReading(page, 3_000, inDays(-10));
  const allowance = page.getByTestId("allowance");
  await expect(allowance.getByTestId("allowance-projection")).toContainText("under the allowance");
  await expect(allowance.getByTestId("allowance-projection")).toContainText("Expected credit €");
  await expect(allowance).toHaveAttribute("data-level", "ok");
});

test("recording the return retires the car and keeps the handover details", async ({ page, browser }) => {
  const carId = await addCar(page, "RE-TN 1");
  await page.goto(`/cars/${carId}`);
  await saveContract(page, lease);

  await page.getByRole("button", { name: "Record return" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Final odometer (km)").fill("20500");
  await dialog.getByLabel("Condition notes").fill("Scratch on the rear bumper");
  const photo = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 90, g: 90, b: 90 } } })
    .jpeg()
    .toBuffer();
  await dialog.getByLabel("Photos (optional)").setInputFiles([{ name: "bumper.jpg", mimeType: "image/jpeg", buffer: photo }]);
  await dialog.getByRole("button", { name: "Record return" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByTestId("car-retired")).toContainText("returned");
  const handover = page.getByTestId("contract-return");
  await expect(handover).toContainText("20,500 km");
  await expect(handover).toContainText("Scratch on the rear bumper");
  await expect(handover.getByTestId("return-attachment-link")).toHaveText("bumper.jpg");
  await expect(page.getByTestId("entries").locator("tbody tr").first()).toContainText("20,500 km");
  await expect(page.getByRole("button", { name: "Record return" })).toHaveCount(0);
  await expect(page.getByTestId("allowance")).toHaveCount(0);

  await page.goto("/cars");
  await expect(page.locator('[data-testid="fleet-car"][data-plate="RE-TN 1"]')).toHaveCount(0);

  const viewer = await addMember(browser, page, "viewer");
  await viewer.page.goto(`/cars/${carId}`);
  await expect(viewer.page.getByTestId("contract-return")).toContainText("Scratch on the rear bumper");
  await viewer.context.close();
});
