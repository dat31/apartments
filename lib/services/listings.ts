import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { type Listing, type ListingCore } from "@/schemas/listing";
import { PALETTE } from "@/lib/data/listings";
import type { Tables, TablesInsert } from "@/lib/database.types";
import {
  getDistrictTiles,
  getNewest,
  getTrending,
  SHOWCASE_SIZE,
  type DistrictTile,
} from "@/app/[lang]/lib/landing";
import {
  LISTING_SELECT,
  toListing,
  toListingWrite,
  toTranslationRows,
  type TranslationWrite,
} from "./listings-map";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   Listings service — the single path between Supabase and the
   app's domain `Listing` type. Components never talk to the DB
   directly; they call these functions and receive domain objects,
   so the rest of the app stays unaware of column names, enum
   casing, and FK ids.

   Two halves, and the split is the cookie:

   • Public reads (most of this file) — anon-readable active
     listings through the cookieless client, inside "use cache"
     boundaries tagged "listings".
   • Owner reads and writes (bottom) — the dashboard's own drafts
     and every mutation, through the cookie-bound client. Never
     cached, and never trusting an owner id from the caller.

   The pure row ↔ domain mapping lives in ./listings-map, which
   stays free of `server-only`, caching and React so it can be
   reasoned about — and tested — on its own. Every read below
   selects LISTING_SELECT, so the listings it returns carry their
   copy in *every* locale; resolving to one is a page-boundary
   job (localizeListing), not this layer's.
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
    .select(LISTING_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  return (data ?? []).map(toListing);
}

/** Active listings for a set of ids, in the order asked for, skipping any that
    aren't active (or no longer exist).

    Derived from getActiveListings rather than querying by id: that entry is
    already cached and shared with browse and the landing sections, so this
    costs no extra round trip. Deliberately *not* its own "use cache" boundary —
    the ids would become part of the cache key, and one entry per combination of
    recently-viewed or compared homes is a lot of entries for no benefit. */
export async function getActiveListingsByIds(
  ids: string[]
): Promise<Listing[]> {
  if (ids.length === 0) return [];

  const byId = new Map((await getActiveListings()).map((l) => [l.id, l]));
  return ids
    .map((id) => byId.get(id))
    .filter((listing): listing is Listing => Boolean(listing));
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

  return {
    listings: getNewest(await getActiveListings(), SHOWCASE_SIZE),
    now: Date.now(),
  };
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
  /* Same size as the newest row — this set is what keeps the two disjoint, so
     it has to cover exactly what that row renders. */
  const newest = getNewest(listings, SHOWCASE_SIZE);
  return {
    listings: getTrending(
      listings,
      SHOWCASE_SIZE,
      new Set(newest.map((l) => l.id))
    ),
    now: Date.now(),
  };
}

/** An owner's active listings, oldest first, plus the cache's reference time
    for the cards' relative availability labels — the owner page prerenders,
    and reading the clock is only allowed inside a cache boundary like this
    one. Anything that isn't a profile uuid yields [] rather than a query. */
export async function getListingsByOwner(
  ownerId: string
): Promise<{ listings: Listing[]; now: number }> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings", `owner-listings:${ownerId}`);

  if (!UUID_RE.test(ownerId)) return { listings: [], now: Date.now() };

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Failed to load owner listings: ${error.message}`);
  return { listings: (data ?? []).map(toListing), now: Date.now() };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Profile uuids of every host with at least one active listing — the owner
    pages worth prerendering and listing in the sitemap. Shares
    getActiveListings' cache entry, so it costs no extra query. */
export async function getActiveOwnerIds(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");

  const listings = await getActiveListings();
  return [...new Set(listings.map((l) => l.owner))];
}

export type SimilarResult = {
  picks: Listing[];
  districtScoped: boolean;
  /** Reference time for the picks' availability labels — the row renders the
      server-side ListingCard, and the clock may only be read in here. */
  now: number;
};

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
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active")
      .limit(30);

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

  return {
    picks: rankSimilar(rows.map(toListing), listing, n),
    districtScoped,
    now: Date.now(),
  };
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
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load listing: ${error.message}`);
  return data ? toListing(data) : null;
}

/** A single listing plus the cache's reference time, for the detail page's
    server-rendered availability (the JSON-LD offer). Reading the clock is only
    allowed inside a cache boundary — same rule as the showcase fetchers above —
    and doing it here is what keeps the detail route prerenderable. Shares
    getListingById's cache entry, so this adds no extra query. */
export async function getListingDetail(id: string): Promise<{
  listing: Listing | null;
  now: number;
}> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings", `listing:${id}`);

  return { listing: await getListingById(id), now: Date.now() };
}

/* ============================================================
   The signed-in owner's listings — the dashboard's read path and
   every write.

   Cookie-bound, so none of it is cached. The owner is always the
   session's user, never an argument: there is no signature below
   that lets a caller name whose listings to touch.

   RLS (owner_id = auth.uid() on insert/update/delete) is the last
   line, but each write also states the ownership it expects in
   its own filter and checks that a row actually matched — so an
   id belonging to someone else reads as "not-found" here rather
   than as a silent no-op the UI reports as success.
   ============================================================ */

/** Every listing the caller owns, newest first — drafts included.

    Memoized per request like getSessionUser(): the dashboard reads this from
    the layout (stats, nav) and again from the tab page, and they should share
    one round trip. Cookie-bound, so this is request memoization and nothing
    more — no entry outlives the request, and cache() does not reach inside a
    "use cache" boundary. */
export const listMyListings = cache(async (): Promise<Listing[]> => {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new ServiceError("failed", error.message);
  return (data ?? []).map(toListing);
});

/** Create a listing owned by the caller, with whatever translations its core
    carries. */
export async function createListing(
  core: ListingCore,
  status: Listing["status"]
): Promise<Listing> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    /* ListingCore guarantees the insert-required fields; toListingWrite widens
       them to optional (it's shared with the update path), so cast. owner_id
       comes from the session — the client never gets a say. */
    .insert({
      ...toListingWrite(core, status),
      owner_id: user.id,
      palette: Math.floor(Math.random() * PALETTE.length),
    } as TablesInsert<"listings">)
    .select("*")
    .single();

  if (error) {
    console.error("[listings] insert failed", error);
    throw new ServiceError("failed", error.message);
  }

  // The insert above proved ownership (owner_id came from the session), so
  // the translation write can trust this id.
  const translations = toTranslationRows(data.id, core);
  await writeTranslations(supabase, data.id, translations);
  // The rows we just wrote *are* the listing's translations, so the returned
  // Listing is complete without a second read.
  return toListing({ ...data, listing_translations: translations });
}

/** Overwrite the editable columns of a listing the caller owns, and bring its
    translations to exactly what `core` asks for.

    The core is the *complete* desired state of the copy, so a locale it
    doesn't mention is one the owner cleared, and its row is deleted. Callers
    that only mean to touch some other field must not route through here (see
    setListingStatus, which patches `status` alone). */
export async function updateListing(
  id: string,
  core: ListingCore,
  status: Listing["status"]
): Promise<string> {
  // Ownership is decided by this call, on the query that states it; the
  // translation writes below run only because it returned a row.
  await writeOwnedListing(id, toListingWrite(core, status));

  const supabase = await createClient();
  await writeTranslations(supabase, id, toTranslationRows(id, core));
  return id;
}

/** Flip a listing the caller owns between active and draft. */
export async function setListingStatus(
  id: string,
  status: Listing["status"]
): Promise<string> {
  return writeOwnedListing(id, { status });
}

/** Delete a listing the caller owns. */
export async function deleteListing(id: string): Promise<string> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id");

  if (error) {
    console.error("[listings] delete failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
  return id;
}

/** What provisioning a listing's message thread needs to know: the owner to
    open it with, and the fields denormalised onto the channel for its header
    chip. A domain `Listing` would carry far more than Stream should hold. */
export type ListingChatContext = Pick<
  Tables<"listings">,
  "id" | "title" | "owner_id" | "price" | "images"
>;

/** The listing behind a chat thread, or null when it isn't visible. */
export async function getListingForChat(
  id: string
): Promise<ListingChatContext | null> {
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, title, owner_id, price, images")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ServiceError("failed", error.message);
  return data ?? null;
}

/* Bring a listing's `listing_translations` rows to exactly `rows`: drop the
   locales that are no longer there, then upsert the ones that are.

   Called only after the caller's ownership of `listingId` has been established
   by the `listings` write that precedes it — RLS on this table checks the same
   thing again, and is the last line rather than the only one.

   supabase-js cannot transact across two tables, and the plan is explicit that
   a Postgres function to make it atomic would be the wrong trade: it would
   move the ownership check off the query that states it. So the failure mode
   is a listing whose base copy saved and whose translations didn't — visible,
   harmless (every read falls back to the base copy), and fixed by saving
   again. It throws rather than passing silently, so the owner is told. */
async function writeTranslations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  rows: TranslationWrite[]
): Promise<void> {
  const kept = rows.map((r) => r.locale);

  let remove = supabase
    .from("listing_translations")
    .delete()
    .eq("listing_id", listingId);
  // PostgREST needs the list parenthesised; with nothing kept, every row for
  // this listing goes — which is how an owner clears their last translation.
  if (kept.length) remove = remove.not("locale", "in", `(${kept.join(",")})`);

  const { error: deleteError } = await remove;
  if (deleteError) {
    console.error("[listings] translation delete failed", deleteError);
    throw new ServiceError("failed", deleteError.message);
  }

  if (!rows.length) return;

  const { error } = await supabase
    .from("listing_translations")
    .upsert(rows, { onConflict: "listing_id,locale" });

  if (error) {
    console.error("[listings] translation upsert failed", error);
    throw new ServiceError("failed", error.message);
  }
}

/* The shared body of the two update paths: filter on the caller's ownership,
   then require that a row came back. Returns the id so the action knows what
   to invalidate. */
async function writeOwnedListing(
  id: string,
  patch: ReturnType<typeof toListingWrite> | { status: Listing["status"] }
): Promise<string> {
  const user = await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id");

  if (error) {
    console.error("[listings] update failed", error);
    throw new ServiceError("failed", error.message);
  }
  if (!data?.length) throw new ServiceError("not-found");
  return id;
}
