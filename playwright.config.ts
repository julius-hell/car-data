import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// Tests run against a production build. Point PLAYWRIGHT_BASE_URL at an
// already running server (e.g. the docker compose app on :3000) to reuse it.
const port = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
process.env.BETTER_AUTH_URL = baseURL;
// Shared with the workers so every process derives the same operator email.
process.env.TEST_RUN_ID ??= String(Date.now());

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
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${port}`,
    url: baseURL,
    env: { BETTER_AUTH_URL: baseURL, BETTER_AUTH_RATE_LIMIT: "off" },
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
