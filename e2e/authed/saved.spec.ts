import { test, expect, e2eCredentials } from "../fixtures";

/* Runs with the storageState written by auth.setup.ts. Deliberately read-only:
   the suite points at the shared Supabase project, so nothing here creates
   tours, listings or saved rows that would outlive the run. */
test.describe("signed-in access", () => {
  test.skip(
    !e2eCredentials(),
    "E2E_EMAIL / E2E_PASSWORD not set in .env.local"
  );

  test("the saved shortlist is reachable", async ({ page }) => {
    await page.goto("/apartments/saved");

    await expect(page).not.toHaveURL(/\/signin/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("the guarded routes no longer redirect", async ({ page }) => {
    for (const path of ["/messages", "/owner/dashboard", "/tour"]) {
      await page.goto(path);
      await expect(page, `${path} should not redirect`).not.toHaveURL(
        /\/signin/
      );
    }
  });

  test("signed-in users are bounced away from the auth pages", async ({
    page,
  }) => {
    // AUTH_PAGES in lib/supabase/middleware.ts — /reset-password is excluded
    // on purpose, a recovery link signs the user in and sends them there.
    await page.goto("/signin");

    await expect(page).toHaveURL(/\/apartments(\/|\?|$)/);
  });

  test("the session survives a locale switch", async ({ page }) => {
    await page.goto("/en/apartments/saved");

    await expect(page).not.toHaveURL(/signin/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
