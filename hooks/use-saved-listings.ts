"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toListing } from "@/lib/services/listings-map";
import {
  DISTRICTS,
  districtLabel,
  TYPES,
  type Listing,
} from "@/schemas/listing";
import { type Filters, type SortKey } from "@/schemas/filters";
import type { Database } from "@/lib/database.types";

/* Backend pagination for the Saved page.

   Instead of pulling every saved listing into the browser and slicing on the
   client, we translate the URL filter/sort into a Supabase query and ask the
   DB for just one page (`.range`) plus an exact `count`. The saved shortlist
   ids come from useSaved (DB rows for members, localStorage for guests) and
   scope the query via `.in("id", …)`.

   A second, tiny query (useSavedFacets) reads only the `district` column for
   the whole saved set — it feeds the filter panel's district chips and the
   header's total, which a single page of results can't provide. */

export const SAVED_PAGE_SIZE = 6;

type TypeSlug = Database["public"]["Enums"]["listing_type"];
type DistrictSlug = Database["public"]["Enums"]["district"];
type AmenitySlug = Database["public"]["Enums"]["amenity"];

/* Domain type label -> DB enum slug (reverse of listings-map's TYPE_LABELS). */
const TYPE_SLUG: Record<string, TypeSlug> = {
  Studio: "studio",
  Apartment: "apartment",
  Loft: "loft",
  Townhouse: "townhouse",
  House: "house",
};

/* Drop characters that would break a PostgREST filter expression. */
const sanitize = (s: string) => s.replace(/[(),\\%]/g, " ").trim();

/* OR clause for the free-text box. Matches the raw title/city/district
   columns and also expands district/type *labels* (what the user sees) back
   to their slugs, so typing "Hải Châu" or "Apartment" still hits — mirroring
   the old client-side `filterListings` q behaviour as closely as SQL allows. */
function textOr(q: string): string | null {
  const term = sanitize(q);
  if (!term) return null;
  const like = `%${term}%`;
  const lower = term.toLowerCase();
  const conds = [
    `title.ilike.${like}`,
    `city.ilike.${like}`,
    `district.ilike.${like}`,
  ];
  const districtSlugs = DISTRICTS.filter((d) =>
    districtLabel(d).toLowerCase().includes(lower)
  );
  if (districtSlugs.length)
    conds.push(`district.in.(${districtSlugs.join(",")})`);
  const typeSlugs = TYPES.filter((t) => t.toLowerCase().includes(lower)).map(
    (t) => TYPE_SLUG[t]
  );
  if (typeSlugs.length) conds.push(`type.in.(${typeSlugs.join(",")})`);
  return conds.join(",");
}

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
    queryKey: savedListingsKeys.page(scope, filters, sort, page),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SavedListingsPage> => {
      if (saved.length === 0) return { listings: [], total: 0 };
      const supabase = createClient();

      let query = supabase
        .from("listings")
        .select("*", { count: "exact" })
        .eq("status", "active")
        .in("id", saved);

      const or = textOr(filters.q);
      if (or) query = query.or(or);
      if (filters.type !== "All" && TYPE_SLUG[filters.type])
        query = query.eq("type", TYPE_SLUG[filters.type]);
      if (filters.district !== "All")
        query = query.eq("district", filters.district as DistrictSlug);
      if (filters.minPrice) query = query.gte("price", Number(filters.minPrice));
      if (filters.maxPrice) query = query.lte("price", Number(filters.maxPrice));
      if (filters.beds !== "Any") {
        if (filters.beds === "Studio") query = query.eq("beds", 0);
        else if (filters.beds === "3+") query = query.gte("beds", 3);
        else query = query.eq("beds", Number(filters.beds));
      }
      if (filters.amenities.length)
        query = query.contains("amenities", filters.amenities as AmenitySlug[]);

      if (sort === "low") query = query.order("price", { ascending: true });
      else if (sort === "high")
        query = query.order("price", { ascending: false });
      else if (sort === "area")
        query = query.order("area", { ascending: false, nullsFirst: false });
      else query = query.order("created_at", { ascending: true });

      const from = (page - 1) * SAVED_PAGE_SIZE;
      const { data, error, count } = await query.range(
        from,
        from + SAVED_PAGE_SIZE - 1
      );
      if (error) throw error;
      return { listings: (data ?? []).map(toListing), total: count ?? 0 };
    },
  });
}

/** Districts present in the saved set (for the filter chips) and the total
    number of saved active listings (for the header / empty state). Keyed by
    scope only — independent of filters/sort/page — so it's fetched once and
    then patched in place by useSaved on toggle. */
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
    queryKey: savedListingsKeys.facets(scope),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SavedFacets> => {
      if (saved.length === 0) return { districts: [], total: 0 };
      const supabase = createClient();
      const { data, error } = await supabase
        .from("listings")
        .select("district")
        .eq("status", "active")
        .in("id", saved);
      if (error) throw error;
      const districts = [...new Set(data.map((r) => r.district))].sort((a, b) =>
        districtLabel(a).localeCompare(districtLabel(b))
      );
      return { districts, total: data.length };
    },
  });
}
