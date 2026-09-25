import { expect, test } from "@playwright/test";
import { addCar, assignDriver } from "./helpers/cars";
import { saveContract } from "./helpers/contracts";
import { inDays, inMonths } from "./helpers/dates";
import { pdf } from "./helpers/files";
import { displayDate } from "./helpers/format";
import { addMember, setupOrganization } from "./helpers/org";

test.beforeEach(async ({ page, browser }) => {
  await setupOrganization(page, browser);
});

test("a leased car records its contract, services and documents", async ({ page }) => {
  const carId = await addCar(page, "LE-AS 1");
  await page.goto(`/cars/${carId}`);
  await expect(page.getByTestId("contract")).toContainText("No contract details yet.");

  await saveContract(page, {
    kind: "leased",
    fields: {
      Lessor: "Leasing Bank AG",
      "Contract number": "L-4711",
      Start: "2025-01-15",
      "Term (months)": "36",
      "Monthly rate (EUR)": "349,00",
      "Down payment (EUR)": "2500",
    },
    services: ["Maintenance and wear", "Tyres"],
    files: [pdf("lease.pdf")],
  });
  const contract = page.getByTestId("contract");
  await expect(contract.getByTestId("contract-kind")).toHaveText("Leased");
  await expect(contract).toContainText("Leasing Bank AG");
  await expect(contract).toContainText("L-4711");
  await expect(contract).toContainText(displayDate("2028-01-14"));
  await expect(contract).toContainText("€349.00");
  await expect(contract).toContainText("€2,500.00");
  await expect(contract).toContainText("Maintenance and wear, Tyres");
  await expect(contract.getByTestId("attachment-link")).toHaveText("lease.pdf");

  await page.goto("/cars");
  await expect(page.getByTestId("car-contract")).toHaveText(`Leased · until ${displayDate("2028-01-14")}`);
});

test("changing how a car is held replaces the details", async ({ page }) => {
  const carId = await addCar(page, "LE-AS 2");
  await page.goto(`/cars/${carId}`);
  await saveContract(page, { kind: "leased", fields: { Lessor: "Old Lessor" } });
  await saveContract(page, { kind: "owned", fields: { "Purchased on": "2026-02-01", "Purchase price (EUR)": "31000" } });
  const contract = page.getByTestId("contract");
  await expect(contract.getByTestId("contract-kind")).toHaveText("Owned");
  await expect(contract).toContainText("€31,000.00");
  await expect(contract).not.toContainText("Old Lessor");
  await expect(contract.getByTestId("contract-level")).toHaveCount(0);

  await saveContract(page, {
    kind: "financed",
    fields: { Lender: "Auto Bank", Start: "2026-01-01", "Term (months)": "48", "Balloon payment (EUR)": "9999,99" },
  });
  await expect(contract).toContainText("Auto Bank");
  await expect(contract).toContainText("€9,999.99");
});

test("contracts show as ending soon inside the alert window and overdue once ended", async ({ page }) => {
  const soon = await addCar(page, "EN-D 1");
  await page.goto(`/cars/${soon}`);
  // Started 34 months ago with a 36-month term: ends in about two months.
  await saveContract(page, { kind: "leased", fields: { Start: inMonths(-34), "Term (months)": "36" } });
  await expect(page.getByTestId("contract-level")).toHaveAttribute("data-level", "soon");
  await expect(page.getByTestId("contract-ending")).toContainText("The contract ends in");

  const later = await addCar(page, "EN-D 2");
  await page.goto(`/cars/${later}`);
  await saveContract(page, { kind: "rented", fields: { Start: inMonths(-1), End: inMonths(12), "Alert before the end (months)": "3" } });
  await expect(page.getByTestId("contract-level")).toHaveAttribute("data-level", "ok");

  const ended = await addCar(page, "EN-D 3");
  await page.goto(`/cars/${ended}`);
  await saveContract(page, { kind: "rented", fields: { Start: inMonths(-12), End: inDays(-1) } });
  await expect(page.getByTestId("contract-level")).toHaveAttribute("data-level", "overdue");
});

test("drivers only see the contract end; viewers see everything", async ({ page, browser }) => {
  const carId = await addCar(page, "DR-CO 1");
  await page.goto(`/cars/${carId}`);
  await saveContract(page, {
    kind: "leased",
    fields: { Lessor: "Secret Bank", Start: "2025-06-01", "Term (months)": "24", "Monthly rate (EUR)": "299" },
    files: [pdf()],
  });
  const href = (await page.getByTestId("attachment-link").getAttribute("href"))!;

  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, carId, driver.account.name);
  await driver.page.goto(`/cars/${carId}`);
  await expect(driver.page.getByTestId("driver-contract-end")).toHaveText(`Contract ends ${displayDate("2027-05-31")}.`);
  await expect(driver.page.getByText("Secret Bank")).toHaveCount(0);
  await expect(driver.page.getByText("€299.00")).toHaveCount(0);
  expect((await driver.context.request.get(href)).status()).toBe(404);

  const viewer = await addMember(browser, page, "viewer");
  await viewer.page.goto(`/cars/${carId}`);
  await expect(viewer.page.getByTestId("contract")).toContainText("Secret Bank");
  await expect(viewer.page.getByRole("button", { name: /contract/i })).toHaveCount(0);
  expect((await viewer.context.request.get(href)).ok()).toBe(true);
  await driver.context.close();
  await viewer.context.close();
});
