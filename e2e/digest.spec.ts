import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { newAccount } from "./helpers/auth";
import { addCar } from "./helpers/cars";
import { inDays, inMonths, monthOf } from "./helpers/dates";
import { countEmails, linkIn, waitForEmail } from "./helpers/mail";
import { acceptInvitation, createOrganization, setupOrganization } from "./helpers/org";

// An organization whose admin joined through the emailed link, so their
// address is verified and the digest can reach them.
async function verifiedAdmin(page: Page, browser: Browser) {
  const admin = newAccount("admin");
  const organization = await createOrganization(browser, { admin });
  await acceptInvitation(page, linkIn(await waitForEmail(admin.email, { subject: organization.name })));
  return { admin, organization };
}

const trigger = (request: APIRequestContext, secret = process.env.DIGEST_SECRET) =>
  request.post("/api/digest", { headers: { authorization: `Bearer ${secret}` } });

const quiet = { nextHu: monthOf(inMonths(12)), nextUvv: inDays(200), nextService: inDays(200) };

test("admins get a digest of what is overdue or due soon, linking into the app", async ({ page, browser }) => {
  const { admin, organization } = await verifiedAdmin(page, browser);
  await addCar(page, "DI-GE 1", { ...quiet, nextHu: monthOf(inMonths(-1)) });
  await addCar(page, "DI-GE 2", { ...quiet, nextUvv: inDays(5) });

  const response = await trigger(page.request);
  expect(response.ok()).toBe(true);
  const mail = await waitForEmail(admin.email, { subject: "attention" });
  expect(mail.subject).toBe(`2 items need attention at ${organization.name}`);
  expect(mail.text).toContain("Overdue: HU/AU · DI-GE 1");
  expect(mail.text).toContain("Due soon: UVV inspection · DI-GE 2");
  expect(mail.text).toMatch(/\/cars\/[0-9a-f-]{36}/);
});

test("the digest needs the secret", async ({ request }) => {
  expect((await trigger(request, "wrong")).status()).toBe(401);
  expect((await request.post("/api/digest")).status()).toBe(401);
});

test("no digest when nothing is due, when turned off, or without a verified address", async ({ page, browser }) => {
  const quietOrg = await verifiedAdmin(page, browser);
  await addCar(page, "QU-IET 9", quiet);

  const other = await browser.newContext();
  const optedOutPage = await other.newPage();
  const optedOut = await verifiedAdmin(optedOutPage, browser);
  await addCar(optedOutPage, "OP-T 1", { ...quiet, nextHu: monthOf(inMonths(-1)) });
  await optedOutPage.goto("/settings");
  await expect(optedOutPage.getByTestId("digest-state")).toContainText("every Monday");
  await optedOutPage.getByRole("button", { name: "Turn off" }).click();
  await expect(optedOutPage.getByTestId("digest-state")).toHaveText("The weekly digest is turned off.");

  const third = await browser.newContext();
  const unverifiedPage = await third.newPage();
  const unverified = await setupOrganization(unverifiedPage, browser);
  await addCar(unverifiedPage, "UN-V 1", { ...quiet, nextHu: monthOf(inMonths(-1)) });

  expect((await trigger(page.request)).ok()).toBe(true);
  // A digest for anyone else in this run proves the trigger has gone through.
  await page.waitForTimeout(1500);
  for (const email of [quietOrg.admin.email, optedOut.admin.email, unverified.admin.email]) {
    expect(await countEmails(email, "attention")).toBe(0);
  }
  await other.close();
  await third.close();
});

test("the digest is written in the admin's language", async ({ page, browser }) => {
  const { admin } = await verifiedAdmin(page, browser);
  await addCar(page, "SP-R 1", { ...quiet, nextHu: monthOf(inMonths(-1)) });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Deutsch" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");

  await trigger(page.request);
  const mail = await waitForEmail(admin.email, { subject: "Aufmerksamkeit" });
  expect(mail.text).toContain("Überfällig: HU/AU · SP-R 1");
});
