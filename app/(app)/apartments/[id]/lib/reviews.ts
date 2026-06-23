import { type Review } from "@/lib/data/listings";

/* Pure reviews pagination helpers — shared by the server (first page) and the
   client pager (subsequent pages). No React. */

export const REVIEWS_PER_PAGE = 4;

export function reviewPageCount(reviews: Review[]): number {
  return Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
}

export function reviewsForPage(reviews: Review[], page: number): Review[] {
  const start = (page - 1) * REVIEWS_PER_PAGE;
  return reviews.slice(start, start + REVIEWS_PER_PAGE);
}
