"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";
import { toTourRequest } from "@/lib/services/tours-map";
import { tourKeys } from "@/hooks/use-my-tours";
import { type TourRequest } from "@/schemas/tour";

/* A renter may hold only ONE live tour per home. These statuses count as live;
   a declined / cancelled tour frees the home to be booked again. */
const ACTIVE_STATUS = ["pending", "confirmed", "reschedule"] as const;

/* The signed-in renter's current active tour for one listing, or null.

   Drives the detail-page booking CTA (and the dialog safety net): when a live
   tour exists we surface it and route to "manage" instead of letting the renter
   open a second booking. Read straight from Supabase via react-query, keyed per
   user + listing and scoped to the renter's own rows by RLS. Anonymous visitors
   never have a tour, so the query short-circuits to null without a round-trip. */
export function useActiveTour(listingId: string) {
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: tourKeys.active(userId, listingId),
    enabled: !userPending,
    queryFn: async (): Promise<TourRequest | null> => {
      if (!userId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("renter_id", userId)
        .eq("listing_id", listingId)
        .in("status", [...ACTIVE_STATUS])
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data && data.length ? toTourRequest(data[0]) : null;
    },
  });

  return {
    tour: query.data ?? null,
    // Only "loading" once we know there's a user to fetch for — anonymous
    // visitors resolve to no-tour immediately, so the CTA shows without a flash.
    isLoading: userPending || (!!userId && query.isLoading),
  };
}
