import { initialsOf } from "@/lib/data/listings";
import { type Review } from "@/schemas/review";

/* Pure row → domain mapping for `reviews`, split out of the server-only
   reviews service so it can also run in the browser: the pager fetches pages
   2+ straight from the client Supabase client (see hooks/use-review-page).
   No `server-only`, no cache, no React — just data.

   Mirrors the split in ./listings-map. */

/* The author profile and the reviewed listing are embedded in the same query.
   `author_id` and `owner_id` both reference profiles, so the join needs the
   explicit FK name to disambiguate. */
export const REVIEW_SELECT =
  "id, rating, text, created_at, author:profiles!reviews_author_id_fkey(name), listing:listings(title)";

export type ReviewRow = {
  id: string;
  rating: number;
  text: string;
  created_at: string;
  author: { name: string } | null;
  listing: { title: string } | null;
};

/** Map a Supabase `reviews` row to the app's domain `Review`. */
export function toReview(row: ReviewRow, ownerId: string): Review {
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
