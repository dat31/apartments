import {
  filterListings,
  parseFilters,
} from "@/app/[lang]/(app)/apartments/lib/query";
import type {
  AlertableSearch,
  PublishedListing,
} from "@/lib/services/notifications";

/* ============================================================
   Which saved searches a freshly published home matches.

   Pure — no Supabase, no clock beyond what it is handed — so the
   cron route that owns the IO stays a thin wrapper and this can
   be unit tested against fixtures.

   The whole point of living here is the import above: this calls
   the browse page's *actual* predicate. Until now the only
   matching code was a hand-maintained mirror of it in the Deno
   alerts function, with a comment asking the next person to keep
   the two in sync. A renter's saved search should return exactly
   what the same URL returns on Browse, and the only way to
   guarantee that is to run the same function.
   ============================================================ */

/* A single run's ceiling per search. The per-account cap is 10 searches
   (SAVED_SEARCH_MAX) and the candidate set is bounded by the lookback window,
   so this is not about cost — it is about a broad search ("everything in Da
   Nang") not dumping forty rows into one person's feed after a bulk import.
   The rest are simply not claimed, so the next run picks them up. */
export const MAX_MATCHES_PER_SEARCH = 10;

export type Match = {
  savedSearchId: string;
  listingId: string;
  /** The renter to notify — carried through so the caller doesn't re-join. */
  profileId: string;
};

/**
 * Every (search, listing) pair worth notifying about.
 *
 * Deduplication is deliberately *not* here: which pairs have already been sent
 * is a database fact, and the claim insert in the notifications service is what
 * decides it atomically. This function answers only "does this home match this
 * search?", which is the part worth testing.
 */
export function matchSavedSearches(
  searches: AlertableSearch[],
  listings: PublishedListing[]
): Match[] {
  const matches: Match[] = [];

  for (const search of searches) {
    const filters = parseFilters(
      Object.fromEntries(new URLSearchParams(search.queryString))
    );

    const candidates = listings.filter(
      (listing) =>
        /* A search only ever alerts about homes that appeared *after* it was
           saved. Without this, saving a search would immediately notify the
           renter about every home already on the site — which they just
           finished browsing. `publishedAt` and not `createdAt`: a draft
           written in June and published today is new to them. */
        listing.publishedAt >= search.createdAt &&
        /* An owner who saves a search does not need to be told about their own
           listing going live. */
        listing.owner !== search.profileId
    );

    // Sort is irrelevant to matching; "newest" keeps the emitted order stable
    // and is the order the feed shows them in anyway.
    for (const listing of filterListings(candidates, filters, "newest").slice(
      0,
      MAX_MATCHES_PER_SEARCH
    )) {
      matches.push({
        savedSearchId: search.id,
        listingId: listing.id,
        profileId: search.profileId,
      });
    }
  }

  return matches;
}
