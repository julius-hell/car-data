import { expect, test, type Page } from "@playwright/test";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

async function waitForActiveServiceWorker(page: Page) {
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration("/");
        return registration?.active?.state ?? null;
      }),
    )
    .toBe("activated");
  return scope;
}

test("the manifest is served, linked, and its icons resolve", async ({ page, request }) => {
  await page.goto("/login");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("manifest");
  const manifest = await response.json();
  expect(manifest.name).toBe("Car Data");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);

  for (const icon of manifest.icons as { src: string }[]) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok(), icon.src).toBe(true);
    expect(iconResponse.headers()["content-type"]).toBe("image/png");
  }

  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(appleIcon).toBeTruthy();
  expect((await request.get(appleIcon!)).ok()).toBe(true);
});

test("the service worker registers at the root scope and activates", async ({ page }) => {
  await page.goto("/login");
  const scope = await waitForActiveServiceWorker(page);
  expect(new URL(scope).pathname).toBe("/");
});

test("a visited page reloads offline to the app shell or the offline fallback", async ({
  page,
  context,
}) => {
  await enableVirtualPasskeys(page, { serviceWorker: true });
  await signUp(page, `Roamer ${Date.now()}`);
  await waitForActiveServiceWorker(page);
  await page.goto("/cars");
  await expect(page.getByRole("heading", { name: "Your cars" })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(
    page
      .getByRole("heading", { name: "Your cars" })
      .or(page.getByRole("heading", { name: "You are offline" })),
  ).toBeVisible();
  await context.setOffline(false);
});
