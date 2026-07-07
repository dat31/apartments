"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";
import { toTourRequest } from "@/lib/services/tours-map";
import { toListing } from "@/lib/services/listings-map";
import { type Listing } from "@/schemas/listing";
import { type TourRequest } from "@/schemas/tour";
import { tourKeys } from "@/hooks/use-my-tours";
import type { Tables, TablesUpdate } from "@/lib/database.types";

/* The tours an owner has received, sourced from the Supabase `tours` table
   with the related listing joined in for the card. Mirrors use-my-tours but
   scoped to owner_id so the dashboard only shows requests addressed to the
   signed-in owner (RLS already limits `tours` to rows where the caller is the
   renter or the owner; we additionally scope by owner_id so the dashboard
   never shows a tour the same account made as a renter).

   Writes (accept, decline, propose a new slot) are optimistic — the card
   updates instantly and rolls back if the update fails. */

type TourWithListing = Tables<"tours"> & {
  listing: Tables<"listings"> | null;
};

export type OwnerTour = { tour: TourRequest; listing: Listing | null };

export const ownerTourKeys = {
  received: (userId: string | undefined) =>
    ["tours", "received", userId ?? "guest"] as const,
};

export function useOwnerTours() {
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ownerTourKeys.received(userId),
    enabled: !userPending,
    queryFn: async (): Promise<OwnerTour[]> => {
      if (!userId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tours")
        .select("*, listing:listings(*)")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as TourWithListing[]).map((row) => ({
        tour: toTourRequest(row),
        listing: row.listing ? toListing(row.listing) : null,
      }));
    },
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  /* Optimistically patch one tour's domain fields in the cached list. */
  const patch = useCallback(
    (id: string, next: Partial<TourRequest>) => {
      const key = ownerTourKeys.received(userId);
      queryClient.setQueryData<OwnerTour[]>(key, (old) =>
        old?.map((m) => (m.tour.id === id ? { ...m, tour: { ...m.tour, ...next } } : m))
      );
    },
    [queryClient, userId]
  );

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: TablesUpdate<"tours">;
      optimistic: Partial<TourRequest>;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("tours").update(values).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, optimistic }) => {
      const key = ownerTourKeys.received(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OwnerTour[]>(key);
      patch(id, optimistic);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ownerTourKeys.received(userId), context.previous);
      }
    },
    onSettled: () => {
      // Refresh every tours query (this dashboard list + the renter's my-tours
      // list + per-listing active-tour guards) so a status change the owner
      // makes reflects on the renter's side too.
      queryClient.invalidateQueries({ queryKey: tourKeys.all });
    },
  });

  /* Owner confirms the renter's requested slot. */
  const acceptTour = useCallback(
    (id: string) => {
      updateMutation.mutate({
        id,
        values: { status: "confirmed" },
        optimistic: { status: "confirmed" },
      });
    },
    [updateMutation]
  );

  /* Owner declines a request, or cancels a confirmed / proposed tour — all
     land the tour in the terminal "declined" state, freeing the renter to
     book again (the one-active-per-renter index excludes declined). */
  const declineTour = useCallback(
    (id: string) => {
      updateMutation.mutate({
        id,
        values: { status: "declined" },
        optimistic: { status: "declined" },
      });
    },
    [updateMutation]
  );

  /* Owner suggests an alternative slot; the renter then accepts or declines. */
  const proposeTime = useCallback(
    (id: string, date: string, time: string) => {
      updateMutation.mutate({
        id,
        values: {
          status: "reschedule",
          proposed_date: date,
          proposed_time: time,
        },
        optimistic: {
          status: "reschedule",
          proposedDate: date,
          proposedTime: time,
        },
      });
    },
    [updateMutation]
  );

  return {
    items,
    acceptTour,
    declineTour,
    proposeTime,
    ready: !userPending && !query.isLoading,
  };
}
