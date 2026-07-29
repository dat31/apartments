import { test, expect, listingLinks } from "./fixtures";
import vi from "@/messages/vi.json";

/* The review affordance on an owner page, from a signed-out visitor's side.

   A renter gets one review per owner, so <WriteReviewButton> withholds itself
   until it knows who's looking and whether they've already written one. That
   gate is easy to get wrong in the direction that hides the button from
   everybody — including guests, who have no review to look up. This pins the
   guest half of it; the edit half needs a session and lives with the other
   authenticated specs. */

const WRITE_REVIEW = vi.owner.writeReview;

test.describe("owner reviews", () => {
  test("a signed-out visitor is offered the review form and sent to sign-in", async ({
    page,
  }) => {
    // Reach an owner page the way a renter does — from a listing's host link.
    await page.goto("/apartments");
    const card = listingLinks(page).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.click();
    await expect(page).toHaveURL(/\/apartments\/[^/?]+$/);

    /* Follow the host link by href rather than by click: the detail page
       renders a desktop and a mobile owner card, and whichever one matches
       first may be the hidden variant at this viewport. */
    const ownerHref = await page
      .locator('a[href*="/owner/"]')
      .first()
      .getAttribute("href");
    expect(ownerHref, "a listing detail links to its host").toBeTruthy();
    await page.goto(ownerHref!);

    /* Server-rendered HTML has no button at all — it appears only once the
       client island resolves that this visitor is not the owner and has no
       review of their own. */
    const write = page.getByRole("button", { name: WRITE_REVIEW });
    await expect(write.first()).toBeVisible({ timeout: 30_000 });

    await write.first().click();
    await expect(page).toHaveURL(/\/signin\?next=/);
  });
});
