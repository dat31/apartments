import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { reviewRange } from "@/app/[lang]/(app)/apartments/[id]/lib/reviews";
import { REVIEW_SELECT, toReview, type ReviewRow } from "./reviews-map";
import { type Review } from "@/schemas/review";

/* ============================================================
   Reviews service — the read path for owner reviews.

   Reviews are `reviews` rows addressed by the reviewed owner's
   profile uuid. The table is anon-readable via RLS
   `reviews_select_public`, so the cookieless public client works
   inside a "use cache" boundary.

   Two reads, deliberately separate:

   • getReviewStats — count, average and the 1–5 breakdown, from
     the owner_review_stats RPC. One scan, three numbers; nothing
     here scales with the review count.
   • getReviewsPage — one page of cards. Bounded, because the
     pager is a client component and anything handed to it is
     serialized into the RSC payload.

   Deriving the stats from a fetched page would be wrong the
   moment an owner has more reviews than fit on one, which is why
   they come from the database instead.
   ============================================================ */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cache tag covering both reads, so one posted review expires them together
    and the numbers can never disagree with the cards. */
export const reviewsTag = (ownerId: string) => `reviews:${ownerId}`;

/** The id rows are stored against, or null when it isn't a uuid at all. */
export const ownerUuidOf = (id: string): string | null =>
  UUID_RE.test(id) ? id : null;

export type ReviewStats = {
  total: number;
  avg: number;
  /** Review count per star rating, keyed 1–5. */
  dist: Record<number, number>;
};

const EMPTY_STATS: ReviewStats = {
  total: 0,
  avg: 0,
  dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

/** Count, average and star breakdown for an owner. */
export async function getReviewStats(id: string): Promise<ReviewStats> {
  "use cache";
  cacheLife("hours");
  cacheTag(reviewsTag(id));

  const ownerId = ownerUuidOf(id);
  if (!ownerId) return EMPTY_STATS;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("owner_review_stats", {
    owner: ownerId,
  });

  if (error) throw new Error(`Failed to load review stats: ${error.message}`);

  // A set-returning function comes back as a one-row array.
  const row = data?.[0];
  if (!row) return EMPTY_STATS;

  const dist = (row.dist ?? {}) as Record<string, number>;
  return {
    total: Number(row.total),
    avg: Number(row.avg),
    dist: Object.fromEntries(
      [1, 2, 3, 4, 5].map((s) => [s, Number(dist[String(s)] ?? 0)])
    ),
  };
}

/** One page of an owner's reviews, newest first. `created_at` alone isn't a
    total order — reviews written in the same transaction tie — so `id` breaks
    ties and keeps rows from repeating or vanishing between pages. */
export async function getReviewsPage(
  id: string,
  page: number = 1
): Promise<Review[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(reviewsTag(id));

  const ownerId = ownerUuidOf(id);
  if (!ownerId) return [];

  const [from, to] = reviewRange(page);
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data ?? []).map((row) => toReview(row as ReviewRow, ownerId));
}
