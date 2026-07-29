"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/auth";

/* The signed-in viewer's own review of one owner, if they've written one.

   A renter has at most one review per owner (`reviews_owner_author_uniq`), so
   this is the row the "Edit your review" button opens for editing and the
   modal pre-fills from. Read straight from the browser client — `reviews` is
   anon-readable (RLS `reviews_select_public`), and reading your own row needs
   nothing more than that.

   It can't come from the server region: the owner page's reads run through the
   cookieless public client inside a "use cache" boundary, so they know nothing
   about who's looking. Same reason <WriteReviewButton> resolves "is this me?"
   on the client. */

export type MyReview = { id: string; rating: number; text: string };

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
    queryFn: async (): Promise<MyReview | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, text")
        .eq("owner_id", ownerId!)
        .eq("author_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}
