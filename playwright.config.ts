import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL targets an already-running app (local production build or a
// deployed environment); when unset, Playwright boots the dev server itself.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Sandboxed agent environments pre-install a Chromium at a fixed path and
// block Playwright's own browser download; use it when present.
const preinstalledChromium = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(preinstalledChromium) ? preinstalledChromium : undefined);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Flakiness fails the suite instead of being retried away; see
  // quality-assurance-guidelines › flakiness-tolerance.
  retries: 0,
  failOnFlakyTests: true,
  // The JSON report feeds scripts/check-scenario-coverage.mjs.
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
      },
});
