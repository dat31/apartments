import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getActiveListings, getListingById } from "./listings";
import { demoTourFor } from "@/lib/virtual-tour/demo-tours";
import type { VirtualTour } from "@/schemas/virtual-tour";

/* ============================================================
   Virtual tours service — the single read path for 360° tours.

   MVP shape: a tour is derived from its listing by
   lib/virtual-tour/demo-tours (see the note there). The signatures are
   the ones the real implementation will have, so when the
   `listing_virtual_tours` / `virtual_tour_scenes` tables land
   (docs/plans/virtual-home-tour.md §4) only the bodies change —
   components keep receiving a VirtualTour.

   Cached with the same "listings" tag as the listings service, because
   today a tour *is* a function of its listing: revalidating a listing
   has to revalidate its tour with it.
   ============================================================ */

/** The published tour for a listing, or null when it has none (or the
    listing itself isn't visible). */
export async function getVirtualTour(listingId: string): Promise<VirtualTour | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");

  const listing = await getListingById(listingId);
  if (!listing) return null;

  const tour = demoTourFor(listing);
  return tour?.status === "published" ? tour : null;
}

/** Ids of every active listing with a published tour. Feeds
    generateStaticParams for the tour route, so those pages prerender
    alongside the detail pages they hang off. */
export async function getListingIdsWithTour(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("listings");

  const listings = await getActiveListings();
  return listings.filter((listing) => demoTourFor(listing) !== null).map((l) => l.id);
}
