import { test as base, expect, type Locator, type Page } from "@playwright/test";

/** Where auth.setup.ts persists the signed-in session for the
    "chromium-auth" project. Relative to the repo root. */
export const STORAGE_STATE = "e2e/.auth/user.json";

/** The authenticated specs need a real Supabase account; without one they
    skip rather than fail. See the Playwright section of README/plan. */
export function e2eCredentials() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  return email && password ? { email, password } : null;
}

/* Locale constants are duplicated from i18n/routing.ts rather than imported:
   that module pulls in next-intl, which is ESM-only and doesn't load cleanly
   inside Playwright's CJS test runtime. Keep these two in sync. */
export const LOCALES = ["vi", "en"] as const;
export const DEFAULT_LOCALE = "vi";
export type Locale = (typeof LOCALES)[number];

/** Build a localized path under next-intl's "as-needed" strategy: the default
    locale is unprefixed, every other locale gets a prefix. Mirrors
    `localized()` in lib/supabase/middleware.ts. */
export function localePath(locale: Locale, path: string): string {
  return locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;
}

type Fixtures = {
  /** Set to false in a spec that needs to observe the /ingest proxy itself. */
  blockAnalytics: boolean;
  /** Fails the test if the page logged an uncaught error. Opt in per spec. */
  consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
  blockAnalytics: [true, { option: true }],

  page: async ({ page, blockAnalytics }, use) => {
    if (blockAnalytics) {
      // instrumentation-client.ts boots posthog-js against api_host "/ingest",
      // which next.config.ts rewrites to us.i.posthog.com. Left alone, every
      // test run would ship real events and pay the round-trip.
      await page.route("**/ingest/**", (route) => route.abort());
    }

    // OSRM powers the tour route planner; keep tests off a third-party service.
    await page.route("**/*project-osrm.org/**", (route) => route.abort());

    // The app ignores prefers-color-scheme emulation and defaults to dark;
    // pinning the stored theme keeps screenshots and contrast deterministic.
    await page.addInitScript(() => {
      window.localStorage.setItem("theme", "light");
    });

    await use(page);
  },

  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await use(errors);
  },
});

export { expect };

/** Every listing card links to /apartments/<id>; the anchor carries the
    listing title as its aria-label (components/listing-card.tsx). */
export function listingLinks(page: Page): Locator {
  return page.locator('a[href*="/apartments/"]:not([href$="/apartments"])');
}

/** Prices render as Vietnamese-formatted numbers; pull the digits out. */
export function parsePriceDigits(text: string): number {
  return Number(text.replace(/[^\d]/g, ""));
}
