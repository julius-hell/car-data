import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// Tests run against a production build so service-worker behaviour is real
// (Serwist is network-only in development). Point PLAYWRIGHT_BASE_URL at an
// already running server (e.g. the docker compose app on :3000) to reuse it.
const port = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${port}`,
    url: baseURL,
    env: { BETTER_AUTH_URL: baseURL },
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
