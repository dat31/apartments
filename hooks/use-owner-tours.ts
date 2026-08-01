"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptTourAction,
  declineTourAction,
  fetchTours,
  proposeTourTimeAction,
} from "@/lib/actions/tours";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { type TourWithListing } from "@/lib/services/tours";
import { type TourRequest } from "@/schemas/tour";
import { tourKeys } from "@/hooks/use-my-tours";

/* The tours an owner has received, with the related listing joined in for the
   card. Mirrors use-my-tours but asks for the "owner" scope, so the dashboard
   never shows a tour the same account made as a renter.

   Writes (accept, decline, propose a new slot) are optimistic — the card
   updates instantly and rolls back if the action fails. Accept and propose are
   owner-only; the service enforces that, not this hook. */

export type OwnerTour = TourWithListing;

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
      return unwrap(await fetchTours("owner"));
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
      intent,
      slot,
    }: {
      id: string;
      intent: "accept" | "decline" | "propose";
      /** Only for "propose" — the alternative the owner is offering. */
      slot?: { date: string; time: string };
      optimistic: Partial<TourRequest>;
    }) => {
      unwrap(
        await (intent === "accept"
          ? acceptTourAction(id)
          : intent === "decline"
            ? declineTourAction(id)
            : proposeTourTimeAction(id, slot!.date, slot!.time))
      );
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
        intent: "accept",
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
        intent: "decline",
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
        intent: "propose",
        slot: { date, time },
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
