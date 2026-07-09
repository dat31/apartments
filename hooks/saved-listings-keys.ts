import type { Listing } from "@/schemas/listing";
import type { Filters, SortKey } from "@/schemas/filters";

/* Query keys + cache shapes for the saved-listings queries, split from
   use-saved-listings so useSaved (bundled on every page with a SaveButton,
   including the landing showcase) can patch/invalidate the cache without
   pulling that hook's supabase/zod dependencies into its bundle. */

export type SavedListingsPage = { listings: Listing[]; total: number };
export type SavedFacets = { districts: string[]; total: number };

/* Keys are scoped per user ("guest" for anon) + filters/sort/page — deliberately
   NOT by the saved-id set. That way toggling a save doesn't re-key the query and
   trigger a refetch; instead useSaved patches the cached data in place (drop the
   card, decrement totals), so removing a saved home updates the list without a
   flash or layout shift. The saved ids still scope the DB query via a closure. */
export const savedListingsKeys = {
  /** Prefixes for cache-patching every cached page / facets entry at once. */
  pages: ["saved-listings", "page"] as const,
  facetsAll: ["saved-listings", "facets"] as const,
  page: (
    scope: string,
    filters: Filters,
    sort: SortKey,
    page: number
  ) => ["saved-listings", "page", scope, filters, sort, page] as const,
  facets: (scope: string) => ["saved-listings", "facets", scope] as const,
};
