import { districtLabel, type Listing } from "@/schemas/listing";
import { DEFAULT_FILTERS, type Filters } from "@/schemas/filters";
import { activeFilterCount, filterListings, parseFilters } from "./query";

/* Pure saved-search helpers (no React): serialize a filter set to/from the
   browse URL's query string, fingerprint it for dedupe, and describe it in
   words for the auto-generated name + summary chips. The email-side match in
   supabase/functions/saved-search-alerts ports the same predicate. */

/** Filters a search is worth saving over — the panel's active count plus the
    keyword, which activeFilterCount deliberately leaves out of its badge. */
export function savableFilterCount(f: Filters): number {
  return activeFilterCount(f) + Number(!!f.q.trim());
}

/** Canonical serialization: the same URL params the browse page reads, in a
    fixed order, defaults omitted. A saved search stores exactly this string. */
export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.type !== DEFAULT_FILTERS.type) p.set("type", f.type);
  if (f.district !== DEFAULT_FILTERS.district) p.set("district", f.district);
  if (f.minPrice) p.set("minPrice", f.minPrice);
  if (f.maxPrice) p.set("maxPrice", f.maxPrice);
  if (f.beds !== DEFAULT_FILTERS.beds) p.set("beds", f.beds);
  if (f.avail !== DEFAULT_FILTERS.avail) p.set("avail", f.avail);
  if (f.minArea) p.set("minArea", f.minArea);
  if (f.amenities.length) p.set("amenities", f.amenities.join(","));
  if (f.owner !== DEFAULT_FILTERS.owner) p.set("owner", f.owner);
  return p.toString();
}

/** Parse a stored query string back into a filter set. */
export function queryToFilters(queryString: string): Filters {
  return parseFilters(Object.fromEntries(new URLSearchParams(queryString)));
}

/** Order-independent fingerprint for "this search is already saved". */
export function searchSignature(f: Filters): string {
  return JSON.stringify({
    q: f.q.trim().toLowerCase(),
    type: f.type,
    district: f.district,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    beds: f.beds,
    avail: f.avail,
    minArea: f.minArea,
    amenities: [...f.amenities].sort(),
    owner: f.owner,
  });
}

/** How many active listings a saved search matches right now. */
export function countMatches(listings: Listing[], queryString: string): number {
  return filterListings(listings, queryToFilters(queryString), "featured")
    .length;
}

/* ---- Human-readable description ----
   Name reads like a sentence ("Apartments in Hải Châu under $2,000, 2 beds");
   chips carry every set filter for the card/dialog summaries. Localized via a
   translator scoped to the "apartments" namespace, so vi and en both come out
   grammatical (the sentence shape lives in the message templates). */

export type DescribeCtx = {
  /** Translator scoped to the "apartments" namespace. */
  t: (key: string, values?: Record<string, string | number>) => string;
  /** Locale-aware money formatter (useMoney). */
  money: (usd: number) => string;
};

function bedsLabel(beds: string, { t }: DescribeCtx): string {
  if (beds === "Studio") return t("filtersPanel.studio");
  if (beds === "3+") return t("savedSearches.describe.bedsThreePlus");
  return t("card.beds", { count: Number(beds) });
}

export function describeSearch(
  f: Filters,
  ctx: DescribeCtx
): { name: string; chips: string[] } {
  const { t, money } = ctx;
  const q = f.q.trim();

  let name =
    f.type !== "All"
      ? t(`savedSearches.nouns.${f.type}`)
      : t("savedSearches.nouns.any");
  if (f.district !== "All")
    name = t("savedSearches.describe.inDistrict", {
      name,
      district: districtLabel(f.district),
    });
  if (f.minPrice && f.maxPrice)
    name = t("savedSearches.describe.between", {
      name,
      min: money(+f.minPrice),
      max: money(+f.maxPrice),
    });
  else if (f.maxPrice)
    name = t("savedSearches.describe.under", { name, price: money(+f.maxPrice) });
  else if (f.minPrice)
    name = t("savedSearches.describe.over", { name, price: money(+f.minPrice) });
  if (f.beds !== "Any")
    name = t("savedSearches.describe.withBeds", {
      name,
      beds: bedsLabel(f.beds, ctx),
    });

  // A bare keyword search is just the quoted term.
  const onlyKeyword = !!q && savableFilterCount(f) === 1;
  if (onlyKeyword) name = `“${q}”`;

  const chips: string[] = [];
  if (q) chips.push(`“${q}”`);
  if (f.type !== "All") chips.push(t(`types.${f.type}`));
  if (f.district !== "All") chips.push(districtLabel(f.district));
  if (f.minPrice && f.maxPrice)
    chips.push(
      t("savedSearches.chips.between", {
        min: money(+f.minPrice),
        max: money(+f.maxPrice),
      })
    );
  else if (f.maxPrice)
    chips.push(t("savedSearches.chips.under", { price: money(+f.maxPrice) }));
  else if (f.minPrice)
    chips.push(t("savedSearches.chips.over", { price: money(+f.minPrice) }));
  if (f.beds !== "Any") chips.push(bedsLabel(f.beds, ctx));
  if (f.avail !== "any") chips.push(t(`filtersPanel.avail.${f.avail}`));
  if (f.minArea) chips.push(`${f.minArea} m²+`);
  for (const a of f.amenities) chips.push(t(`amenities.${a}`));
  if (f.owner !== "All") chips.push(t("savedSearches.chips.owner"));

  return { name: name.slice(0, 80), chips };
}
