import { test, expect, listingLinks, parsePriceDigits } from "./fixtures";

/* The URL is the single source of truth for filter/sort/page state
   (app/[lang]/(app)/apartments/lib/query.ts), so these drive the page by URL
   rather than by clicking through filters-panel.tsx — same coverage of the
   parsing + filtering logic, far less coupling to the filter UI's markup. */
test.describe("browse", () => {
  test("lists results", async ({ page }) => {
    await page.goto("/apartments");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(listingLinks(page).first()).toBeVisible({ timeout: 30_000 });
    expect(await listingLinks(page).count()).toBeGreaterThan(0);
  });

  test("sort=low orders by ascending price", async ({ page }) => {
    await page.goto("/apartments?sort=low");
    await expect(listingLinks(page).first()).toBeVisible({ timeout: 30_000 });

    const prices = (
      await page.getByTestId("listing-price").allInnerTexts()
    ).map(parsePriceDigits);

    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test("sort=high orders by descending price", async ({ page }) => {
    await page.goto("/apartments?sort=high");
    await expect(listingLinks(page).first()).toBeVisible({ timeout: 30_000 });

    const prices = (
      await page.getByTestId("listing-price").allInnerTexts()
    ).map(parsePriceDigits);

    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test("maxPrice narrows the result set", async ({ page }) => {
    await page.goto("/apartments?sort=low");
    await expect(listingLinks(page).first()).toBeVisible({ timeout: 30_000 });
    const unfiltered = await listingLinks(page).count();

    // The cheapest listing's price is a cap every other result must clear or
    // match, so this can't depend on absolute prices in the live data.
    const cheapest = parsePriceDigits(
      await page.getByTestId("listing-price").first().innerText()
    );
    expect(cheapest).toBeGreaterThan(0);

    // Prices are stored in USD and rendered in VND for `vi`; filter in USD via
    // the English locale so the URL value and the displayed value share units.
    await page.goto("/en/apartments?sort=low");
    const cheapestUsd = parsePriceDigits(
      await page.getByTestId("listing-price").first().innerText()
    );
    await page.goto(`/en/apartments?sort=low&maxPrice=${cheapestUsd}`);

    const filtered = await page.getByTestId("listing-price").allInnerTexts();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThanOrEqual(unfiltered);
    for (const text of filtered) {
      expect(parsePriceDigits(text)).toBeLessThanOrEqual(cheapestUsd);
    }
  });

  test("an unmatchable query shows the empty state", async ({ page }) => {
    await page.goto("/apartments?q=zzzznotarealdistrictzzzz");

    await expect(listingLinks(page)).toHaveCount(0);
    // EmptyResults renders an <h3> plus a reset button.
    await expect(page.locator("h3").first()).toBeVisible({ timeout: 30_000 });
  });

  test("an unknown sort value falls back instead of erroring", async ({
    page,
  }) => {
    const response = await page.goto("/apartments?sort=bogus");

    expect(response?.status()).toBeLessThan(400);
    await expect(listingLinks(page).first()).toBeVisible({ timeout: 30_000 });
  });
});
