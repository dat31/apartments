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

/** An active listing whose title exists in both languages, read straight from
    the REST API rather than fixtured. `lib/services/**` is excluded from unit
    coverage by design (AGENTS.md), so the specs that use this are the only
    proof that a real translation row reaches a rendered page — and the
    backfill names no uuids for them to pin to. Null when the database has
    none: a fresh one has nothing translated until an owner writes something.

    Anon-key only: `listing_translations` of active listings are publicly
    readable, which is the same access the app itself has here. */
export async function aTranslatedListing(): Promise<{
  id: string;
  base: string;
  english: string;
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const query = new URLSearchParams({
    select: "listing_id,title,listings!inner(title,status)",
    locale: "eq.en",
    title: "not.is.null",
    "listings.status": "eq.active",
    limit: "20",
  });
  const res = await fetch(`${url}/rest/v1/listing_translations?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;

  const rows: {
    listing_id: string;
    title: string;
    listings: { title: string };
  }[] = await res.json();

  // A translation identical to the base copy would pass an assertion for the
  // wrong reason, so only a genuinely differing pair counts.
  const row = rows.find((r) => r.title.trim() !== r.listings.title.trim());
  return row
    ? { id: row.listing_id, base: row.listings.title, english: row.title }
    : null;
}

/** A word from `english` that does not appear in `base` — a search term that
    can only match through the translation. Null when the two titles share
    every word worth searching for (place names often survive translation). */
export function englishOnlyWord(base: string, english: string): string | null {
  const baseText = base.toLowerCase();
  return (
    english
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .find((w) => w.length >= 5 && !baseText.includes(w)) ?? null
  );
}
