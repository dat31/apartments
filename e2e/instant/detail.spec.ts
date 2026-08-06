import { instant } from "@next/playwright";
import { test } from "../fixtures";
import { listingLinks } from "../fixtures";
import { SHELL_MARKERS, expectShell, prefetchWatcher } from "./shell";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/* /apartments/[id] — the click that matters most in this app.

   The detail page resolves `params` at the page level and pushes the listing
   read below <Suspense> with a layout-shaped skeleton, so the back link and
   the page frame belong to the shell while the home itself streams
   (app/[lang]/(app)/apartments/[id]/page.tsx). These specs are what keep that
   true: re-block the page and the back link stops committing under the lock.

   The marker is the back link rather than the listing title on purpose. The
   title is per-listing data — asserting it would mean asserting the very
   thing instant() holds back, and the spec could then only pass by the shell
   *not* being static. */

test.describe("/apartments/[id] is instant", () => {
  test("on client-side navigation from the results list", async ({ page }) => {
    const waitForPrefetch = prefetchWatcher(page);
    await page.goto("/apartments");

    const card = listingLinks(page).first();
    await card.waitFor();
    const href = await card.getAttribute("href");
    if (!href) throw new Error("no listing links on /apartments");

    // The card's shell has to be in the browser before the click, or this
    // measures the prefetch race instead of the shell. See prefetchWatcher.
    await card.scrollIntoViewIfNeeded();
    await waitForPrefetch(new URL(href, BASE_URL).pathname);

    await instant(page, async () => {
      await card.click();
      await expectShell(SHELL_MARKERS.detail(page));
    });
  });

  test("on initial load of a listing URL", async ({ page }) => {
    // Take a real listing id from the list rather than pinning a uuid: the
    // suite runs against the shared Supabase project, where ids come and go.
    await page.goto("/apartments");
    const href = await listingLinks(page).first().getAttribute("href");
    if (!href) throw new Error("no listing links on /apartments");

    await instant(
      page,
      async () => {
        await page.goto(href);
        await expectShell(SHELL_MARKERS.detail(page));
      },
      { baseURL: BASE_URL }
    );
  });
});
