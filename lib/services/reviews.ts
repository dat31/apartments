import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { OWNER_ID_BY_KEY, OWNER_KEY_BY_ID } from "./listings-map";
import { SEED_REVIEWS, initialsOf, reviewsFor } from "@/lib/data/listings";
import { type Review } from "@/schemas/review";

/* ============================================================
   Reviews service — the read path for owner reviews.

   Reviews come from two places and are merged newest-first:

   • The `reviews` table, written by the leave-a-review form
     (see @/lib/actions/reviews). Anon-readable via RLS
     `reviews_select_public`, so the cookieless public client
     works inside a "use cache" boundary.
   • The curated SEED_REVIEWS in @/lib/data/listings, which
     still back the three demo owners ("you"/"maya"/"leo").

   Owner pages address owners by seed key or by profile uuid;
   both resolve here so callers can pass either.
   ============================================================ */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cache tag for one owner's reviews, keyed by seed key or uuid. */
export const reviewsTag = (ownerKey: string) => `reviews:${ownerKey}`;

/** Seed key or uuid → the `profiles` uuid rows are stored against, or null
    when the id is neither. */
export function ownerUuidOf(id: string): string | null {
  const seed = OWNER_ID_BY_KEY[id];
  if (seed) return seed;
  return UUID_RE.test(id) ? id : null;
}

/** The inverse: a uuid maps back to its seed key when it has one, so seed
    owners keep a single cache tag and a single `Review.owner` value. */
export const ownerKeyOf = (id: string) => OWNER_KEY_BY_ID[id] ?? id;

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

function toReview(row: ReviewRow, ownerKey: string): Review {
  const author = row.author?.name || "Renter";
  return {
    id: row.id,
    owner: ownerKey,
    author,
    initials: initialsOf(author),
    rating: row.rating,
    // ReviewCard renders a month + year, so "YYYY-MM" like the seed data.
    date: row.created_at.slice(0, 7),
    stay: row.listing?.title,
    text: row.text,
  };
}

/** Every review written about an owner, newest first. Cached across requests;
    a new review expires it via updateTag(reviewsTag(...)). */
export async function getReviewsForOwner(id: string): Promise<Review[]> {
  "use cache";
  cacheLife("hours");

  const ownerKey = ownerKeyOf(id);
  cacheTag(reviewsTag(ownerKey));

  const seeded = reviewsFor(SEED_REVIEWS, ownerKey);
  const uuid = ownerUuidOf(id);
  if (!uuid) return seeded;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, text, created_at, author:profiles!reviews_author_id_fkey(name), listing:listings(title)"
    )
    .eq("owner_id", uuid)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  const posted = (data ?? []).map((row) => toReview(row as ReviewRow, ownerKey));

  /* Both sides carry a "YYYY-MM" date, which sorts lexicographically. Sort is
     stable, so posted reviews lead the seed ones within the same month. */
  return [...posted, ...seeded].sort((a, b) => b.date.localeCompare(a.date));
}
