"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Expires every "listings"-tagged server cache entry (getActiveListings,
    getListingById, getSimilarListings, getListingsByOwner) after a
    client-side listing write, so public browse/detail pages serve the change
    on the next request instead of after the cacheLife window. Server Actions
    are public HTTP endpoints, so this requires a signed-in user — anonymous
    visitors must not be able to flush the cache at will. */
export async function revalidateListings(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  updateTag("listings");
}
