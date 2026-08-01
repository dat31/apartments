import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { toVirtualTour } from "@/lib/virtual-tour/tour-map";
import type { VirtualTour } from "@/schemas/virtual-tour";

/* ============================================================
   Virtual tours service — the single read path for 360° tours.

   Rows come from `listing_virtual_tours` + `virtual_tour_scenes`
   (supabase/migrations/20260731120000_virtual_tours.sql); the pure
   row → domain mapping lives in lib/virtual-tour/tour-map.

   Reads go through the cookieless public client, like the listings
   service: a published tour on an active listing is anon-readable by
   RLS, and a cookie-bound client can't be used inside a cache
   boundary. That policy is also why "is the listing active?" is not
   re-checked here — the database refuses to hand over rows the
   visitor shouldn't see, rather than this code remembering to.

   Tagged "virtual-tours" *and* "listings": a tour is its own row now,
   but publishing one flips listings.has_virtual_tour, so the listing
   caches have to be invalidated with it.
   ============================================================ */

/* PostgREST needs the foreign key named here. There are two between these
   tables — scenes.tour_id and tours.entry_scene_id — so an unqualified embed
   is ambiguous and fails at runtime. */
const TOUR_WITH_SCENES =
  "*, virtual_tour_scenes!virtual_tour_scenes_tour_id_fkey(*)";

/** The published tour for a listing, or null when it has none (or the
    listing itself isn't visible). */
export async function getVirtualTour(listingId: string): Promise<VirtualTour | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");
  cacheTag("virtual-tours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listing_virtual_tours")
    .select(TOUR_WITH_SCENES)
    .eq("listing_id", listingId)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(`Failed to load virtual tour: ${error.message}`);
  if (!data) return null;

  const { virtual_tour_scenes: scenes, ...tour } = data;
  return toVirtualTour(tour, scenes);
}

/** Ids of every listing with a published tour. Feeds generateStaticParams for
    the tour route, so those pages prerender alongside the detail pages they
    hang off. */
export async function getListingIdsWithTour(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");
  cacheTag("virtual-tours");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("listing_virtual_tours")
    .select("listing_id")
    .eq("status", "published");

  if (error) throw new Error(`Failed to load virtual tours: ${error.message}`);
  return (data ?? []).map((row) => row.listing_id);
}
