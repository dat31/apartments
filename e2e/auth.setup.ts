import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE, e2eCredentials } from "./fixtures";

/* Signs in once through the real /signin form and persists the resulting
   Supabase cookies, so the authenticated specs don't each pay for a login.
   The sign-in mutation runs client-side (hooks/auth/use-sign-in.ts) and
   @supabase/ssr writes the session into cookies, which is exactly what
   storageState captures. */
setup("authenticate", async ({ page, context }) => {
  const creds = e2eCredentials();

  if (!creds) {
    // Still write a (empty) state file so the chromium-auth project can load;
    // its specs skip themselves on the same condition.
    await context.storageState({ path: STORAGE_STATE });
    setup.skip(true, "E2E_EMAIL / E2E_PASSWORD not set in .env.local");
    return;
  }

  await page.goto("/signin");

  await page.locator('input[name="email"]').fill(creds.email);
  // The password label is a plain <span>, not a <label for>, so getByLabel
  // can't reach this input — go by the registered field name.
  await page.locator('input[name="password"]').fill(creds.password);
  await page.locator('form button[type="submit"]').click();

  // On success the page pushes to `next` or /apartments; on failure it raises
  // a sonner toast and stays put. Surface that message instead of a bare
  // navigation timeout.
  await Promise.race([
    page.waitForURL(/\/apartments(\/|$|\?)/, { timeout: 30_000 }),
    page
      .locator("[data-sonner-toast]")
      .first()
      .waitFor({ timeout: 30_000 })
      .then(async () => {
        const message = await page.locator("[data-sonner-toast]").first().innerText();
        throw new Error(`Sign-in failed for ${creds.email}: ${message}`);
      }),
  ]);

  // The auth cookie is httpOnly and set by the proxy's session refresh; make
  // sure it actually landed before snapshotting.
  const cookies = await context.cookies();
  expect(
    cookies.some((c) => c.name.startsWith("sb-")),
    "expected a Supabase auth cookie after sign-in"
  ).toBe(true);

  await context.storageState({ path: STORAGE_STATE });
});
