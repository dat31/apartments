"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { reviewRange } from "@/app/[lang]/(app)/apartments/[id]/lib/reviews";
import { REVIEW_SELECT, toReview, type ReviewRow } from "@/lib/services/reviews-map";
import { type Review } from "@/schemas/review";

/* One page of an owner's reviews, fetched from the browser. Page 1 is
   server-rendered and passed in, so this only runs once the reader pages past
   it — which keeps the initial RSC payload to four cards instead of every
   review an owner has ever received.

   `reviews` is anon-readable (RLS `reviews_select_public`), so this works
   signed-out. The ordering mirrors getReviewsPage exactly, id tiebreaker
   included, or rows would shift between the server's page 1 and the client's
   page 2. */
export function useReviewPage(ownerId: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["reviews", ownerId, page],
    enabled: enabled && page > 1,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Review[]> => {
      const [from, to] = reviewRange(page);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select(REVIEW_SELECT)
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []).map((row) => toReview(row as ReviewRow, ownerId));
    },
  });
}
