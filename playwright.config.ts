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
  /* e2e/instant/** belongs to playwright.instant.config.ts and must never run
     from here. Those specs measure whether a route's prerendered shell commits,
     which is only meaningful against a production build — this suite serves
     `next dev`, where the answer is noise. See instant-nav.rig.md. */
  testIgnore: /instant\//,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Modest on a 2-core GitHub runner; the dev server compiles routes on first
  // hit, so piling on workers there mostly contends for the same compile.
  workers: process.env.CI ? 2 : undefined,
  // The HTML report is uploaded as a CI artifact on failure.
  reporter: [["list"], ["html", { open: "never" }]],

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
      // Project-level testIgnore replaces the top-level one, so instant/ has to
      // be repeated here rather than inherited.
      testIgnore: [/authed\//, /instant\//],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-auth",
      // Anchored to e2e/authed/ so it cannot also pick up e2e/instant/authed/.
      testMatch: /e2e\/authed\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
    },
  ],

  webServer: {
    /* Testing the production build would be better — it is what actually
       ships. This ran on dev because /apartments blanked on ~half of
       production-build loads under Playwright's Chromium (issue #89).

       That no longer reproduces: 8 cold loads of /apartments on a production
       build came back clean, with no HierarchyRequestError, when the instant
       rig was stood up (instant-nav.rig.md). Flipping this suite over is
       worth doing, but it is a change to 28 specs and belongs in its own pass
       — set E2E_PRODUCTION_BUILD=1 to try it. The instant specs already run
       against a production build exclusively; they have no dev fallback. */
    command: process.env.E2E_PRODUCTION_BUILD ? "pnpm start" : "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
