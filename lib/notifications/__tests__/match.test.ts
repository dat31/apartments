import { describe, expect, it } from "vitest";
import { makeListing } from "@/tests/factories";
import { matchSavedSearches, MAX_MATCHES_PER_SEARCH } from "../match";
import type {
  AlertableSearch,
  PublishedListing,
} from "@/lib/services/notifications";

/* The saved-search matcher. Everything here is a pure function of its two
   arguments, which is the whole reason the matching lives apart from the cron
   route that feeds it. */

const RENTER = "11111111-1111-1111-1111-111111111111";
const OWNER = "22222222-2222-2222-2222-222222222222";

/* Fixed instants rather than offsets from now(): every assertion below is
   about one timestamp being before another, and a relative fixture would make
   that comparison depend on how long the suite takes to run. */
const SAVED_AT = "2026-08-01T00:00:00.000Z";
const BEFORE = "2026-07-01T00:00:00.000Z";
const AFTER = "2026-08-02T00:00:00.000Z";

function makeSearch(overrides: Partial<AlertableSearch> = {}): AlertableSearch {
  return {
    id: "search-1",
    profileId: RENTER,
    queryString: "",
    createdAt: SAVED_AT,
    ...overrides,
  };
}

function makePublished(
  overrides: Partial<PublishedListing> = {}
): PublishedListing {
  return {
    ...makeListing({ owner: OWNER }),
    publishedAt: AFTER,
    ...overrides,
  };
}

describe("matchSavedSearches", () => {
  it("matches a home published after the search was saved", () => {
    const listing = makePublished();

    expect(matchSavedSearches([makeSearch()], [listing])).toEqual([
      { savedSearchId: "search-1", listingId: listing.id, profileId: RENTER },
    ]);
  });

  it("ignores a home that was already published when the search was saved", () => {
    // Otherwise saving a search would immediately alert the renter about every
    // home they had just finished browsing.
    const listing = makePublished({ publishedAt: BEFORE });

    expect(matchSavedSearches([makeSearch()], [listing])).toEqual([]);
  });

  it("ignores the searcher's own listing", () => {
    const listing = makePublished({ owner: RENTER });

    expect(matchSavedSearches([makeSearch()], [listing])).toEqual([]);
  });

  it("applies the browse filters from the query string", () => {
    const cheap = makePublished({ price: 300 });
    const dear = makePublished({ price: 900 });
    const search = makeSearch({ queryString: "maxPrice=500" });

    expect(
      matchSavedSearches([search], [cheap, dear]).map((m) => m.listingId)
    ).toEqual([cheap.id]);
  });

  it("reads a query string that still carries its leading ?", () => {
    const studio = makePublished({ type: "Studio" });
    const house = makePublished({ type: "House" });

    expect(
      matchSavedSearches(
        [makeSearch({ queryString: "?type=Studio" })],
        [studio, house]
      ).map((m) => m.listingId)
    ).toEqual([studio.id]);
  });

  it("never matches a draft, whatever the filters say", () => {
    // filterListings drops non-active rows itself; this pins that the cron
    // can't leak an unpublished home even if the read ever widened.
    const draft = makePublished({ status: "draft" });

    expect(matchSavedSearches([makeSearch()], [draft])).toEqual([]);
  });

  it("caps how many one search can emit in a single run", () => {
    const listings = Array.from({ length: MAX_MATCHES_PER_SEARCH + 3 }, () =>
      makePublished()
    );

    expect(matchSavedSearches([makeSearch()], listings)).toHaveLength(
      MAX_MATCHES_PER_SEARCH
    );
  });

  it("emits a pair per search when several match the same home", () => {
    const listing = makePublished();
    const searches = [
      makeSearch({ id: "a" }),
      makeSearch({ id: "b", profileId: OWNER }),
    ];

    // The second search belongs to the listing's owner, so it drops out — the
    // per-search rules apply independently, not to the batch.
    expect(matchSavedSearches(searches, [listing]).map((m) => m.savedSearchId))
      .toEqual(["a"]);
  });

  it("returns nothing when there is nothing to match", () => {
    expect(matchSavedSearches([], [makePublished()])).toEqual([]);
    expect(matchSavedSearches([makeSearch()], [])).toEqual([]);
  });
});
