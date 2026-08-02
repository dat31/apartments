import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { LISTING_SELECT, toListing } from "./listings-map";
import { DISTRICTS, districtLabel, TYPES } from "@/schemas/listing";
import {
  availCutoffISO,
  SAVED_PAGE_SIZE,
  type Filters,
  type SortKey,
} from "@/schemas/filters";
import type {
  SavedFacets,
  SavedListingsPage,
} from "@/hooks/saved-listings-keys";
import type { Database } from "@/lib/database.types";
import { ServiceError } from "./errors";
import { requireUser } from "./session";

/* ============================================================
   The Saved page — the shortlist itself, and the paginated view
   of the listings on it.

   Two different trust levels in one file, deliberately:

   • The shortlist (`saved_listings`) is per-user and cookie-bound.
     Which rows are the caller's is decided by the session.
   • The page and facet queries read public active listings,
     scoped by the ids passed in. Those ids are an input, not a
     credential: guests keep their shortlist in localStorage, so
     the client has to be able to name them, and nothing here is
     visible that browse wouldn't already show.

   The filtering runs here rather than in the browser so the
   database returns one page instead of every saved home.
   ============================================================ */

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

/* Ids of shortlisted listings whose *translated* title matches the query.

   Two queries rather than one because PostgREST cannot `or()` across a parent
   column and an embedded resource in a single expression — the translation
   half has to be resolved to ids first and folded back into the main `or` as
   `id.in.(…)`. Bounded by the shortlist, which is small and already an input
   to this function, so it stays one cheap indexed lookup.

   Titles only, matching filterListings' haystack: the browse page and the
   saved page have to agree about what a query matches, or the same `q` would
   return different homes on two screens. sanitize() applies here for the same
   reason it applies below — same PostgREST expression grammar, same injection
   surface. */
async function translatedIds(
  supabase: ReturnType<typeof createPublicClient>,
  saved: string[],
  q: string
): Promise<string[]> {
  const term = sanitize(q);
  if (!term) return [];

  const { data, error } = await supabase
    .from("listing_translations")
    .select("listing_id")
    .in("listing_id", saved)
    .ilike("title", `%${term}%`);

  if (error) throw new ServiceError("failed", error.message);
  return [...new Set((data ?? []).map((r) => r.listing_id))];
}

/* OR clause for the free-text box. Matches the raw title/city columns and
   expands district/type *labels* (what the user sees) back to their slugs, so
   typing "Hải Châu" or "Apartment" still hits — mirroring the old client-side
   `filterListings` q behaviour as closely as SQL allows.

   This half sees only the base copy on `listings`; the translated titles come
   from translatedIds() above and join in as one more `id.in.(…)` condition.

   district is a Postgres enum, which has no ilike operator (`district.ilike`
   errors with 42883 and fails the whole query), so district matching goes
   only through the label->slug expansion below, never a raw ilike. */
function textOr(q: string): string | null {
  const term = sanitize(q);
  if (!term) return null;
  const like = `%${term}%`;
  const lower = term.toLowerCase();
  const conds = [`title.ilike.${like}`, `city.ilike.${like}`];
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

/** One filtered, sorted, paginated page of a shortlist, plus the total
    matching count so the pager knows how many pages there are. */
export async function getSavedListingsPage({
  saved,
  filters,
  sort,
  page,
}: {
  saved: string[];
  filters: Filters;
  sort: SortKey;
  page: number;
}): Promise<SavedListingsPage> {
  if (saved.length === 0) return { listings: [], total: 0 };

  const supabase = createPublicClient();
  let query = supabase
    .from("listings")
    .select(LISTING_SELECT, { count: "exact" })
    .eq("status", "active")
    .in("id", saved);

  const or = textOr(filters.q);
  if (or) {
    // A home saved in Vietnamese is still findable by its English title.
    const ids = await translatedIds(supabase, saved, filters.q);
    query = query.or(ids.length ? `${or},id.in.(${ids.join(",")})` : or);
  }
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
  if (filters.minArea) query = query.gte("area", Number(filters.minArea));
  // Mirrors filterListings' availability window: null available_from means
  // "available now" and passes every horizon.
  if (filters.avail !== "any")
    query = query.or(
      `available_from.is.null,available_from.lte.${availCutoffISO(filters.avail)}`
    );
  if (filters.amenities.length)
    query = query.contains("amenities", filters.amenities as AmenitySlug[]);

  if (sort === "low") query = query.order("price", { ascending: true });
  else if (sort === "high") query = query.order("price", { ascending: false });
  else if (sort === "area")
    query = query.order("area", { ascending: false, nullsFirst: false });
  else if (sort === "newest")
    query = query.order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: true });

  const from = (page - 1) * SAVED_PAGE_SIZE;
  const { data, error, count } = await query.range(
    from,
    from + SAVED_PAGE_SIZE - 1
  );

  if (error) throw new ServiceError("failed", error.message);
  return { listings: (data ?? []).map(toListing), total: count ?? 0 };
}

/** Districts present in a shortlist (for the filter chips) and the total number
    of saved active listings (for the header / empty state) — neither of which a
    single page of results can provide. */
export async function getSavedFacets(saved: string[]): Promise<SavedFacets> {
  if (saved.length === 0) return { districts: [], total: 0 };

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listings")
    .select("district")
    .eq("status", "active")
    .in("id", saved);

  if (error) throw new ServiceError("failed", error.message);

  const rows = data ?? [];
  const districts = [...new Set(rows.map((r) => r.district))].sort((a, b) =>
    districtLabel(a).localeCompare(districtLabel(b))
  );
  return { districts, total: rows.length };
}

/* ---- the shortlist itself (per-user) ---- */

/** The caller's saved listing ids, most recently saved first. */
export async function listMySavedIds(): Promise<string[]> {
  await requireUser();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .order("created_at", { ascending: false });

  if (error) throw new ServiceError("failed", error.message);
  return (data ?? []).map((row) => row.listing_id);
}

/** Add or remove one listing from the caller's shortlist. Idempotent in both
    directions: saving twice is not an error, and neither is unsaving what was
    never saved — the Heart is a toggle, and two tabs may disagree about which
    way it currently points. */
export async function setSaved(
  listingId: string,
  next: boolean
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  if (next) {
    const { error } = await supabase
      .from("saved_listings")
      .insert({ profile_id: user.id, listing_id: listingId });
    // 23505 = already saved (unique_violation) — treat as success.
    if (error && error.code !== "23505") {
      console.error("[saved-listings] insert failed", error);
      throw new ServiceError("failed", error.message);
    }
    return;
  }

  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("profile_id", user.id)
    .eq("listing_id", listingId);

  if (error) {
    console.error("[saved-listings] delete failed", error);
    throw new ServiceError("failed", error.message);
  }
}

/** Fold a guest's localStorage shortlist into the caller's rows on sign-in, so
    nothing saved logged-out is lost. Ignores duplicates rather than failing, so
    it is safe to call more than once. */
export async function mergeGuestSaved(listingIds: string[]): Promise<void> {
  const user = await requireUser();
  if (listingIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("saved_listings").upsert(
    listingIds.map((listing_id) => ({ profile_id: user.id, listing_id })),
    { onConflict: "profile_id,listing_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[saved-listings] guest merge failed", error);
    throw new ServiceError("failed", error.message);
  }
}
