import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { STORAGE_STATE } from "./e2e/fixtures";

// Load .env / .env.local exactly the way `next dev` does, so specs and the
// auth setup can read E2E_EMAIL / E2E_PASSWORD from the same place the app
// reads its Supabase keys.
loadEnvConfig(process.cwd());

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  // `cacheComponents` compiles routes on demand, so the first hit on a route
  // can take several seconds. Playwright's defaults are too tight for that.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Vietnamese is the default locale; headless Chromium otherwise asks for
    // en, which would make next-intl pick the wrong locale on unprefixed URLs.
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    // Central Da Nang — the app asks for geolocation on the map/tour views.
    geolocation: { latitude: 16.0605, longitude: 108.2242 },
    permissions: ["geolocation"],
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: /authed\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-auth",
      testMatch: /authed\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
