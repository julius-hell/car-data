import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// Tests run against a production build. Two servers share the build and the
// database: the main one sends email to Mailpit, the second has no SMTP and
// covers the copy-the-link fallback. Point PLAYWRIGHT_BASE_URL at an already
// running server (e.g. the docker compose app on :3000) to reuse it.
const port = 3100;
const noEmailPort = 3101;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const noEmailURL = process.env.PLAYWRIGHT_NO_EMAIL_URL ?? `http://localhost:${noEmailPort}`;
process.env.BETTER_AUTH_URL = baseURL;
// Shared with the workers so every process derives the same operator email.
process.env.TEST_RUN_ID ??= String(Date.now());
process.env.MAILPIT_URL ??= "http://localhost:8025";
process.env.DIGEST_SECRET ??= "test-digest-secret";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // Creates the operator through the real CLI and saves their session.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /no-email\.spec\.ts/,
    },
    {
      name: "no-email",
      use: { ...devices["Desktop Chrome"], baseURL: noEmailURL },
      dependencies: ["setup"],
      testMatch: /no-email\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: `pnpm build && (SMTP_HOST= BETTER_AUTH_URL=${noEmailURL} pnpm start -p ${noEmailPort} & pnpm start -p ${port})`,
      url: baseURL,
      env: {
        BETTER_AUTH_URL: baseURL,
        BETTER_AUTH_RATE_LIMIT: "off",
        SMTP_HOST: "localhost",
        SMTP_PORT: process.env.MAILPIT_SMTP_PORT ?? "1025",
        SMTP_FROM: "Car Data <noreply@example.test>",
        DIGEST_SECRET: process.env.DIGEST_SECRET,
      },
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      // Started by the command above; this entry only waits for it.
      command: "sleep 600",
      url: noEmailURL,
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
});
