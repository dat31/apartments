-- One review per renter per owner.
--
-- `reviews` had no uniqueness at all, so the same signed-in user could post
-- any number of reviews about the same owner — each one inflating that
-- owner's count and pulling the owner_review_stats average with it. The write
-- path now upserts on this pair, and the owner page offers "Edit your review"
-- instead of a second form.
--
-- Not a partial `where author_id is not null` index, for two reasons:
-- Postgres already treats NULLs as distinct, so rows orphaned by the
-- `author_id … on delete set null` FK still coexist; and PostgREST's upsert
-- can only name a non-partial index as its conflict target — inferring a
-- partial one requires repeating its WHERE predicate, which PostgREST has no
-- way to express.
--
-- Creation fails loudly if an environment already holds duplicates (none in
-- this project: 2 rows, 2 distinct authors, no repeated pair). Dedupe by hand
-- there — keep the newest row per (owner_id, author_id) — then re-run.
create unique index if not exists reviews_owner_author_uniq
  on public.reviews (owner_id, author_id);
