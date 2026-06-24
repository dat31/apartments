import { type Listing } from "@/schemas/listing";
import {
  DEFAULT_FILTERS,
  type Filters,
  type SortKey,
} from "@/schemas/filters";

/* Server-side reading of the listing query from the URL. The URL search
   params are the single source of truth for filter/sort/page state. */

export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 6;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function parseFilters(sp: SearchParams): Filters {
  const amenities = first(sp.amenities);
  return {
    q: first(sp.q) ?? DEFAULT_FILTERS.q,
    type: first(sp.type) ?? DEFAULT_FILTERS.type,
    district: first(sp.district) ?? DEFAULT_FILTERS.district,
    minPrice: first(sp.minPrice) ?? DEFAULT_FILTERS.minPrice,
    maxPrice: first(sp.maxPrice) ?? DEFAULT_FILTERS.maxPrice,
    beds: first(sp.beds) ?? DEFAULT_FILTERS.beds,
    amenities: amenities ? amenities.split(",").filter(Boolean) : [],
  };
}

const SORTS: SortKey[] = ["featured", "low", "high", "area"];
export function parseSort(sp: SearchParams): SortKey {
  const s = first(sp.sort) as SortKey | undefined;
  return s && SORTS.includes(s) ? s : "featured";
}

export function parsePage(sp: SearchParams): number {
  const p = Number(first(sp.page));
  return Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
}

export function filterListings(
  listings: Listing[],
  filters: Filters,
  sort: SortKey
): Listing[] {
  let r = listings.filter((l) => l.status === "active");
  const q = filters.q.trim().toLowerCase();
  if (q)
    r = r.filter((l) =>
      (l.title + l.district + l.city + l.type).toLowerCase().includes(q)
    );
  if (filters.type !== "All") r = r.filter((l) => l.type === filters.type);
  if (filters.district !== "All")
    r = r.filter((l) => l.district === filters.district);
  if (filters.minPrice) r = r.filter((l) => l.price >= +filters.minPrice);
  if (filters.maxPrice) r = r.filter((l) => l.price <= +filters.maxPrice);
  if (filters.beds !== "Any") {
    if (filters.beds === "Studio") r = r.filter((l) => l.beds === 0);
    else if (filters.beds === "3+") r = r.filter((l) => l.beds >= 3);
    else r = r.filter((l) => l.beds === +filters.beds);
  }
  if (filters.amenities.length)
    r = r.filter((l) => filters.amenities.every((a) => l.amenities.includes(a)));
  if (sort === "low") r = [...r].sort((a, b) => a.price - b.price);
  else if (sort === "high") r = [...r].sort((a, b) => b.price - a.price);
  else if (sort === "area") r = [...r].sort((a, b) => b.area - a.area);
  return r;
}

export function getDistricts(listings: Listing[]): string[] {
  return [
    ...new Set(
      listings.filter((l) => l.status === "active").map((l) => l.district)
    ),
  ].sort();
}

export function activeFilterCount(f: Filters): number {
  return (
    Number(f.type !== "All") +
    Number(f.district !== "All") +
    Number(!!f.minPrice) +
    Number(!!f.maxPrice) +
    Number(f.beds !== "Any") +
    f.amenities.length
  );
}
