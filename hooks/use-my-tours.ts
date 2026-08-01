"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptRescheduleAction,
  declineTourAction,
  fetchTours,
} from "@/lib/actions/tours";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { type TourWithListing } from "@/lib/services/tours";
import { type TourRequest } from "@/schemas/tour";

/* The renter's own tours, with the related listing joined in for the card.
   Backed by react-query and keyed on the user id so it swaps cache entries on
   sign-in / sign-out.

   Writes (accept a proposed slot, decline / cancel) are optimistic — the card
   updates instantly and rolls back if the action fails. Each one sends an
   intent rather than a column patch; which columns that implies, and which
   side of the tour may ask for it, is decided in @/lib/services/tours. */

export type MyTour = TourWithListing;

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
      return unwrap(await fetchTours("renter"));
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
      intent,
    }: {
      id: string;
      intent: "accept-reschedule" | "decline";
      optimistic: Partial<TourRequest>;
    }) => {
      unwrap(
        await (intent === "accept-reschedule"
          ? acceptRescheduleAction(id)
          : declineTourAction(id))
      );
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
      /* The cached proposal drives the optimistic patch only — the action
         re-reads the row and applies the slot the owner actually offered, so a
         stale cache can't confirm a time nobody proposed. */
      updateMutation.mutate({
        id,
        intent: "accept-reschedule",
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
        intent: "decline",
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
