import { expect, test } from "@playwright/test";
import { addCar, deleteCar, fillCarForm, tryAddCar } from "./helpers/cars";
import { addMember, setupOrganization } from "./helpers/org";

test.beforeEach(async ({ page, browser }) => {
  await setupOrganization(page, browser);
});

const fleetCar = (page: import("@playwright/test").Page, plate: string) =>
  page.locator(`[data-testid="fleet-car"][data-plate="${plate}"]`);

test("a new organization is prompted to add its first car", async ({ page }) => {
  await expect(page.getByText("Add your first car")).toBeVisible();
});

test("cars are added with their details and labelled by licence plate", async ({ page }) => {
  const carId = await addCar(page, "m -ab  1234", {
    make: "Ford",
    model: "Transit",
    vin: "wf0xxxttgxkr12345",
    firstRegistration: "2024-03-15",
    costCenter: "4711",
    location: "München",
  });
  const row = fleetCar(page, "M-AB 1234");
  await expect(row).toContainText("Ford Transit");
  await expect(row).toContainText("München · 4711");
  await expect(row).toContainText("km");

  await row.getByRole("link").click();
  await expect(page).toHaveURL(`/cars/${carId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("M-AB 1234");
  await expect(page.getByTestId("car-make-model")).toHaveText("Ford Transit");
  await expect(page.getByTestId("car-vin")).toHaveText("WF0XXXTTGXKR12345");
  await expect(page.getByTestId("car-costCenter")).toHaveText("4711");
  await expect(page.getByTestId("car-location")).toHaveText("München");
});

test("licence plates are unique within an organization only", async ({ page, browser }) => {
  await addCar(page, "B-XY 99");
  const dialog = await tryAddCar(page, "b-xy 99");
  await expect(dialog.getByTestId("car-error")).toHaveText("A car with this licence plate already exists.");

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await setupOrganization(otherPage, browser);
  await addCar(otherPage, "B-XY 99");
  await other.close();
});

test("invalid details are rejected", async ({ page }) => {
  let dialog = await tryAddCar(page, "K-VIN 1", { vin: "TOO-SHORT" });
  await expect(dialog.getByTestId("car-error")).toContainText("17 letters and digits");
  dialog = await tryAddCar(page, "K-MK 1", { make: " " });
  await expect(dialog.getByTestId("car-error")).toHaveText("Enter the make.");
  dialog = await tryAddCar(page, "", {});
  await expect(dialog.getByTestId("car-error")).toContainText("Enter a licence plate");
});

test("admins edit a car's details", async ({ page }) => {
  const carId = await addCar(page, "HH-ED 1");
  await page.goto(`/cars/${carId}`);
  await page.getByRole("button", { name: "Edit" }).click();
  await fillCarForm(page, "HH-ED 2", { model: "Polo", location: "Hamburg" });
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("HH-ED 2");
  await expect(page.getByTestId("car-make-model")).toHaveText("Volkswagen Polo");
  await expect(page.getByTestId("car-location")).toHaveText("Hamburg");
});

test("retired cars leave the fleet list and can be reactivated", async ({ page }) => {
  const carId = await addCar(page, "S-RT 1");
  await addCar(page, "S-RT 2");
  await page.goto(`/cars/${carId}`);
  await page.getByRole("button", { name: "Retire" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Retired on").fill("2026-06-30");
  await dialog.getByLabel("Reason").selectOption("sold");
  await dialog.getByRole("button", { name: "Retire car" }).click();
  await expect(page.getByTestId("car-retired")).toContainText("sold");

  await page.goto("/cars");
  await expect(fleetCar(page, "S-RT 1")).toHaveCount(0);
  await expect(fleetCar(page, "S-RT 2")).toBeVisible();
  await page.getByRole("link", { name: "1 retired car" }).click();
  const retired = page.locator('[data-testid="retired-car"][data-plate="S-RT 1"]');
  await expect(retired).toContainText("sold");

  await retired.getByRole("button", { name: "Reactivate" }).click();
  await expect(retired).toHaveCount(0);
  await page.goto("/cars");
  await expect(fleetCar(page, "S-RT 1")).toBeVisible();
});

test("deleting a car asks for confirmation first", async ({ page }) => {
  await addCar(page, "PA-ND 4");
  await page.getByRole("button", { name: "Delete PA-ND 4" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Delete PA-ND 4?");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(fleetCar(page, "PA-ND 4")).toBeVisible();

  await deleteCar(page, "PA-ND 4");
  await expect(page.getByText("Add your first car")).toBeVisible();
});

test("the fleet list filters by location and cost center", async ({ page }) => {
  await addCar(page, "F-A 1", { location: "Berlin", costCenter: "100" });
  await addCar(page, "F-A 2", { location: "Berlin", costCenter: "200" });
  await addCar(page, "F-A 3", { location: "Köln", costCenter: "100" });

  await page.goto("/cars");
  await page.getByLabel("Location").selectOption("Berlin");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByTestId("fleet-car")).toHaveCount(2);

  await page.getByLabel("Cost center").selectOption("100");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByTestId("fleet-car")).toHaveCount(1);
  await expect(fleetCar(page, "F-A 1")).toBeVisible();

  await page.getByRole("link", { name: "Reset" }).click();
  await expect(page.getByTestId("fleet-car")).toHaveCount(3);
});

test("viewers see the fleet and retired cars read-only", async ({ page, browser }) => {
  const carId = await addCar(page, "V-IEW 1");
  const viewer = await addMember(browser, page, "viewer");
  await viewer.page.goto(`/cars/${carId}`);
  await expect(viewer.page.getByRole("heading", { level: 1 })).toHaveText("V-IEW 1");
  for (const name of ["Edit", "Retire", /Delete/]) {
    await expect(viewer.page.getByRole("button", { name })).toHaveCount(0);
  }
  await viewer.context.close();
});
