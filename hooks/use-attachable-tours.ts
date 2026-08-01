"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAttachableTours } from "@/lib/actions/tours";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { tourSlot } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";
import { type TourRequest } from "@/schemas/tour";

/* ============================================================
   The tours a thread can attach — every tour on this listing shared by the
   two people in the conversation. The scoping that makes this safe lives in
   listAttachableTours (@/lib/services/tours); what's left here is the
   ordering the picker wants.
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
      return unwrap(await fetchAttachableTours(listingId, otherUserId));
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
