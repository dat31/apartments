"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";
import { OWNER_ID_BY_KEY } from "@/lib/services/listings-map";
import { tourKeys } from "@/hooks/use-my-tours";
import { type Listing } from "@/schemas/listing";

/* Creates a tour request in the Supabase `tours` table for the signed-in
   renter. RLS requires the row's renter_id to equal the caller (auth.uid()),
   so booking is only possible once the visitor has a real session — the
   book-tour dialog gates the confirm step on useUser for exactly this. */

export type BookTourInput = {
  listing: Listing;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  moveIn?: string;
  people?: string;
  note?: string;
  renterName: string;
  renterEmail: string;
};

export function useBookTour() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  return useMutation({
    mutationFn: async (input: BookTourInput) => {
      const userId = user?.id;
      if (!userId) throw new Error("Not signed in");

      const supabase = createClient();
      const ownerId =
        OWNER_ID_BY_KEY[input.listing.owner] ?? input.listing.owner;

      const { data, error } = await supabase
        .from("tours")
        .insert({
          listing_id: input.listing.id,
          owner_id: ownerId,
          renter_id: userId,
          renter_name: input.renterName,
          renter_email: input.renterEmail,
          date: input.date,
          time: input.time,
          move_in: input.moveIn || null,
          people: input.people || null,
          note: input.note ?? "",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh the my-tours list and the per-listing active-tour guard.
      queryClient.invalidateQueries({ queryKey: tourKeys.all });
    },
    onError: (error) => {
      // 23505 = the one-active-tour-per-home unique index fired (a race the
      // client guard didn't catch). Refresh so the active-tour guard surfaces
      // the tour that already exists.
      if ((error as { code?: string })?.code === "23505") {
        queryClient.invalidateQueries({ queryKey: tourKeys.all });
      }
    },
  });
}
