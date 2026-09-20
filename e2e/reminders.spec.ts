import { expect, test, type Page } from "@playwright/test";
import { addCar } from "./helpers/cars";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

const DAY_MS = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

async function addReading(page: Page, odometer: number, date: string) {
  const rows = page.getByTestId("entries").locator("tbody tr");
  const before = await rows.count();
  await page.getByLabel(/Odometer/).fill(String(odometer));
  await page.getByLabel("Date").fill(date);
  await page.getByRole("button", { name: "Add reading" }).click();
  await expect(rows).toHaveCount(before + 1);
}

async function addReminder(page: Page, title: string, { odometer, date }: { odometer?: number; date?: string }) {
  await page.getByRole("button", { name: "Add reminder" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(title);
  if (odometer !== undefined) await dialog.getByLabel(/At odometer/).fill(String(odometer));
  if (date) await dialog.getByLabel("By date").fill(date);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
}

const reminder = (page: Page, title: string) =>
  page.getByTestId("reminder").filter({ hasText: title });

test.beforeEach(async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Planner ${Date.now()}-${Math.random()}`);
});

test("reminders show remaining distance, an estimate and days left", async ({ page }) => {
  const carId = await addCar(page, "Golf");
  await page.goto(`/cars/${carId}`);
  await addReading(page, 40000, inDays(-30));
  await addReading(page, 40600, inDays(0)); // 20 km/day

  await addReminder(page, "Service", { odometer: 42600 });
  await expect(reminder(page, "Service")).toContainText(/2,000\s*km to go/);
  await expect(reminder(page, "Service")).toContainText("≈");
  await expect(reminder(page, "Service")).toHaveAttribute("data-level", "ok");

  await addReminder(page, "Inspection", { date: inDays(45) });
  await expect(reminder(page, "Inspection")).toContainText("45 days left");
  await expect(reminder(page, "Inspection")).toHaveAttribute("data-level", "ok");

  await addReminder(page, "Tyres", { odometer: 41000, date: inDays(400) });
  await expect(reminder(page, "Tyres")).toContainText(/400\s*km to go/);
  await expect(reminder(page, "Tyres")).toContainText("Due soon");
  await expect(reminder(page, "Tyres")).toHaveAttribute("data-level", "soon");

  await addReminder(page, "Oil", { odometer: 40500 });
  await expect(reminder(page, "Oil")).toContainText("Overdue");
  await expect(reminder(page, "Oil")).toHaveAttribute("data-level", "overdue");
});

test("a reminder needs a title and at least one target", async ({ page }) => {
  const carId = await addCar(page, "Polo");
  await page.goto(`/cars/${carId}`);
  await page.getByRole("button", { name: "Add reminder" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Something");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("reminder-error")).toContainText("distance target, a date target, or both");
  await dialog.getByLabel("By date").fill(inDays(10));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(reminder(page, "Something")).toContainText("10 days left");
});

test("reminders can be edited, completed and deleted", async ({ page }) => {
  const carId = await addCar(page, "Up");
  await page.goto(`/cars/${carId}`);
  await addReminder(page, "Brakes", { date: inDays(100) });

  await page.getByRole("button", { name: "Edit Brakes" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Brake pads");
  await dialog.getByLabel("By date").fill(inDays(5));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(reminder(page, "Brake pads")).toContainText("5 days left");
  await expect(reminder(page, "Brake pads")).toContainText("Due soon");

  await page.getByRole("button", { name: "Mark Brake pads as done" }).click();
  await expect(reminder(page, "Brake pads")).toHaveCount(0);
  await expect(page.getByTestId("completed-reminders")).toBeHidden();
  await page.getByText("1 completed").click();
  await expect(page.getByTestId("completed-reminders")).toContainText("Brake pads");

  await page.getByRole("button", { name: "Delete reminder Brake pads" }).click();
  await expect(page.getByText("1 completed")).toHaveCount(0);
});

test("the car list flags cars with a due or overdue reminder", async ({ page }) => {
  const carId = await addCar(page, "Flagged");
  await addCar(page, "Quiet");
  await page.goto(`/cars/${carId}`);
  await addReminder(page, "TÜV", { date: inDays(-3) });

  await page.goto("/cars");
  const flagged = page.getByRole("listitem").filter({ hasText: "Flagged" });
  await expect(flagged.getByTestId("reminder-marker")).toHaveAttribute("data-level", "overdue");
  await expect(page.getByRole("listitem").filter({ hasText: "Quiet" }).getByTestId("reminder-marker")).toHaveCount(0);
});

test("another user cannot see or change a car's reminders", async ({ page, browser }) => {
  const carId = await addCar(page, "Mine");
  await page.goto(`/cars/${carId}`);
  await addReminder(page, "Secret", { date: inDays(3) });

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await enableVirtualPasskeys(otherPage);
  await signUp(otherPage, `Intruder ${Date.now()}`);
  const response = await otherPage.goto(`/cars/${carId}`);
  expect(response?.status()).toBe(404);
  await expect(otherPage.getByText("Secret")).toHaveCount(0);
  await other.close();
});
