import { test, expect, listingLinks } from "./fixtures";
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

/** An active listing whose title exists in both languages, read straight from
    the REST API rather than fixtured: the point of the assertion above is that
    real rows reach the page, and the backfill names no uuids this could pin
    to. Null when the database has none — a fresh one won't until an owner
    writes a translation. */
async function aTranslatedListing() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const query = new URLSearchParams({
    select: "listing_id,title,listings!inner(title,status)",
    locale: "eq.en",
    title: "not.is.null",
    "listings.status": "eq.active",
    limit: "5",
  });
  const res = await fetch(`${url}/rest/v1/listing_translations?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;

  const rows: {
    listing_id: string;
    title: string;
    listings: { title: string };
  }[] = await res.json();

  // A translation identical to the base copy would pass the assertion for the
  // wrong reason, so only a genuinely differing pair counts.
  const row = rows.find((r) => r.title.trim() !== r.listings.title.trim());
  return row
    ? { id: row.listing_id, base: row.listings.title, english: row.title }
    : null;
}
