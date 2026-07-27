import { test, expect } from "./fixtures";

test.describe("landing page", () => {
  test("renders the hero, role cards and listing sections", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // The role chooser routes visitors to the renter / owner journeys.
    const roleLinks = page.locator('main a[href], a[href="/apartments"]');
    await expect(roleLinks.first()).toBeVisible();

    // Newest / trending carousels stream in below the fold; each renders
    // listing cards that link into /apartments/<id>.
    await expect(
      page.locator('a[href*="/apartments/"]').first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("loads without uncaught page errors", async ({ page, consoleErrors }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Aborted /ingest requests (blocked by the fixture) surface as network
    // console errors; they are ours, not the app's.
    const appErrors = consoleErrors.filter(
      (e) => !/ingest|ERR_FAILED|ERR_ABORTED|posthog/i.test(e)
    );
    expect(appErrors).toEqual([]);
  });
});
