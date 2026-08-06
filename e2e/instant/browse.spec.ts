import { instant } from "@next/playwright";
import { test, expect, listingLinks } from "../fixtures";
import { SHELL_MARKERS, expectShell, prefetchWatcher } from "./shell";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/* /apartments — the app's main destination, reached both ways.

   Inside instant(), every per-request read is held back. What is asserted is
   what the browser has *before* any of that arrives: the prerendered shell.
   For browse that means the heading, the filter rail and the sort control,
   with the result count and the cards streaming in behind their skeletons
   (app/[lang]/(app)/apartments/components/browse.tsx).

   Both navigations are covered because they commit different shells: an
   initial load re-runs every layout from the root, while a soft navigation
   only re-renders below the layout the two routes share. A pass on one says
   nothing about the other. */

test.describe("/apartments is instant", () => {
  /* This one carries the whole file's credibility, so it asserts both halves.

     If the build under test is missing exposeTestingApiInProductionBuild,
     instant() silently does nothing and every spec in this directory passes
     without measuring anything. The tell is the results: under a lock that is
     really engaged the cards cannot have arrived yet, so seeing zero of them
     — and then seeing them after release — is the in-band proof that the
     GREEN above means what it says. Delete this assertion and the rig can rot
     into a suite that is green because it is blind. */
  test("on initial load, with the lock proven to engage", async ({ page }) => {
    await instant(
      page,
      async () => {
        await page.goto("/apartments");
        await expectShell(SHELL_MARKERS.browse(page));

        expect(
          await listingLinks(page).count(),
          "the results are per-request data and must still be held back — " +
            "if they are already here, the lock is not engaging and this " +
            "whole suite is passing vacuously"
        ).toBe(0);
      },
      { baseURL: BASE_URL }
    );

    // Released: the same island that was empty above now has its cards.
    await listingLinks(page).first().waitFor();
  });

  /* KNOWN GAP — not a flaky test, and not something browse.tsx can fix.

     The route's static shell is fine: it is fully prerendered, heading and
     all, and the initial-load spec above proves it commits. What is missing is
     the shell ever reaching the browser before the click. The router's
     prefetch of /apartments is ~910 bytes and carries no <h1> — it is the
     route tree and the loading boundary, nothing else. So a soft navigation
     has no shell to commit and renders app/[lang]/(app)/apartments/loading.tsx
     instead, whose heading slot is a grey Skeleton bar. The real shell arrives
     from the network afterwards, which is precisely "not instant".

     It passes intermittently, which is the tell: sometimes the full payload
     wins the race and the heading is there. Shipping it as a live assertion
     would be shipping a coin flip, so it is marked instead of deleted — the
     goal it encodes is still the goal.

     Pushing anything further down in browse.tsx cannot close this. What closes
     it is Partial Prefetching, where a shared App Shell is prefetched by
     default; it is unset in next.config.ts and no route opts in. When it is
     adopted, delete this line and this spec should go green — and if it does
     not, the shell regressed. See "Known gaps" in instant-nav.rig.md. */
  test.fixme("on client-side navigation from the landing page", async ({ page }) => {
    const waitForPrefetch = prefetchWatcher(page);
    await page.goto("/");

    /* A real <Link> click, not router.push: only a link is prefetched, and the
       prefetched shell is the thing under test. The landing page's primary CTA
       (the role cards) is a <button> + router.push and so is never prefetched —
       see the known gaps in instant-nav.rig.md. */
    const link = page.getByRole("link", { name: "Xem tất cả" }).first();
    await link.scrollIntoViewIfNeeded();
    await waitForPrefetch("/apartments");

    await instant(page, async () => {
      await link.click();
      await expectShell(SHELL_MARKERS.browse(page));
    });
  });
});
