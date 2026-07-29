/* Pure reviews pagination helpers — shared by the server (first page) and the
   client pager (subsequent pages). No React.

   Pages are cut in SQL rather than sliced from a fetched array: the pager is a
   client component, so handing it the whole list would serialize every review
   body into the RSC payload just to render four cards. */

export const REVIEWS_PER_PAGE = 4;

/** Pages needed for `total` reviews. Always at least 1 — the pager renders
    even when there's nothing to page through, and zero would be a broken
    state. */
export function reviewPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / REVIEWS_PER_PAGE));
}

/** Inclusive [from, to] row offsets for a 1-based page, as Supabase's
    `.range()` wants them. */
export function reviewRange(page: number): [number, number] {
  const from = Math.max(0, page - 1) * REVIEWS_PER_PAGE;
  return [from, from + REVIEWS_PER_PAGE - 1];
}
