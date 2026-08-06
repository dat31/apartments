import { expect, type Locator, type Page } from "@playwright/test";
import { e2eCredentials } from "../fixtures";

/* Shared pieces for the instant-navigation specs. See instant-nav.rig.md.

   A note on what these specs assert, because it is narrower than it looks:
   `instant()` holds dynamic data back, so a passing spec says "the route's
   prerendered static shell committed without waiting on any per-request
   read". It does not say the shell is *useful* — an empty shell with a
   `fallback={null}` at the top passes just as happily. That second bar is
   what SHELL_MARKERS are for: each one is a real, visible piece of the page
   the user would recognize, so a route that prerenders a blank frame fails
   here even though its navigation is technically instant. */

/** The element that proves each route's static shell reached the browser.
    Accessible selectors rather than test IDs, matching e2e/authed/*.spec.ts.
    Copy is Vietnamese because vi is the default locale and the rig pins it. */
export const SHELL_MARKERS = {
  browse: (page: Page): Locator =>
    page.getByRole("heading", { level: 1, name: "Nhà ở Đà Nẵng" }),

  detail: (page: Page): Locator =>
    page.getByRole("link", { name: "Quay lại kết quả" }),

  messages: (page: Page): Locator =>
    page.getByRole("heading", { level: 1, name: "Tin nhắn" }),

  dashboard: (page: Page): Locator =>
    page.getByRole("link", { name: "Tổng quan" }),
} as const;

/** The marker is present, visible, and carries text.

    Deliberately stronger than `toBeVisible()`: the failure mode this rig has
    to catch is a shell that commits instantly and shows nothing, and an empty
    element can be "visible". */
export async function expectShell(marker: Locator): Promise<void> {
  await expect(marker).toBeVisible();
  expect((await marker.innerText()).trim().length).toBeGreaterThan(0);
}

/** The authed specs must FAIL without credentials, never skip.

    e2e/auth.setup.ts and the authed specs in the main suite skip themselves
    when E2E_EMAIL / E2E_PASSWORD are unset, which is right for a read-only
    integration suite. It is wrong here: /messages and /owner/dashboard are
    behind PROTECTED (lib/supabase/middleware.ts), so an unauthenticated run
    measures the redirect to /signin instead of the route — and a suite that
    skips reports green while guarding nothing. */
export function requireSession(): void {
  if (!e2eCredentials()) {
    throw new Error(
      "E2E_EMAIL / E2E_PASSWORD are not set. The auth-gated instant specs " +
        "cannot run without a session: the middleware redirects /messages " +
        "and /owner/dashboard to /signin, so the shell they would measure is " +
        "the sign-in page's. Set both in .env.local and re-run."
    );
  }
}

/** Guards against measuring a redirect rather than the route. */
export async function expectNotRedirected(page: Page): Promise<void> {
  await expect(page).not.toHaveURL(/\/signin/);
}

/** Tracks which destinations the router has actually prefetched.

    A soft navigation can only commit a shell the browser already has, and
    <Link> prefetches on viewport entry — so on a narrow viewport, where the
    link starts far below the fold, the prefetch and the click are in a race.
    Clicking before it lands measures the race, not the shell: the header
    commits, <main> is empty, and the spec goes RED on a route that is
    perfectly fine. That is a flake, and worse, one that only shows up under
    parallel load, so it reads as a real regression on a busy CI box.

    Waiting for the prefetch first makes the assertion mean one thing: given
    the shell was fetched, does it commit without waiting on dynamic data?

    Call before navigating — responses that arrive before this is wired up are
    not counted. */
export function prefetchWatcher(page: Page): (pathname: string) => Promise<void> {
  const prefetched = new Set<string>();

  page.on("response", (response) => {
    const url = new URL(response.url());
    // Next's prefetch of a route's RSC payload: same path, `_rsc` cache-buster.
    if (url.searchParams.has("_rsc")) prefetched.add(url.pathname);
  });

  return async function waitForPrefetch(pathname: string): Promise<void> {
    await expect
      .poll(() => prefetched.has(pathname), {
        timeout: 15_000,
        message: `${pathname} was never prefetched, so a soft navigation to it has no shell to commit`,
      })
      .toBe(true);
  };
}
