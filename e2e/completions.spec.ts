import { expect, test, type Page } from "@playwright/test";
import { addCar, assignDriver, deleteCar } from "./helpers/cars";
import { displayMonth, inDays, inMonths, monthOf, today } from "./helpers/dates";
import { pdf, textFile } from "./helpers/files";
import { displayDate } from "./helpers/format";
import { intervalRow, openHistory } from "./helpers/intervals";
import { addMember, setupOrganization } from "./helpers/org";

test.beforeEach(async ({ page, browser }) => {
  await setupOrganization(page, browser);
});

type Completion = {
  date?: string;
  odometer?: string;
  result?: "passed" | "minor_defects" | "major_defects";
  provider?: string;
  cost?: string;
  note?: string;
  files?: ReturnType<typeof pdf>[];
  overrideDue?: string;
};

async function recordCompletion(page: Page, name: string, completion: Completion) {
  await intervalRow(page, name).getByRole("button", { name: `Record completion of ${name}` }).click();
  const dialog = page.getByRole("dialog");
  if (completion.date) await dialog.getByLabel("Date", { exact: true }).fill(completion.date);
  if (completion.odometer) await dialog.getByLabel("Odometer (km)").fill(completion.odometer);
  if (completion.result) await dialog.getByLabel("Result").selectOption(completion.result);
  if (completion.provider) await dialog.getByLabel("Workshop or inspector").fill(completion.provider);
  if (completion.cost) await dialog.getByLabel("Cost (EUR)").fill(completion.cost);
  if (completion.note) await dialog.getByLabel("Note").fill(completion.note);
  if (completion.files) await dialog.getByLabel(/Report or invoice|Add files/).setInputFiles(completion.files);
  if (completion.overrideDue) await dialog.getByLabel(/^Next due (month|date)$/).fill(completion.overrideDue);
  await dialog.getByRole("button", { name: "Save" }).click();
  return dialog;
}

test("recording a completion stores the record and moves the next due date", async ({ page }) => {
  const carId = await addCar(page, "CO-MP 1", { nextUvv: inDays(5) });
  await page.goto(`/cars/${carId}`);
  const dialog = await recordCompletion(page, "UVV inspection", {
    odometer: "42000",
    provider: "DEKRA Süd",
    cost: "89,90",
    note: "all fine",
    files: [pdf("uvv-report.pdf")],
  });
  await expect(dialog).toBeHidden();

  const uvv = intervalRow(page, "UVV inspection");
  await expect(uvv).toHaveAttribute("data-level", "ok");
  await expect(uvv.getByTestId("due-summary")).toContainText(`Due ${displayDate(inMonths(12))}`);
  await openHistory(uvv);
  const record = uvv.getByTestId("completion");
  await expect(record).toContainText("Passed");
  await expect(record).toContainText("42,000 km");
  await expect(record).toContainText("DEKRA Süd");
  await expect(record).toContainText("€89.90");
  await expect(record).toContainText("all fine");

  const link = record.getByTestId("attachment-link");
  await expect(link).toHaveText("uvv-report.pdf");
  const download = await page.request.get((await link.getAttribute("href"))!);
  expect(download.headers()["content-type"]).toBe("application/pdf");

  // The odometer became a mileage entry of the car.
  await expect(page.getByTestId("entries").locator("tbody tr").first()).toContainText("42,000 km");
  await expect(page.getByTestId("entries").locator("tbody tr").first()).toContainText("UVV inspection");
});

test("HU keeps month precision; service moves by months and km", async ({ page }) => {
  const carId = await addCar(page, "CO-MP 2", { nextHu: monthOf(today()) });
  await page.goto(`/cars/${carId}`);
  await recordCompletion(page, "HU/AU", { date: inDays(-3), odometer: "30000" });
  await expect(intervalRow(page, "HU/AU").getByTestId("due-summary")).toContainText(
    `Due ${displayMonth(inMonths(24, inDays(-3)))}`,
  );

  await recordCompletion(page, "Service", { odometer: "30000" });
  const service = intervalRow(page, "Service");
  await expect(service.getByTestId("due-summary")).toContainText(`Due ${displayDate(inMonths(12))}`);
  await expect(service.getByTestId("due-summary")).toContainText("at 45,000 km");
});

test("major defects make the interval due again in a month", async ({ page }) => {
  const carId = await addCar(page, "CO-MP 3", { nextUvv: inDays(-2) });
  await page.goto(`/cars/${carId}`);
  await recordCompletion(page, "UVV inspection", { result: "major_defects" });
  const uvv = intervalRow(page, "UVV inspection");
  await expect(uvv.getByTestId("due-summary")).toContainText(`Due ${displayDate(inMonths(1))}`);
  await expect(uvv).toHaveAttribute("data-level", "soon");
});

test("an admin override wins over the computed due date", async ({ page }) => {
  const carId = await addCar(page, "CO-MP 4");
  await page.goto(`/cars/${carId}`);
  await recordCompletion(page, "UVV inspection", { overrideDue: inDays(100) });
  await expect(intervalRow(page, "UVV inspection").getByTestId("due-summary")).toContainText(
    `Due ${displayDate(inDays(100))}`,
  );
});

test("editing and deleting a completion updates the interval", async ({ page }) => {
  const carId = await addCar(page, "CO-MP 5", { nextUvv: inDays(3) });
  await page.goto(`/cars/${carId}`);
  await recordCompletion(page, "UVV inspection", { odometer: "1000", files: [pdf()] });
  const uvv = intervalRow(page, "UVV inspection");
  await openHistory(uvv);
  const attachmentHref = (await uvv.getByTestId("attachment-link").getAttribute("href"))!;

  await uvv.getByRole("button", { name: `Edit completion of ${displayDate(today())}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Date", { exact: true }).fill(inDays(-10));
  await dialog.getByLabel("Odometer (km)").fill("1500");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(uvv.getByTestId("due-summary")).toContainText(`Due ${displayDate(inMonths(12, inDays(-10)))}`);
  await expect(page.getByTestId("entries").locator("tbody tr").first()).toContainText("1,500 km");

  await openHistory(uvv);
  await uvv.getByRole("button", { name: `Delete completion of ${displayDate(inDays(-10))}` }).click();
  await expect(uvv.getByTestId("due-summary")).toContainText(`Due ${displayDate(inDays(3))}`);
  await expect(page.getByTestId("entries")).toHaveCount(0);
  expect((await page.request.get(attachmentHref)).status()).toBe(404);
});

test("only PDFs and photos can be attached", async ({ page }) => {
  const carId = await addCar(page, "CO-MP 6");
  await page.goto(`/cars/${carId}`);
  const dialog = await recordCompletion(page, "UVV inspection", { files: [textFile()] });
  await expect(dialog.getByTestId("completion-error")).toContainText("Only PDFs and photos");
});

test("viewers see completions and files; drivers and other organizations don't", async ({ page, browser }) => {
  const carId = await addCar(page, "CO-MP 7");
  await page.goto(`/cars/${carId}`);
  await recordCompletion(page, "UVV inspection", { files: [pdf("secret.pdf")] });
  await openHistory(intervalRow(page, "UVV inspection"));
  const href = (await page.getByTestId("attachment-link").getAttribute("href"))!;

  const viewer = await addMember(browser, page, "viewer");
  await viewer.page.goto(`/cars/${carId}`);
  await openHistory(intervalRow(viewer.page, "UVV inspection"));
  await expect(viewer.page.getByTestId("attachment-link")).toHaveText("secret.pdf");
  await expect(viewer.page.getByRole("button", { name: /Record completion|Edit completion/ })).toHaveCount(0);
  expect((await viewer.context.request.get(href)).ok()).toBe(true);

  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name);
  await driver.page.goto(`/cars/${carId}`);
  await expect(driver.page.getByTestId("completion-history")).toHaveCount(0);
  expect((await driver.context.request.get(href)).status()).toBe(404);

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await setupOrganization(otherPage, browser);
  expect((await other.request.get(href)).status()).toBe(404);
  await other.close();
  await viewer.context.close();
  await driver.context.close();
});

test("deleting a car deletes its files", async ({ page }) => {
  const carId = await addCar(page, "CO-MP 8");
  await page.goto(`/cars/${carId}`);
  await recordCompletion(page, "UVV inspection", { files: [pdf()] });
  await openHistory(intervalRow(page, "UVV inspection"));
  const href = (await page.getByTestId("attachment-link").getAttribute("href"))!;
  await page.goto("/cars");
  await deleteCar(page, "CO-MP 8");
  expect((await page.request.get(href)).status()).toBe(404);
});
