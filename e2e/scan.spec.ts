import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { addCar } from "./helpers/cars";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

// A stylised instrument cluster: time, date and trip distance compete with
// the total odometer, all as light text on a dark, textured background.
async function dashboardPhoto(total: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2000">
    <rect width="1500" height="2000" fill="#15171b"/>
    <rect x="0" y="0" width="1500" height="700" fill="#2a2d33"/>
    <rect x="0" y="1300" width="1500" height="700" fill="#5b5f66"/>
    <rect x="180" y="780" width="1140" height="420" rx="40" fill="#0b0c0e"/>
    <rect x="240" y="830" width="220" height="220" rx="24" fill="#b3122f"/>
    <rect x="900" y="830" width="220" height="220" rx="24" fill="#b3122f"/>
    <g font-family="sans-serif" fill="#f4f4f4">
      <text x="300" y="890" font-size="34" font-weight="bold">19:51</text>
      <text x="290" y="930" font-size="26">20.09.2026</text>
      <text x="300" y="1000" font-size="30">0:43 h</text>
      <text x="960" y="905" font-size="36" font-weight="bold">${total} <tspan font-size="24">km</tspan></text>
      <text x="960" y="945" font-size="26">Gesamt</text>
      <text x="960" y="1010" font-size="34" font-weight="bold">50 <tspan font-size="24">km</tspan></text>
      <text x="960" y="1045" font-size="24">Fahrstrecke</text>
    </g>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

test.beforeEach(async ({ page }) => {
  await enableVirtualPasskeys(page);
  await signUp(page, `Scanner ${Date.now()}-${Math.random()}`);
});

test("scanning a dashboard photo prefills the total odometer", async ({ page }) => {
  test.setTimeout(120_000);
  const carId = await addCar(page, "Golf");
  await page.goto(`/cars/${carId}`);

  await page.getByLabel("Scan odometer").setInputFiles({
    name: "dash.jpg",
    mimeType: "image/jpeg",
    buffer: await dashboardPhoto("48732"),
  });
  await expect(page.getByTestId("scan-result")).toContainText("48,732 km", { timeout: 90_000 });
  await expect(page.getByLabel(/Odometer/)).toHaveValue("48732");

  await page.getByRole("button", { name: "Add reading" }).click();
  await expect(page.getByTestId("entries").locator("tbody tr").first()).toContainText("48,732 km");
});

test("a photo without a readable mileage says so and leaves the field alone", async ({ page }) => {
  test.setTimeout(120_000);
  const carId = await addCar(page, "Blank");
  await page.goto(`/cars/${carId}`);
  const blank = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#222" } })
    .jpeg()
    .toBuffer();
  await page.getByLabel("Scan odometer").setInputFiles({ name: "blank.jpg", mimeType: "image/jpeg", buffer: blank });
  await expect(page.getByTestId("scan-result")).toContainText("Couldn't find", { timeout: 90_000 });
  await expect(page.getByLabel(/Odometer/)).toHaveValue("");
});
