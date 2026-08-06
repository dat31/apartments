import { test } from "../../fixtures";
import {
  SHELL_MARKERS,
  expectShell,
  expectNotRedirected,
  requireSession,
} from "../shell";

/* PHASE B SCAFFOLD — still here on purpose, unlike its public counterpart.

   No instant() lock in this file. It answers the one question the locked specs
   next to it cannot answer for themselves: do these markers actually render for
   the test user? Without that, a RED is ambiguous — a marker that never renders
   fails exactly like a route that genuinely blocks, and the auth-gated case is
   where the ambiguity bites hardest, because an unauthenticated run redirects
   to /signin and goes RED against the wrong page entirely.

   The public baseline was deleted once it had done its job. This one has never
   run: there are no E2E_EMAIL / E2E_PASSWORD in this environment. Run it first
   when credentials exist, confirm both markers render, and only then trust the
   locked specs beside it — then delete this file. */

test.describe("baseline (unlocked): the authed markers are real", () => {
  test.beforeAll(requireSession);

  test("/messages renders its heading for the test user", async ({ page }) => {
    await page.goto("/messages");
    await expectNotRedirected(page);
    await expectShell(SHELL_MARKERS.messages(page));
  });

  test("/owner/dashboard renders its nav for the test user", async ({ page }) => {
    await page.goto("/owner/dashboard/overview");
    await expectNotRedirected(page);
    await expectShell(SHELL_MARKERS.dashboard(page));
  });
});
