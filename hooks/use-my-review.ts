"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMyReview } from "@/lib/actions/reviews";
import { unwrap } from "@/lib/actions/result";
import { useUser } from "@/hooks/auth";
import { type MyReview } from "@/lib/services/reviews";

/* The signed-in viewer's own review of one owner, if they've written one.

   A renter has at most one review per owner (`reviews_owner_author_uniq`), so
   this is the row the "Edit your review" button opens for editing and the
   modal pre-fills from. The action resolves "whose review?" from the session,
   so no author id crosses the wire.

   It can't come from the owner page's server region: those reads run through
   the cookieless public client inside a "use cache" boundary, so they know
   nothing about who's looking. Same reason <WriteReviewButton> resolves
   "is this me?" on the client. */

export type { MyReview };

/* Keyed per user so a sign-in / sign-out swaps to a separate cache entry
   rather than showing the previous account's review. */
export const myReviewKeys = {
  all: ["my-review"] as const,
  one: (ownerId: string | null, userId: string | undefined) =>
    ["my-review", ownerId ?? "none", userId ?? "guest"] as const,
};

export function useMyReview(ownerId: string | null) {
  const { data: user } = useUser();
  const userId = user?.id;

  return useQuery({
    queryKey: myReviewKeys.one(ownerId, userId),
    enabled: !!ownerId && !!userId,
    queryFn: async (): Promise<MyReview | null> =>
      unwrap(await fetchMyReview(ownerId!)),
  });
}
