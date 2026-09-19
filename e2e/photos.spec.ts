import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { addCar, deleteCar } from "./helpers/cars";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

async function testImage(color: { r: number; g: number; b: number }) {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: color } })
    .png()
    .toBuffer();
}

async function upload(page: Page, name: string, buffer: Buffer, mimeType = "image/png") {
  await page.getByLabel(/Add photo|Change photo/).setInputFiles({ name, mimeType, buffer });
}

async function photoSrc(page: Page) {
  return (await page.getByTestId("car-photo").getAttribute("src"))!;
}

test.beforeEach(async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Snapper ${Date.now()}-${Math.random()}`);
});

test("add, replace and remove a car photo", async ({ page }) => {
  const carId = await addCar(page, "Photogenic");
  await page.goto(`/cars/${carId}`);
  await expect(page.getByTestId("car-photo-placeholder")).toBeVisible();

  await upload(page, "red.png", await testImage({ r: 200, g: 30, b: 30 }));
  const photo = page.getByTestId("car-photo");
  await expect(photo).toBeVisible();
  const firstSrc = await photoSrc(page);
  const first = await page.request.get(firstSrc);
  expect(first.ok()).toBe(true);
  expect(first.headers()["content-type"]).toBe("image/webp");
  const original = await page.request.get(`/cars/${carId}/photo?variant=original`);
  expect(original.headers()["content-type"]).toBe("image/png");
  const display = await sharp(await first.body()).metadata();
  expect(display.width! / display.height!).toBeCloseTo(640 / 480, 2);
  const thumb = await sharp(
    await (await page.request.get(`/cars/${carId}/photo?variant=thumb`)).body(),
  ).metadata();
  expect([thumb.width, thumb.height]).toEqual([192, 128]);

  await page.goto("/cars");
  await expect(page.getByTestId("car-thumb")).toBeVisible();

  await page.goto(`/cars/${carId}`);
  await upload(page, "blue.png", await testImage({ r: 30, g: 30, b: 200 }));
  await expect.poll(() => photoSrc(page)).not.toBe(firstSrc);
  const replaced = await page.request.get(await photoSrc(page));
  const { dominant } = await sharp(await replaced.body()).stats();
  expect(dominant.b).toBeGreaterThan(dominant.r);

  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByTestId("car-photo-placeholder")).toBeVisible();
  expect((await page.request.get(`/cars/${carId}/photo`)).status()).toBe(404);
  await page.goto("/cars");
  await expect(page.getByTestId("car-thumb")).toHaveCount(0);
});

test("a file that is not an image is rejected", async ({ page }) => {
  const carId = await addCar(page, "Picky");
  await page.goto(`/cars/${carId}`);
  await upload(page, "notes.txt", Buffer.from("definitely not a picture"), "text/plain");
  await expect(page.getByTestId("photo-error")).toContainText("not an image");
  await expect(page.getByTestId("car-photo-placeholder")).toBeVisible();
});

test("photos are private to their owner", async ({ page, browser }) => {
  const carId = await addCar(page, "Private");
  await page.goto(`/cars/${carId}`);
  expect((await page.request.get(`/cars/${carId}/photo`)).status()).toBe(404);
  await upload(page, "grey.png", await testImage({ r: 120, g: 120, b: 120 }));
  await expect(page.getByTestId("car-photo")).toBeVisible();
  expect((await page.request.get(`/cars/${carId}/photo`)).ok()).toBe(true);

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await enableVirtualPasskeys(otherPage);
  await signUp(otherPage, `Peeker ${Date.now()}`);
  expect((await otherContext.request.get(`/cars/${carId}/photo`)).status()).toBe(404);
  await otherContext.close();

  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(`/cars/${carId}/photo`)).status()).toBe(401);
  await anonymous.close();
});

test("deleting a car deletes its photo", async ({ page }) => {
  const carId = await addCar(page, "Doomed");
  await page.goto(`/cars/${carId}`);
  await upload(page, "green.png", await testImage({ r: 30, g: 160, b: 30 }));
  await expect(page.getByTestId("car-photo")).toBeVisible();

  await page.goto("/cars");
  await deleteCar(page, "Doomed");
  expect((await page.request.get(`/cars/${carId}/photo`)).status()).toBe(404);
});
