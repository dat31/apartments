import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { STORAGE_STATE } from "./e2e/fixtures";

loadEnvConfig(process.cwd());

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/* ============================================================
   The instant-navigation rig — separate from playwright.config.ts
   on purpose. See instant-nav.rig.md.

   `instant()` holds dynamic data back and asserts the route's
   prerendered static shell still commits. That verdict is only
   meaningful against a production build: `next dev` does not
   prefetch, and its lock is unreliable for blocking routes. The
   main suite stays on `next dev`; this one never runs there.

   Two invariants this file exists to hold:

   1. The build under test is a *fresh* build of the working tree,
      with EXPOSE_TESTING_API=1. `pnpm dev` and `pnpm build` share
      one .next directory, so serving a stale or dev-polluted one
      is a live risk — and a stale artifact reads as a false RED
      or a false GREEN, which is worse than no test at all.
   2. That build exposes the testing API. Without it `instant()`
      silently no-ops and every spec here passes vacuously.
   ============================================================ */

export default defineConfig({
  testDir: "./e2e/instant",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a flaky instant() result is a finding, not noise to paper over.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-instant" }]],

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Same environment pinning as the main suite (e2e/fixtures.ts): vi is the
    // default locale and the markers below are Vietnamese, so a headless
    // Chromium asking for `en` would resolve the wrong copy on unprefixed URLs.
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    geolocation: { latitude: 16.0605, longitude: 108.2242 },
    permissions: ["geolocation"],
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      testDir: "./e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    /* Public navigations, at both widths. The mobile project is not
       decoration: a shell frozen to one breakpoint misaligns on the other,
       and running the same specs at 390px is what makes that gate
       machine-checked rather than eyeballed. */
    {
      name: "desktop",
      testIgnore: /authed\//,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      testIgnore: /authed\//,
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
    // Auth-gated navigations. /messages and /owner/dashboard are both behind
    // PROTECTED in lib/supabase/middleware.ts, so without a session these
    // measure the redirect to /signin instead of the route.
    {
      name: "desktop-auth",
      testMatch: /authed\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: STORAGE_STATE,
      },
    },
    {
      name: "mobile-auth",
      testMatch: /authed\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        storageState: STORAGE_STATE,
      },
    },
  ],

  webServer: {
    /* Builds before serving, every run. Slower than reusing a build, and
       deliberately so — this is the local stand-in for the skill's LIVENESS
       probe: the verdict has to come from the tree as it is right now. For a
       tight fix loop, build and `EXPOSE_TESTING_API=1 pnpm start` by hand,
       then set PW_INSTANT_REUSE=1 to attach to it. */
    command:
      "EXPOSE_TESTING_API=1 pnpm build:local && EXPOSE_TESTING_API=1 pnpm start",
    url: BASE_URL,
    reuseExistingServer: process.env.PW_INSTANT_REUSE === "1",
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
