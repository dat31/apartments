import {
  districtLabel,
  DEFAULT_BASE_LOCALE,
  type Listing,
  type LocalizedListing,
} from "@/schemas/listing";
import {
  AVAIL_KEYS,
  availCutoffISO,
  DEFAULT_FILTERS,
  type AvailKey,
  type Filters,
  type SortKey,
} from "@/schemas/filters";
import { availInfo } from "@/lib/data/listings";

/* Server-side reading of the listing query from the URL. The URL search
   params are the single source of truth for filter/sort/page state. */

export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 6;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function parseFilters(sp: SearchParams): Filters {
  const amenities = first(sp.amenities);
  const avail = first(sp.avail) as AvailKey | undefined;
  return {
    q: first(sp.q) ?? DEFAULT_FILTERS.q,
    type: first(sp.type) ?? DEFAULT_FILTERS.type,
    district: first(sp.district) ?? DEFAULT_FILTERS.district,
    minPrice: first(sp.minPrice) ?? DEFAULT_FILTERS.minPrice,
    maxPrice: first(sp.maxPrice) ?? DEFAULT_FILTERS.maxPrice,
    beds: first(sp.beds) ?? DEFAULT_FILTERS.beds,
    amenities: amenities ? amenities.split(",").filter(Boolean) : [],
    owner: first(sp.owner) ?? DEFAULT_FILTERS.owner,
    avail: avail && AVAIL_KEYS.includes(avail) ? avail : DEFAULT_FILTERS.avail,
    minArea: first(sp.minArea) ?? DEFAULT_FILTERS.minArea,
  };
}

const SORTS: SortKey[] = ["featured", "newest", "low", "high", "area"];
export function parseSort(sp: SearchParams): SortKey {
  const s = first(sp.sort) as SortKey | undefined;
  return s && SORTS.includes(s) ? s : "featured";
}

export function parsePage(sp: SearchParams): number {
  const p = Number(first(sp.page));
  return Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
}

/* What the free-text box matches against.

   The titles are plural on purpose: this runs *before* localizeListing (see
   browse.tsx), so a listing still carries its copy in every language, and an
   English query has to be able to find a home whose base copy is Vietnamese.
   Localizing first would quietly shrink search to whatever is on screen.

   Titles only, in every language — descriptions stay out of the haystack in
   all of them. Matching prose is a much broader change to what search returns
   (every home that merely *mentions* a district would start matching a
   district query), and it isn't what makes search bilingual. Keep the two
   decisions separate; `lib/services/saved-listings.ts` textOr and the alerts
   edge function both mirror this choice. */
function haystack(l: Listing): string {
  const titles = [l.title, ...Object.values(l.i18n ?? {}).map((t) => t.title)];
  return [...titles, l.district, districtLabel(l.district), l.city, l.type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/* The other half of a bilingual search: a renter types English words and gets
   back a home whose card is in Vietnamese, because the match came from copy
   they aren't being shown. That pairing has to read as deliberate rather than
   buggy, so the card says which language the words were found in.

   Deliberately silent whenever the reader can see why the home came back —
   the title on the card contains the query, or it matched the district, city
   or home type, which the card also shows. Both halves mirror `haystack`
   exactly: any field this checks that search doesn't (or the reverse) would
   put an explanation on a card that doesn't need one, or leave one bare. */
export function unshownMatchLocales(l: LocalizedListing, q: string): string[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  const shown = [
    l.title,
    l.district,
    districtLabel(l.district),
    l.city,
    l.type,
  ];
  if (shown.some((s) => s?.toLowerCase().includes(needle))) return [];

  const base = l.baseLocale ?? DEFAULT_BASE_LOCALE;
  const titles: [string, string | undefined][] = [
    [base, l.baseTitle],
    ...Object.entries(l.i18n ?? {}).map(
      ([locale, text]) => [locale, text.title] as [string, string | undefined]
    ),
  ];
  return [
    ...new Set(
      titles
        .filter(([, title]) => title?.toLowerCase().includes(needle))
        .map(([locale]) => locale)
    ),
  ];
}

export function filterListings(
  listings: Listing[],
  filters: Filters,
  sort: SortKey
): Listing[] {
  let r = listings.filter((l) => l.status === "active");
  const q = filters.q.trim().toLowerCase();
  if (q) r = r.filter((l) => haystack(l).includes(q));
  if (filters.type !== "All") r = r.filter((l) => l.type === filters.type);
  if (filters.district !== "All")
    r = r.filter((l) => l.district === filters.district);
  if (filters.owner !== "All") r = r.filter((l) => l.owner === filters.owner);
  if (filters.minPrice) r = r.filter((l) => l.price >= +filters.minPrice);
  if (filters.maxPrice) r = r.filter((l) => l.price <= +filters.maxPrice);
  if (filters.beds !== "Any") {
    if (filters.beds === "Studio") r = r.filter((l) => l.beds === 0);
    else if (filters.beds === "3+") r = r.filter((l) => l.beds >= 3);
    else r = r.filter((l) => l.beds === +filters.beds);
  }
  if (filters.minArea) r = r.filter((l) => l.area >= +filters.minArea);
  if (filters.avail !== "any") {
    // Cumulative window: "available now" passes every horizon; a dated
    // listing passes when its date is on or before the cutoff.
    const cutoff = new Date(availCutoffISO(filters.avail) + "T00:00:00");
    r = r.filter((l) => {
      const info = availInfo(l);
      return info.kind === "now" || info.date <= cutoff;
    });
  }
  if (filters.amenities.length)
    r = r.filter((l) => filters.amenities.every((a) => l.amenities.includes(a)));
  if (sort === "low") r = [...r].sort((a, b) => a.price - b.price);
  else if (sort === "high") r = [...r].sort((a, b) => b.price - a.price);
  else if (sort === "area") r = [...r].sort((a, b) => b.area - a.area);
  else if (sort === "newest")
    r = [...r].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    );
  return r;
}

export function getDistricts(listings: Listing[]): string[] {
  return [
    ...new Set(
      listings.filter((l) => l.status === "active").map((l) => l.district)
    ),
  ].sort((a, b) => districtLabel(a).localeCompare(districtLabel(b)));
}

export function activeFilterCount(f: Filters): number {
  return (
    Number(f.type !== "All") +
    Number(f.district !== "All") +
    Number(f.owner !== "All") +
    Number(!!f.minPrice) +
    Number(!!f.maxPrice) +
    Number(f.beds !== "Any") +
    Number(f.avail !== "any") +
    Number(!!f.minArea) +
    f.amenities.length
  );
}
