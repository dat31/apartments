import { instant } from "@next/playwright";
import { test } from "../../fixtures";
import {
  SHELL_MARKERS,
  expectShell,
  expectNotRedirected,
  requireSession,
} from "../shell";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/* /messages — the route this rig was built to catch.

   It used to await searchParams in the page body to resolve `?channel=`. That
   is a request-time read sitting above every boundary, so nothing below it
   could prerender: the static shell for /messages was the (app) group's
   full-screen spinner and nothing else — no heading, no panes, 11 KB of
   loader. Every navigation here waited on the server before painting.

   The read now happens on the client, below a boundary (components/messaging/
   inbox.tsx), so the heading and the inbox skeleton prerender and the
   conversations stream in behind them. These specs are what stops that
   regressing: move the URL read back up and the heading leaves the shell,
   which is exactly what the marker below asserts. */

test.describe("/messages is instant", () => {
  test.beforeAll(requireSession);

  test("on initial load", async ({ page }) => {
    await instant(
      page,
      async () => {
        await page.goto("/messages");
        await expectNotRedirected(page);
        await expectShell(SHELL_MARKERS.messages(page));
      },
      { baseURL: BASE_URL }
    );
  });

  test("on client-side navigation from the header", async ({ page }) => {
    await page.goto("/apartments");

    await instant(page, async () => {
      await page.getByRole("link", { name: "Tin nhắn" }).first().click();
      await expectShell(SHELL_MARKERS.messages(page));
    });
  });

  /* Parity, guarded rather than asserted once by hand: the whole point of
     moving the URL read to the client is that it still resolves. A deep link
     has to open its thread, or this "optimization" broke the feature. */
  test("a ?channel= deep link still opens its thread", async ({ page }) => {
    await page.goto("/messages");
    await expectNotRedirected(page);
    await expectShell(SHELL_MARKERS.messages(page));

    const firstThread = page.locator("[data-testid='channel-preview-button']").first();
    if ((await firstThread.count()) === 0) {
      test.skip(true, "the test account has no conversations to deep-link into");
    }
    await firstThread.click();
    await page.waitForURL(/channel=/);

    const url = page.url();
    await page.goto(url);
    await expectShell(SHELL_MARKERS.messages(page));
    // The thread pane, not the "pick a conversation" placeholder.
    await expectShell(page.locator(".str-chat__main-panel").first());
  });
});
