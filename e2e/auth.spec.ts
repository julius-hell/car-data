import { expect, test } from "@playwright/test";
import { enableVirtualPasskeys, signUp } from "./helpers/passkey";

test("a signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("button", { name: "Sign in with passkey" }),
  ).toBeVisible();
});

test("the login page arms passkey autofill when the browser supports it", async ({
  page,
}) => {
  // No virtual authenticator here, so the armed request cannot auto-complete.
  await page.addInitScript(() => {
    PublicKeyCredential.isConditionalMediationAvailable = async () => true;
  });
  const autofillOptions = page.waitForRequest((request) =>
    request.url().includes("/passkey/generate-authenticate-options"),
  );
  await page.goto("/login");
  await autofillOptions;
  await expect(page.getByLabel("Passkey autofill")).toHaveAttribute(
    "autocomplete",
    "username webauthn",
  );
});

test("sign up with a passkey, sign out, sign back in", async ({ page }) => {
  await enableVirtualPasskeys(page);
  const name = `Alice ${Date.now()}`;

  await signUp(page, name);
  await expect(page.getByRole("banner")).toContainText(name);

  await page.goto("/login");
  await expect(page).toHaveURL("/cars");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await page.goto("/");
  await expect(page).toHaveURL("/login");

  await page.getByRole("button", { name: "Sign in with passkey" }).click();
  await expect(page).toHaveURL("/cars");
  await expect(page.getByRole("banner")).toContainText(name);
});

test("a failed passkey ceremony shows an error and leaves the visitor signed out", async ({
  page,
}) => {
  // The server requires resident keys, so this authenticator cannot complete.
  await enableVirtualPasskeys(page, { hasResidentKey: false });

  await page.goto("/login");
  await page.getByLabel("Name").fill("Nobody");
  await page.getByRole("button", { name: "Create account with passkey" }).click();

  await expect(page.getByTestId("auth-error")).toBeVisible();
  await expect(page).toHaveURL("/login");
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("sign-up requires a name", async ({ page }) => {
  await enableVirtualPasskeys(page);
  await page.goto("/login");
  await page.getByLabel("Name").fill("   ");
  await page.getByRole("button", { name: "Create account with passkey" }).click();
  await expect(page.getByTestId("auth-error")).toHaveText(/enter a name/i);
  await expect(page).toHaveURL("/login");
});
