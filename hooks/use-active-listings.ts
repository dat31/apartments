"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toListing } from "@/lib/services/listings-map";
import { type Listing } from "@/schemas/listing";

/* Client-side read of all active listings, straight from the browser Supabase
   client. Active listings are anon-readable (RLS), so this needs no session —
   it mirrors the server `getActiveListings()` query but runs in the browser so
   pages that don't need SEO (e.g. Saved) can render fully client-side. */

export const activeListingsKey = ["listings", "active"] as const;

export function useActiveListings() {
  return useQuery({
    queryKey: activeListingsKey,
    queryFn: async (): Promise<Listing[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toListing);
    },
    // Listings change rarely; keep them warm so revisits are instant.
    staleTime: 5 * 60 * 1000,
  });
}
