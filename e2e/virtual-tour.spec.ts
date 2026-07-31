import { test, expect, listingLinks } from "./fixtures";
import vi from "@/messages/vi.json";

/* 360° virtual tour.

   Assertions are on the DOM — hotspot buttons, rail items, `?scene=` — never
   on pixels: headless Chromium renders WebGL through SwiftShader, which is
   slow and driver-dependent. The one thing we do assert about the canvas is
   that it exists, since that is the difference between a working viewer and
   the no-WebGL fallback. */

const T = vi.virtualTour;

/** Open the detail page of a listing that has a tour. Roughly a third of
    listings deliberately have none, so walk the grid until one does. */
async function openListingWithTour(page: import("@playwright/test").Page) {
  await page.goto("/apartments");
  const cards = listingLinks(page);
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });

  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const href = await cards.nth(i).getAttribute("href");
    if (!href) continue;
    await page.goto(href);
    const entry = page.getByTestId("virtual-tour-entry");
    if (await entry.count()) return { href, entry: entry.first() };
  }
  throw new Error("no listing on the first page of results has a virtual tour");
}

test.describe("virtual tour", () => {
  test("opens from the detail page and walks between rooms", async ({ page }) => {
    const { href, entry } = await openListingWithTour(page);

    await expect(entry).toBeVisible();
    await entry.click();

    await expect(page).toHaveURL(new RegExp(`${href}/virtual-tour$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // The canvas mounts (the lazy three.js chunk landed and got a context).
    const stage = page.getByTestId("panorama-canvas");
    await expect(stage).toBeVisible();
    await expect(stage.locator("canvas")).toHaveCount(1);

    // Every room in the tour is listed in the rail, and the one on screen is
    // the selected tab.
    const rail = page.getByRole("tablist", { name: T.rooms });
    const rooms = rail.getByRole("tab");
    await expect(rooms.first()).toBeVisible();
    expect(await rooms.count()).toBeGreaterThan(1);
    await expect(rooms.first()).toHaveAttribute("aria-selected", "true");

    /* Walking through a door writes the room into the URL and moves the rail.
       Only the doors currently in shot are visible — the rest are markers the
       renter turns around to find — so pick one that is on screen. */
    const door = page.locator('[data-hotspot-kind="link"]:visible').first();
    await expect(door).toBeVisible();
    await door.click();

    await expect(page).toHaveURL(/\?scene=/);
    await expect(rooms.first()).toHaveAttribute("aria-selected", "false");
    await expect(rail.locator('[aria-selected="true"]')).toHaveCount(1);
  });

  test("the room rail moves between rooms too", async ({ page }) => {
    const { href } = await openListingWithTour(page);
    await page.goto(`${href}/virtual-tour`);

    const rooms = page.getByRole("tablist", { name: T.rooms }).getByRole("tab");
    await expect(rooms.nth(1)).toBeVisible();
    await rooms.nth(1).click();

    await expect(page).toHaveURL(/\?scene=/);
    await expect(rooms.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test("a point of interest opens a panel without leaving the room", async ({
    page,
  }) => {
    const { href } = await openListingWithTour(page);
    await page.goto(`${href}/virtual-tour`);

    const poi = page.locator('[data-hotspot-kind="info"]:visible').first();
    await expect(poi).toBeVisible();
    const url = page.url();
    await poi.click();

    const panel = page.getByTestId("poi-panel");
    await expect(panel).toBeVisible();
    // Reading about the balcony must not navigate away from it.
    expect(page.url()).toBe(url);

    await panel.getByRole("button", { name: T.poiClose }).click();
    await expect(panel).toBeHidden();
  });

  test("returns to the listing it belongs to", async ({ page }) => {
    const { href } = await openListingWithTour(page);
    await page.goto(`${href}/virtual-tour`);

    await page.getByRole("link", { name: T.backToListing }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("a listing without a tour has no 360° entry", async ({ page }) => {
    await page.goto("/apartments");
    const cards = listingLinks(page);
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });

    // Cards carry the 360° badge only when their listing has a tour; find one
    // that doesn't and confirm the detail page agrees.
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const href = await card.getAttribute("href");
      const badge = card.locator("..").getByTestId("listing-card-360");
      if (!href || (await badge.count())) continue;

      await page.goto(href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByTestId("virtual-tour-entry")).toHaveCount(0);

      /* And the route itself renders not-found rather than inventing a tour.
         The assertion is on the page, not the status code: like the detail
         route, the tour's notFound() is thrown below a Suspense boundary, so
         the 200 shell has already been sent by the time it fires. */
      await page.goto(`${href}/virtual-tour`);
      await expect(
        page.getByRole("heading", { name: vi.errors.notFoundTitle })
      ).toBeVisible();
      return;
    }
    test.skip(true, "every listing on the first page has a tour");
  });
});
