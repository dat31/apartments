"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Expires the cached tour reads after an owner edits one.

    Both tags, deliberately: "virtual-tours" covers getVirtualTour /
    getListingIdsWithTour, and "listings" because publishing flips
    listings.has_virtual_tour, which the browse cards and the detail page's
    entry button read off the cached listing rows.

    Server Actions are public HTTP endpoints, so this requires a signed-in
    user — anonymous visitors must not be able to flush the cache at will
    (same guard as revalidateListings). */
export async function revalidateVirtualTour(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  updateTag("virtual-tours");
  updateTag("listings");
}
