import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { addCar, assignDriver } from "./helpers/cars";
import { pdf } from "./helpers/files";
import { addMember, memberRow, setupOrganization } from "./helpers/org";

async function photo(name = "dent.jpg") {
  const buffer = await sharp({ create: { width: 80, height: 60, channels: 3, background: { r: 180, g: 40, b: 40 } } })
    .jpeg()
    .toBuffer();
  return { name, mimeType: "image/jpeg", buffer };
}

async function reportDamage(page: Page, description: string, files?: Awaited<ReturnType<typeof photo>>[]) {
  await page.getByRole("button", { name: "Report damage" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What happened?").fill(description);
  if (files) await dialog.getByLabel("Photos (optional)").setInputFiles(files);
  await dialog.getByRole("button", { name: "Send report" }).click();
  return dialog;
}

const report = (page: Page, text: string) => page.getByTestId("damage-report").filter({ hasText: text });

test("a driver reports damage, the admin resolves it, the driver sees the outcome", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "DA-MG 1");
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name);

  await driver.page.goto(`/cars/${carId}`);
  const dialog = await reportDamage(driver.page, "Dent in the driver's door", [await photo()]);
  await expect(dialog).toBeHidden();
  const mine = report(driver.page, "Dent in the driver's door");
  await expect(mine).toHaveAttribute("data-status", "open");
  const photoHref = (await mine.getByTestId("damage-photo").getAttribute("href"))!;
  expect((await driver.context.request.get(photoHref)).ok()).toBe(true);

  await page.goto("/damage");
  const open = report(page, "Dent in the driver's door");
  await expect(open).toContainText("DA-MG 1");
  await expect(open).toContainText(`reported by ${driver.account.name}`);
  await open.getByLabel("Resolution note").fill("Repaired at the body shop");
  await open.getByRole("button", { name: "Resolve" }).click();
  await expect(page.getByText("No open damage reports.")).toBeVisible();

  await driver.page.reload();
  await expect(mine).toHaveAttribute("data-status", "resolved");
  await expect(mine.getByTestId("damage-resolution")).toContainText("Repaired at the body shop");
  await driver.context.close();
});

test("drivers see only their own reports and photos", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "DA-MG 2");
  const anna = await addMember(browser, page, "driver");
  const ben = await addMember(browser, page, "driver");
  await assignDriver(page, carId, anna.account.name);
  await assignDriver(page, carId, ben.account.name);

  await page.goto(`/cars/${carId}`);
  await reportDamage(page, "Reported by phone", [await photo("phone.jpg")]);
  await expect(report(page, "Reported by phone")).toBeVisible();
  const adminPhoto = (await report(page, "Reported by phone").getByTestId("damage-photo").getAttribute("href"))!;

  await anna.page.goto(`/cars/${carId}`);
  await reportDamage(anna.page, "Cracked mirror");
  await expect(report(anna.page, "Cracked mirror")).toBeVisible();
  await expect(report(anna.page, "Reported by phone")).toHaveCount(0);
  expect((await anna.context.request.get(adminPhoto)).status()).toBe(404);

  await ben.page.goto(`/cars/${carId}`);
  await expect(ben.page.getByText("No damage reported.")).toBeVisible();
  await anna.context.close();
  await ben.context.close();
});

test("viewers follow damage read-only; reporters keep their name", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "DA-MG 3");
  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name);
  await driver.page.goto(`/cars/${carId}`);
  await reportDamage(driver.page, "Flat tyre");
  await expect(report(driver.page, "Flat tyre")).toBeVisible();

  await page.goto("/team");
  await memberRow(page, driver.account.email).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(memberRow(page, driver.account.email)).toHaveCount(0);

  const viewer = await addMember(browser, page, "viewer");
  await viewer.page.goto("/damage");
  await expect(report(viewer.page, "Flat tyre")).toContainText(`reported by ${driver.account.name}`);
  await expect(viewer.page.getByRole("button", { name: "Resolve" })).toHaveCount(0);
  await viewer.page.goto(`/cars/${carId}`);
  await expect(viewer.page.getByRole("button", { name: "Report damage" })).toHaveCount(0);
  await viewer.context.close();
  await driver.context.close();
});

test("only photos can be attached to a damage report", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "DA-MG 4");
  await page.goto(`/cars/${carId}`);
  const dialog = await reportDamage(page, "Scratch", [pdf() as Awaited<ReturnType<typeof photo>>]);
  await expect(dialog.getByTestId("damage-error")).toContainText("Only photos");
});
