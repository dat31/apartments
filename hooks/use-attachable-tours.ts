"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";
import { toTourRequest } from "@/lib/services/tours-map";
import { tourSlot } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { type TourRequest } from "@/schemas/tour";
import type { Tables } from "@/lib/database.types";

/* ============================================================
   The tours a thread can attach — every tour on this listing shared by the
   two people in the conversation.

   Scoping is airtight without an extra ownership check: RLS already limits
   `tours` to rows where the caller is the renter or the owner, so a
   listing-scoped query can only return the caller's own tours. Filtering to
   rows where the *other* member is also a party then leaves exactly the tours
   the two of them share on this listing — an owner never sees another
   renter's request, and a renter never sees a tour they aren't part of.
   ============================================================ */

const attachableTourKeys = {
  list: (userId: string | undefined, listingId: string, otherUserId: string) =>
    ["tours", "attachable", userId ?? "guest", listingId, otherUserId] as const,
};

export function useAttachableTours(
  listingId: string | undefined,
  otherUserId: string | undefined
) {
  const { data: user, isPending: userPending } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: attachableTourKeys.list(userId, listingId ?? "", otherUserId ?? ""),
    enabled: !userPending && !!userId && !!listingId && !!otherUserId,
    queryFn: async (): Promise<TourRequest[]> => {
      if (!listingId || !otherUserId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data as Tables<"tours">[])
        // Keep only tours the other conversation member is also party to.
        .filter(
          (row) => row.renter_id === otherUserId || row.owner_id === otherUserId
        )
        .map(toTourRequest);
    },
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  /* Newest slot first — the tour someone most likely wants to reference. The
     query already orders by created_at; this re-sorts by the *effective*
     slot so a rescheduled tour surfaces at its proposed date. */
  const tours = useMemo(
    () =>
      [...items].sort((a, b) => {
        const sa = tourSlot(a);
        const sb = tourSlot(b);
        return `${sb.date}T${sb.time}`.localeCompare(`${sa.date}T${sa.time}`);
      }),
    [items]
  );

  return { tours, ready: !userPending && !query.isLoading };
}
