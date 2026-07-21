import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { type Listing } from "@/schemas/listing";
import {
  getDistrictTiles,
  getNewest,
  getTrending,
  type DistrictTile,
} from "@/app/[lang]/lib/landing";
import { OWNER_ID_BY_KEY, toListing } from "./listings-map";

/* ============================================================
   Listings service — the single read path between Supabase and
   the app's domain `Listing` type. Components never talk to the
   DB directly; they call these functions and receive domain
   objects, so the rest of the app stays unaware of column names,
   enum casing, and FK ids.

   The pure row → domain mapping lives in ./listings-map so it can
   also run in the browser (see hooks/use-saved-listings).
   ============================================================ */

/** All active listings, oldest first. Cached across requests via "use cache";
    invalidate with revalidateTag("listings") when a listing changes. Uses the
    cookieless public client since active listings are anon-readable (RLS) — a
    cookie-bound client can't be used inside a cache boundary. */
export async function getActiveListings(): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");

  return fetchActiveListings();
}

/** The raw active-listings query, oldest first. Cached by its callers, not
    here, so different callers can pick their own cacheLife (see the landing
    showcase fetchers below). */
async function fetchActiveListings(): Promise<Listing[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  return (data ?? []).map(toListing);
}

/* --- Landing showcase fetchers -------------------------------------------
   One fetcher per landing section (browse-by-district, newest, trending) so
   each section component streams behind its own Suspense boundary. All three
   are "use cache" boundaries on a 30-minute revalidation, so the whole landing
   page is prebuilt at build time and served from cache; every 30 minutes each
   regenerates. They share getActiveListings' cache entry, so the underlying
   query runs at most once per revalidation, not once per section. Tagged
   "listings" so a listing edit's revalidateTag busts them immediately.

   The newest/trending fetchers also return `now`, the reference time for the
   cards' relative availability labels (see availInfo/ListingCard). Reading the
   clock is only allowed inside these cache boundaries. */

const SHOWCASE_LIFE = { stale: 300, revalidate: 1800, expire: 3600 };

/** Active listings grouped by district for the "browse by district" section. */
export async function getDistrictShowcase(): Promise<DistrictTile[]> {
  "use cache";
  cacheLife(SHOWCASE_LIFE);
  cacheTag("listings");

  return getDistrictTiles(await getActiveListings());
}

/** Freshest active homes, newest-first, plus the cache's reference time. */
export async function getNewestShowcase(): Promise<{
  listings: Listing[];
  now: number;
}> {
  "use cache";
  cacheLife(SHOWCASE_LIFE);
  cacheTag("listings");

  return { listings: getNewest(await getActiveListings()), now: Date.now() };
}

/** Most-watched active homes, kept disjoint from the newest row so no home
    appears in both, plus the cache's reference time. */
export async function getTrendingShowcase(): Promise<{
  listings: Listing[];
  now: number;
}> {
  "use cache";
  cacheLife(SHOWCASE_LIFE);
  cacheTag("listings");

  const listings = await getActiveListings();
  const newest = getNewest(listings);
  return {
    listings: getTrending(listings, 4, new Set(newest.map((l) => l.id))),
    now: Date.now(),
  };
}

/** A seed owner's active listings, oldest first. Reads the real `listings`
    rows (uuid ids) so cards can be saved/shortlisted — unlike the seed data,
    whose "l1"-style ids have no matching row. Unknown owner keys yield []. */
export async function getListingsByOwner(ownerKey: string): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings", `owner-listings:${ownerKey}`);

  // Seed owners map their key → uuid; real owners are already a uuid.
  const ownerId =
    OWNER_ID_BY_KEY[ownerKey] ?? (UUID_RE.test(ownerKey) ? ownerKey : null);
  if (!ownerId) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Failed to load owner listings: ${error.message}`);
  return (data ?? []).map(toListing);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SimilarResult = { picks: Listing[]; districtScoped: boolean };

/** Homes similar to `listing` for the detail page's "Similar homes" row.
    A dedicated, per-listing query — not the whole getActiveListings set: it
    pulls only active listings in the same district, broadening to the same
    city when the district is too thin to fill the row, then ranks the
    candidates by likeness (type, price, beds, area) and returns the best `n`.
    Cached per listing under the shared "listings" tag, so editing any listing
    still refreshes the row. */
export async function getSimilarListings(
  listing: Listing,
  n = 3
): Promise<SimilarResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings", `similar:${listing.id}`);

  const supabase = createPublicClient();
  const active = () =>
    supabase.from("listings").select("*").eq("status", "active").limit(30);

  const { data: inDistrict, error } = await active().eq(
    "district",
    listing.district
  );
  if (error)
    throw new Error(`Failed to load similar listings: ${error.message}`);

  let rows = inDistrict ?? [];
  // Enough same-district homes (besides the current one) to fill the row?
  const districtScoped =
    rows.filter((r) => r.id !== listing.id).length >= n;

  if (!districtScoped) {
    // Broaden to the wider city, de-duping the district rows already fetched.
    const { data: inCity, error: cityErr } = await active().eq(
      "city",
      listing.city
    );
    if (cityErr)
      throw new Error(`Failed to load similar listings: ${cityErr.message}`);
    const seen = new Set(rows.map((r) => r.id));
    rows = [...rows, ...(inCity ?? []).filter((r) => !seen.has(r.id))];
  }

  return { picks: rankSimilar(rows.map(toListing), listing, n), districtScoped };
}

/* Rank candidate listings by likeness to `current` and take the best `n`. The
   query already scopes candidates to the district/city; this orders them by
   type match and price/bed/area proximity, and drops the current listing.
   Strong bonuses for same district/type, continuous penalties as price, bed
   count, and area drift. */
function rankSimilar(
  candidates: Listing[],
  current: Listing,
  n: number
): Listing[] {
  const score = (l: Listing) => {
    let s = 0;
    if (l.district === current.district) s += 100;
    if (l.city === current.city) s += 20;
    if (l.type === current.type) s += 30;
    s -= Math.min(35, Math.abs(l.price - current.price) / 100); // price
    s -= Math.abs((l.beds || 0) - (current.beds || 0)) * 6; // bedrooms
    s -= Math.min(15, Math.abs((l.area || 0) - (current.area || 0)) / 12); // area
    return s;
  };
  return candidates
    .filter((l) => l.id !== current.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}

/** A single listing by id, or null if not found / not accessible.
    RLS only exposes active listings to anonymous visitors. Non-uuid ids
    (e.g. legacy seed ids) return null so callers can fall back. */
export async function getListingById(id: string): Promise<Listing | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings", `listing:${id}`);

  if (!UUID_RE.test(id)) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  return data ? toListing(data) : null;
}
