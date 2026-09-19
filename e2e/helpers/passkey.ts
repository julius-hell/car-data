import type { Page } from "@playwright/test";

export async function enableVirtualPasskeys(
  page: Page,
  { hasResidentKey = true }: { hasResidentKey?: boolean } = {},
) {
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
  await page.waitForURL("/");
}
