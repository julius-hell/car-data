import { expect, test, type Page } from "@playwright/test";
import { addCar, assignDriver } from "./helpers/cars";
import { saveContract } from "./helpers/contracts";
import { inDays, inMonths, monthOf } from "./helpers/dates";
import { addMember, setupOrganization } from "./helpers/org";

const item = (page: Page, title: string, subject: string) =>
  page
    .getByTestId("due-item")
    .filter({ has: page.getByTestId("due-item-title").getByText(title, { exact: true }) })
    .filter({ has: page.getByTestId("due-item-subject").getByText(subject, { exact: true }) });

const count = (page: Page, level: string) => page.getByTestId(`count-${level}`).getByTestId("count-value");

// Every car tracks its intervals with dates far enough ahead to stay quiet.
const quiet = { nextHu: monthOf(inMonths(12)), nextUvv: inDays(200), nextService: inDays(200) };

test("admins land on a dashboard that is clear when nothing is due", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  await addCar(page, "QU-IET 1", quiet);
  await page.goto("/");
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByText("Nothing is overdue or due soon.")).toBeVisible();
  await expect(count(page, "overdue")).toHaveText("0");
});

test("the dashboard lists what needs attention across the fleet, most urgent first", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const overdue = await addCar(page, "UR-G 1", { ...quiet, nextHu: monthOf(inMonths(-1)), location: "Berlin" });
  const soon = await addCar(page, "UR-G 2", { ...quiet, nextUvv: inDays(10), location: "Hamburg" });
  const leased = await addCar(page, "UR-G 3", quiet);
  const retired = await addCar(page, "UR-G 4", { ...quiet, nextHu: monthOf(inMonths(-3)) });

  await page.goto(`/cars/${leased}`);
  await saveContract(page, { kind: "leased", fields: { Start: inMonths(-34), "Term (months)": "36" } });
  await page.getByRole("button", { name: "Report damage" }).click();
  await page.getByRole("dialog").getByLabel("What happened?").fill("Broken tail light");
  await page.getByRole("dialog").getByRole("button", { name: "Send report" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.goto(`/cars/${retired}`);
  await page.getByRole("button", { name: "Retire" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Retire car" }).click();
  await expect(page.getByTestId("car-retired")).toBeVisible();

  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, soon, driver.account.name);

  await page.goto("/dashboard");
  await expect(item(page, "HU/AU", "UR-G 1")).toHaveAttribute("data-level", "overdue");
  await expect(item(page, "UVV inspection", "UR-G 2")).toHaveAttribute("data-level", "soon");
  await expect(item(page, "Contract end", "UR-G 3")).toHaveAttribute("data-level", "soon");
  await expect(item(page, "Damage report", "UR-G 3")).toBeVisible();
  await expect(item(page, "Licence check", driver.account.name)).toHaveAttribute("data-level", "missing");
  await expect(page.getByTestId("due-item").filter({ hasText: "UR-G 4" })).toHaveCount(0);
  await expect(page.getByTestId("due-item").first()).toHaveAttribute("data-level", "overdue");
  await expect(count(page, "overdue")).toHaveText("1");
  await expect(count(page, "soon")).toHaveText("3");
  await expect(count(page, "missing")).toHaveText("2");

  await item(page, "HU/AU", "UR-G 1").click();
  await expect(page).toHaveURL(`/cars/${overdue}`);

  await page.goto("/dashboard");
  await page.getByLabel("Location").selectOption("Hamburg");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByTestId("due-item")).toHaveCount(1);
  await page.getByRole("link", { name: "Reset" }).click();
  await expect(page).toHaveURL("/dashboard");
  await page.getByLabel("Type").selectOption({ label: "Contract end" });
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByTestId("due-item")).toHaveCount(1);
  await expect(item(page, "Contract end", "UR-G 3")).toBeVisible();

  const viewer = await addMember(browser, page, "viewer");
  await expect(viewer.page).toHaveURL("/dashboard");
  await expect(item(viewer.page, "HU/AU", "UR-G 1")).toBeVisible();
  await expect(viewer.page.getByTestId("due-item").filter({ hasText: driver.account.name })).toHaveCount(0);
  await viewer.context.close();
  await driver.context.close();
});

test("a projected allowance overrun shows on the dashboard", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const carId = await addCar(page, "OV-ER 1", quiet);
  await page.goto(`/cars/${carId}`);
  await saveContract(page, {
    kind: "leased",
    fields: { Start: inMonths(-12), "Term (months)": "36", "Km per year": "10000", "Odometer at handover": "0" },
  });
  for (const [odometer, date] of [
    [20_000, inDays(-100)],
    [23_000, inDays(-10)],
  ] as const) {
    await page.getByLabel(/Odometer/).first().fill(String(odometer));
    await page.getByLabel("Date", { exact: true }).fill(date);
    await page.getByRole("button", { name: "Add reading" }).click();
    await expect(page.getByTestId("entries").locator("tbody tr").filter({ hasText: `${odometer.toLocaleString("en")} km` })).toHaveCount(1);
  }
  await page.goto("/dashboard");
  await expect(item(page, "Mileage allowance", "OV-ER 1")).toContainText("km over by the end");
});

test("drivers don't get the dashboard", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const driver = await addMember(browser, page, "driver");
  expect((await driver.page.goto("/dashboard"))?.status()).toBe(404);
  await driver.context.close();
});
