import type { Listing } from "@/schemas/listing";
import type { Filters, SortKey } from "@/schemas/filters";

/* Query keys + cache shapes for the saved-listings queries, split from
   use-saved-listings so useSaved (bundled on every page with a SaveButton,
   including the landing showcase) can patch/invalidate the cache without
   pulling that hook's supabase/zod dependencies into its bundle. */

export type SavedListingsPage = { listings: Listing[]; total: number };
export type SavedFacets = { districts: string[]; total: number };

/** Stable signature of the saved-id set. Sorted, so a shortlist that comes back
    in a different order (it's ordered by created_at) doesn't re-key — only a
    genuine add/remove does. */
export const savedSignature = (saved: string[]) => [...saved].sort().join(",");

/* Keys are scoped per user ("guest" for anon) + the saved-id signature +
   filters/sort/page. The signature has to be in the key: the ids are a queryFn
   *input* (they scope the DB query via `.in("id", …)`), so without it the cached
   page can outlive the shortlist it was built from — the shortlist refetching in
   the background, the guest->member merge, or another tab would all leave the
   list rendering results for an id set the user no longer has, with nothing to
   trigger a correction. Keying on it means the key and the closure always move
   together.

   Toggling a save therefore re-keys, but it doesn't flash: both queries use
   keepPreviousData, and useSaved patches the outgoing entry in place (drop the
   card, decrement totals) so the previous data it falls back to is already
   correct while the new key loads. */
export const savedListingsKeys = {
  /** Prefixes for cache-patching every cached page / facets entry at once. */
  pages: ["saved-listings", "page"] as const,
  facetsAll: ["saved-listings", "facets"] as const,
  page: (
    scope: string,
    savedSig: string,
    filters: Filters,
    sort: SortKey,
    page: number
  ) => ["saved-listings", "page", scope, savedSig, filters, sort, page] as const,
  facets: (scope: string, savedSig: string) =>
    ["saved-listings", "facets", scope, savedSig] as const,
};
