import { test, expect, listingLinks, aTranslatedListing } from "./fixtures";
import vi from "@/messages/vi.json";

/* The site header's logo also links to /apartments, so the back link has to be
   selected by its own accessible name rather than by href. Pull the label from
   the message catalogue instead of hardcoding the Vietnamese string. */
const BACK_TO_RESULTS = vi.detail.backToResults;

test.describe("listing detail", () => {
  test("opens from a results card and can return to the list", async ({
    page,
  }) => {
    await page.goto("/apartments?sort=low");
    const card = listingLinks(page).first();
    await expect(card).toBeVisible({ timeout: 30_000 });

    const title = await card.getAttribute("aria-label");
    await card.click();

    await expect(page).toHaveURL(/\/apartments\/[^/?]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      title ?? /.+/
    );

    /* Clicking a card stamps a "came from results" marker, so BackToResults
       does a real history.back() and restores the exact list — including the
       sort still in the URL. */
    const back = page.getByRole("link", { name: BACK_TO_RESULTS });
    // Server-rendered the href is bare "/apartments"; it picks up the
    // remembered query only once the client store has read sessionStorage.
    // Waiting for that also guarantees the island is hydrated before we click.
    await expect(back).toHaveAttribute("href", /sort=low/);
    await back.click();
    await expect(page).toHaveURL(/\/apartments\?.*sort=low/);
  });

  test("a deep link falls back to a plain link to the list", async ({
    page,
  }) => {
    await page.goto("/apartments");
    const href = await listingLinks(page).first().getAttribute("href");
    expect(href).toBeTruthy();

    // Fresh navigation, no sessionStorage marker: the back link stays an
    // ordinary href instead of a history.back().
    await page.goto(href!);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const back = page.getByRole("link", { name: BACK_TO_RESULTS });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/apartments(\?|$)/);
  });

  /* The read path for `listing_translations` (improvement #14). The services
     and the row→domain mapping are excluded from unit coverage by design
     (AGENTS.md), so this is the only test that proves an embedded translation
     survives the whole way to the rendered page. */
  test("serves the owner's English copy on /en and the base copy on /", async ({
    page,
  }) => {
    const translated = await aTranslatedListing();
    test.skip(
      !translated,
      "no active listing has an English translation in this database"
    );
    const { id, base, english } = translated!;

    await page.goto(`/apartments/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(base);

    await page.goto(`/en/apartments/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(english);
  });
});
