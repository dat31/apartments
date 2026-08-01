"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReviewsPage } from "@/lib/actions/reviews";
import { unwrap } from "@/lib/actions/result";
import { type Review } from "@/schemas/review";

/* One page of an owner's reviews. Page 1 is server-rendered and passed in, so
   this only runs once the reader pages past it — which keeps the initial RSC
   payload to four cards instead of every review an owner has ever received.

   The action reads through getReviewsPage, the same cached, anon-client
   function the server region uses for page 1. That's the point: the ordering
   (including the id tiebreaker) can't drift between the two, so rows never
   shift or repeat between the server's page 1 and the client's page 2. */
export function useReviewPage(ownerId: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["reviews", ownerId, page],
    enabled: enabled && page > 1,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Review[]> =>
      unwrap(await fetchReviewsPage(ownerId, page)),
  });
}
