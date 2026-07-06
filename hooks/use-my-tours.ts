"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";
import { toTourRequest } from "@/lib/services/tours-map";
import { toListing } from "@/lib/services/listings-map";
import { type Listing } from "@/schemas/listing";
import { type TourRequest } from "@/schemas/tour";
import type { Tables, TablesUpdate } from "@/lib/database.types";

/* The renter's own tours, sourced from the Supabase `tours` table with the
   related listing joined in for the card. Backed by react-query and keyed on
   the user id so it swaps cache entries on sign-in / sign-out.

   RLS already limits `tours` to rows where the caller is the renter or the
   owner; we additionally scope by renter_id so the renter page never shows a
   tour the same account received as an owner. Writes (accept a proposed slot,
   decline / cancel) are optimistic — the card updates instantly and rolls back
   if the update fails. */

type TourWithListing = Tables<"tours"> & {
  listing: Tables<"listings"> | null;
};

export type MyTour = { tour: TourRequest; listing: Listing | null };

export const tourKeys = {
  all: ["tours"] as const,
  mine: (userId: string | undefined) => ["tours", "mine", userId ?? "guest"] as const,
  active: (userId: string | undefined, listingId: string) =>
    ["tours", "active", userId ?? "guest", listingId] as const,
};

export function useMyTours() {
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: tourKeys.mine(userId),
    enabled: !userPending,
    queryFn: async (): Promise<MyTour[]> => {
      if (!userId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tours")
        .select("*, listing:listings(*)")
        .eq("renter_id", userId)
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
      const key = tourKeys.mine(userId);
      queryClient.setQueryData<MyTour[]>(key, (old) =>
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
      const key = tourKeys.mine(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MyTour[]>(key);
      patch(id, optimistic);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tourKeys.mine(userId), context.previous);
      }
    },
    onSettled: () => {
      // Refresh every tours query (my-tours list + per-listing active-tour
      // guards) so a status change reflects in the detail-page CTA too.
      queryClient.invalidateQueries({ queryKey: tourKeys.all });
    },
  });

  /* Renter adopts the owner's proposed slot as the real date/time. */
  const acceptReschedule = useCallback(
    (id: string) => {
      const m = items.find((x) => x.tour.id === id)?.tour;
      if (!m || m.status !== "reschedule" || !m.proposedDate || !m.proposedTime) return;
      updateMutation.mutate({
        id,
        values: {
          status: "confirmed",
          date: m.proposedDate,
          time: m.proposedTime,
          proposed_date: null,
          proposed_time: null,
        },
        optimistic: {
          status: "confirmed",
          date: m.proposedDate,
          time: m.proposedTime,
          proposedDate: undefined,
          proposedTime: undefined,
        },
      });
    },
    [items, updateMutation]
  );

  /* Decline a proposed slot, or cancel a pending / confirmed tour — both land
     the tour in the "declined" state from the renter's side. */
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

  return {
    items,
    acceptReschedule,
    declineTour,
    ready: !userPending && !query.isLoading,
  };
}
