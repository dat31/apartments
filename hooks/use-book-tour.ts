"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookTourAction } from "@/lib/actions/tours";
import { unwrap } from "@/lib/actions/result";
import { tourKeys } from "@/hooks/use-my-tours";
import { ensureTourChannel } from "@/lib/actions/tour-chat";
import { type BookTourInput } from "@/schemas/tour";

/* Creates a tour request for the signed-in renter, through the booking action.

   Neither the renter nor the owner is in the payload: the renter is the
   session, and the DB derives owner_id from the listing via the
   set_tour_owner_id trigger (migration 20260718120000_tour_owner_id_integrity).
   The book-tour dialog still gates its confirm step on useUser, but that is
   now UI, not the guard — bookTour() re-checks the session server-side. */

export type { BookTourInput };

export function useBookTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BookTourInput) =>
      unwrap(await bookTourAction(input)),
    onSuccess: (tour) => {
      // Refresh the my-tours list and the per-listing active-tour guard.
      queryClient.invalidateQueries({ queryKey: tourKeys.all });
      // Open the message thread in the background so the booking note lands
      // as its first message right away. The tour card provisions lazily too,
      // so a failure here costs nothing but a slightly later first message.
      // Only when there IS a note: without one this call would just mint an
      // empty channel the lazy path creates on demand anyway
      // (docs/plans/messaging-empty-channels.md).
      if (tour.note) void ensureTourChannel(tour.id).catch(() => {});
    },
    onError: (error) => {
      // "conflict" = the one-active-tour-per-home unique index fired (a race
      // the client guard didn't catch; the service maps Postgres 23505 onto
      // it). Refresh so the active-tour guard surfaces the existing tour.
      if ((error as { code?: string })?.code === "conflict") {
        queryClient.invalidateQueries({ queryKey: tourKeys.all });
      }
    },
  });
}
