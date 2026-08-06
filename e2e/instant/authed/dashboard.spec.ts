import { instant } from "@next/playwright";
import { test } from "../../fixtures";
import {
  SHELL_MARKERS,
  expectShell,
  expectNotRedirected,
  requireSession,
} from "../shell";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/* /owner/dashboard — the cookie-bound route, guarded.

   Everything the dashboard chrome reads is per-owner (their name, their
   listings, their tours), so none of it can prerender. What *can* — and what
   this spec pins — is the frame around it: the container, the sidebar and the
   nav tabs, rendered from the layout's fallbacks with their counts set to null
   (app/[lang]/(app)/owner/dashboard/layout.tsx). The tabs are usable and the
   stat tiles hold their positions from the first paint; only the numbers and
   the greeting arrive with the stream.

   The marker is a nav label rather than the greeting for exactly that reason:
   the greeting is the owner's name, which is the per-request read the lock
   holds back. Asserting it would make the spec pass only when the route is
   *not* instant. */

test.describe("/owner/dashboard is instant", () => {
  test.beforeAll(requireSession);

  test("on initial load", async ({ page }) => {
    await instant(
      page,
      async () => {
        await page.goto("/owner/dashboard/overview");
        await expectNotRedirected(page);
        await expectShell(SHELL_MARKERS.dashboard(page));
      },
      { baseURL: BASE_URL }
    );
  });

  test("on client-side navigation from the header", async ({ page }) => {
    await page.goto("/apartments");

    await instant(page, async () => {
      await page
        .getByRole("link", { name: "Dashboard Chủ nhà" })
        .first()
        .click();
      await expectShell(SHELL_MARKERS.dashboard(page));
    });
  });

  /* Tab-to-tab, the navigation an owner actually repeats. These share the
     dashboard layout, so only the panel below it re-renders — the chrome is
     reused rather than rebuilt, and the shell that has to commit is the
     destination tab's. */
  test("on navigation between dashboard tabs", async ({ page }) => {
    await page.goto("/owner/dashboard/overview");
    await expectNotRedirected(page);
    await expectShell(SHELL_MARKERS.dashboard(page));

    await instant(page, async () => {
      await page.getByRole("link", { name: "Lịch trống" }).first().click();
      await expectShell(SHELL_MARKERS.dashboard(page));
    });
  });
});
