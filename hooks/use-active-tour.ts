"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchActiveTour } from "@/lib/actions/tours";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { tourKeys } from "@/hooks/use-my-tours";
import { type TourRequest } from "@/schemas/tour";

/* The signed-in renter's current active tour for one listing, or null.

   Drives the detail-page booking CTA (and the dialog safety net): when a live
   tour exists we surface it and route to "manage" instead of letting the renter
   open a second booking. Keyed per user + listing; which statuses count as
   live is decided by getActiveTour in @/lib/services/tours. Anonymous visitors
   never have a tour, so the query short-circuits to null without a round-trip. */
export function useActiveTour(listingId: string) {
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: tourKeys.active(userId, listingId),
    enabled: !userPending,
    queryFn: async (): Promise<TourRequest | null> => {
      if (!userId) return null;
      return unwrap(await fetchActiveTour(listingId));
    },
  });

  return {
    tour: query.data ?? null,
    // Only "loading" once we know there's a user to fetch for — anonymous
    // visitors resolve to no-tour immediately, so the CTA shows without a flash.
    isLoading: userPending || (!!userId && query.isLoading),
  };
}
