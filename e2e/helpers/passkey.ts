import type { Page } from "@playwright/test";

// Chrome's virtual authenticator auto-completes conditional-UI (autofill)
// requests, which a real browser never does without the user picking a
// passkey. Turn autofill off so it cannot sign users in behind the test's back.
async function disableConditionalMediation(page: Page) {
  await page.addInitScript(() => {
    PublicKeyCredential.isConditionalMediationAvailable = async () => false;
  });
}

export async function enableVirtualPasskeys(
  page: Page,
  {
    hasResidentKey = true,
    serviceWorker = false,
  }: { hasResidentKey?: boolean; serviceWorker?: boolean } = {},
) {
  // Only the PWA tests need the service worker; keeping it out of the others
  // stops it intercepting their navigations.
  if (!serviceWorker) await page.route("**/serwist/sw.js", (route) => route.abort());
  await disableConditionalMediation(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable", { enableUI: false });
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

export async function signUp(page: Page, name: string) {
  await page.goto("/login");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Create account with passkey" }).click();
  await page.waitForURL("/cars");
}
