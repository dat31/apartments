import { test, expect } from "./fixtures";

/* Pins the PROTECTED / AUTH_PAGES tables in lib/supabase/middleware.ts. These
   guards run inside the proxy, layered on top of next-intl's locale rewrite,
   so a change to either can silently open or close a route. */

const PROTECTED = [
  "/tour",
  "/messages",
  "/owner/dashboard",
  "/apartments/saved",
  "/apartments/create",
  // The owner's draft preview. The id is arbitrary — the guard runs in the
  // proxy, before anything reads a listing, so an unknown one redirects just
  // the same as a real one.
  "/apartments/00000000-0000-4000-8000-000000000000/preview",
];

test.describe("anonymous route guards", () => {
  for (const path of PROTECTED) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);

      // The guard stores the locale-stripped target so the sign-in page can
      // re-localize it; searchParams.set percent-encodes the slashes.
      await expect(page).toHaveURL(
        `/signin?next=${encodeURIComponent(path)}`
      );
    });
  }

  test("/apartments/saved/compare stays public", async ({ page }) => {
    // The compared ids live in the URL so a comparison can be shared with
    // someone who isn't signed in — an explicit carve-out in PROTECTED.
    await page.goto("/apartments/saved/compare");

    await expect(page).not.toHaveURL(/\/signin/);
  });

  test("public browsing needs no session", async ({ page }) => {
    for (const path of ["/", "/apartments"]) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/signin/);
    }
  });

  test("the sign-in page is reachable while signed out", async ({ page }) => {
    await page.goto("/signin");

    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});
