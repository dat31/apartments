"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchSavedFacets,
  fetchSavedListingsPage,
} from "@/lib/actions/saved-listings";
import { unwrap } from "@/lib/actions/result";
import { type Filters, type SortKey } from "@/schemas/filters";

/* Backend pagination for the Saved page.

   Instead of pulling every saved listing into the browser and slicing on the
   client, the URL's filter/sort is handed to the actions in
   @/lib/actions/saved-listings, which ask the DB for just one page plus an
   exact count. The saved shortlist ids come from useSaved (DB rows for
   members, localStorage for guests) and scope the query — which is why they
   travel as an argument rather than being derived server-side.

   A second, tiny query (useSavedFacets) reads only the districts of the whole
   saved set — it feeds the filter panel's chips and the header's total, which
   a single page of results can't provide. */

/* Re-exported so the pager and list keep their existing import site. */
export { SAVED_PAGE_SIZE } from "@/schemas/filters";

export {
  savedListingsKeys,
  savedSignature,
  type SavedListingsPage,
  type SavedFacets,
} from "./saved-listings-keys";
import {
  savedListingsKeys,
  savedSignature,
  type SavedListingsPage,
  type SavedFacets,
} from "./saved-listings-keys";

/** One filtered, sorted, paginated page of the user's saved listings, plus the
    total matching count so the pager knows how many pages there are. */
export function useSavedListingsPage({
  scope,
  saved,
  filters,
  sort,
  page,
  enabled = true,
}: {
  scope: string;
  saved: string[];
  filters: Filters;
  sort: SortKey;
  page: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: savedListingsKeys.page(
      scope,
      savedSignature(saved),
      filters,
      sort,
      page
    ),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SavedListingsPage> => {
      if (saved.length === 0) return { listings: [], total: 0 };
      return unwrap(
        await fetchSavedListingsPage({ saved, filters, sort, page })
      );
    },
  });
}

/** Districts present in the saved set (for the filter chips) and the total
    number of saved active listings (for the header / empty state). Keyed by
    scope + the saved-id signature only — independent of filters/sort/page — so
    it's fetched once per shortlist and reused across every filter change. */
export function useSavedFacets({
  scope,
  saved,
  enabled = true,
}: {
  scope: string;
  saved: string[];
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: savedListingsKeys.facets(scope, savedSignature(saved)),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SavedFacets> => {
      if (saved.length === 0) return { districts: [], total: 0 };
      return unwrap(await fetchSavedFacets(saved));
    },
  });
}
