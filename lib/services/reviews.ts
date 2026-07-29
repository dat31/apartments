import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { initialsOf } from "@/lib/data/listings";
import { type Review } from "@/schemas/review";

/* ============================================================
   Reviews service — the read path for owner reviews.

   Reviews are `reviews` rows addressed by the reviewed owner's
   profile uuid. The table is anon-readable via RLS
   `reviews_select_public`, so the cookieless public client works
   inside a "use cache" boundary.
   ============================================================ */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cache tag for one owner's reviews. */
export const reviewsTag = (ownerId: string) => `reviews:${ownerId}`;

/** The id rows are stored against, or null when it isn't a uuid at all. */
export const ownerUuidOf = (id: string): string | null =>
  UUID_RE.test(id) ? id : null;

/* The author profile and the reviewed listing are embedded in the same
   query. `author_id` and `owner_id` both reference profiles, so the join
   needs the explicit FK name to disambiguate. */
type ReviewRow = {
  id: string;
  rating: number;
  text: string;
  created_at: string;
  author: { name: string } | null;
  listing: { title: string } | null;
};

function toReview(row: ReviewRow, ownerId: string): Review {
  const author = row.author?.name || "Renter";
  return {
    id: row.id,
    owner: ownerId,
    author,
    initials: initialsOf(author),
    // ReviewCard renders a month + year.
    date: row.created_at.slice(0, 7),
    rating: row.rating,
    stay: row.listing?.title,
    text: row.text,
  };
}

/** Every review written about an owner, newest first. Cached across requests;
    a new review expires it via updateTag(reviewsTag(...)). */
export async function getReviewsForOwner(id: string): Promise<Review[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(reviewsTag(id));

  const ownerId = ownerUuidOf(id);
  if (!ownerId) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, text, created_at, author:profiles!reviews_author_id_fkey(name), listing:listings(title)"
    )
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);
  return (data ?? []).map((row) => toReview(row as ReviewRow, ownerId));
}
