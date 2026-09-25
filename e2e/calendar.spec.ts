import { expect, test, type Page } from "@playwright/test";
import { addCar, assignDriver } from "./helpers/cars";
import { saveContract } from "./helpers/contracts";
import { displayMonth, inDays, inMonths, monthOf } from "./helpers/dates";
import { intervalRow } from "./helpers/intervals";
import { addMember, memberRow, pathOf, setupOrganization } from "./helpers/org";

async function feedUrl(page: Page) {
  await page.goto("/settings");
  return pathOf(await page.getByTestId("calendar-url").inputValue());
}

// SUMMARY and DTSTART of every event, unfolded.
function events(ics: string) {
  const unfolded = ics.replace(/\r\n /g, "");
  return [...unfolded.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)].map(([block]) => ({
    summary: block.match(/SUMMARY:(.*)/)![1].replace(/\\([,;\\])/g, "$1"),
    start: block.match(/DTSTART;VALUE=DATE:(\d{8})/)![1],
  }));
}

const compact = (iso: string) => iso.replaceAll("-", "");

test("members subscribe to the due dates they may see", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const assigned = await addCar(page, "CA-L 1", { nextHu: monthOf(inMonths(5)), nextUvv: inDays(40) });
  await addCar(page, "CA-L 2", { nextHu: monthOf(inMonths(7)) });
  await page.goto(`/cars/${assigned}`);
  await saveContract(page, { kind: "rented", fields: { Start: inMonths(-2), End: inMonths(10), "Monthly rate (EUR)": "499" } });

  const driver = await addMember(browser, page, "driver");
  await assignDriver(page, assigned, driver.account.name);
  await page.goto("/team");
  await memberRow(page, driver.account.email).getByRole("link", { name: driver.account.name }).click();
  const licence = intervalRow(page, "Licence check");
  await licence.getByRole("button", { name: "Edit Licence check" }).click();
  await page.getByRole("dialog").getByLabel("Next due", { exact: true }).fill(inDays(60));
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(licence).toHaveAttribute("data-level", "ok");

  const response = await page.request.get(await feedUrl(page));
  expect(response.headers()["content-type"]).toContain("text/calendar");
  const ics = await response.text();
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).not.toContain("499");
  const adminEvents = events(ics);
  expect(adminEvents).toContainEqual({
    summary: `HU/AU due in ${displayMonth(inMonths(5))} · CA-L 1`,
    start: compact(`${monthOf(inMonths(5))}-01`),
  });
  expect(adminEvents).toContainEqual({ summary: "UVV inspection · CA-L 1", start: compact(inDays(40)) });
  expect(adminEvents).toContainEqual({ summary: "Contract end · CA-L 1", start: compact(inMonths(10)) });
  expect(adminEvents).toContainEqual({ summary: `Licence check · ${driver.account.name}`, start: compact(inDays(60)) });
  expect(adminEvents.some((e) => e.summary.includes("CA-L 2"))).toBe(true);

  const driverEvents = events(await (await driver.context.request.get(await feedUrl(driver.page))).text());
  expect(driverEvents.some((e) => e.summary.includes("CA-L 1"))).toBe(true);
  expect(driverEvents.some((e) => e.summary.includes("CA-L 2"))).toBe(false);
  expect(driverEvents).toContainEqual({ summary: `Licence check · ${driver.account.name}`, start: compact(inDays(60)) });

  const viewer = await addMember(browser, page, "viewer");
  const viewerEvents = events(await (await viewer.context.request.get(await feedUrl(viewer.page))).text());
  expect(viewerEvents.some((e) => e.summary.includes("CA-L 2"))).toBe(true);
  expect(viewerEvents.some((e) => e.summary.startsWith("Licence check"))).toBe(false);
  await driver.context.close();
  await viewer.context.close();
});

test("a new address replaces the old one, and removed members' feeds stop", async ({ page, browser }) => {
  await setupOrganization(page, browser);
  const first = await feedUrl(page);
  expect((await page.request.get(first)).ok()).toBe(true);
  await page.getByRole("button", { name: "New address" }).click();
  await expect(page.getByTestId("calendar-url")).not.toHaveValue(new RegExp(first));
  const second = pathOf(await page.getByTestId("calendar-url").inputValue());
  expect((await page.request.get(first)).status()).toBe(404);
  expect((await page.request.get(second)).ok()).toBe(true);

  const driver = await addMember(browser, page, "driver");
  const driverFeed = await feedUrl(driver.page);
  expect((await page.request.get(driverFeed)).ok()).toBe(true);
  await page.goto("/team");
  await memberRow(page, driver.account.email).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(memberRow(page, driver.account.email)).toHaveCount(0);
  expect((await page.request.get(driverFeed)).status()).toBe(404);
  await driver.context.close();
});
