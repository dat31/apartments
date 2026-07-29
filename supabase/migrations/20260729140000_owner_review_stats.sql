-- Owner review aggregates in one scan, so the app stops fetching every review
-- row just to show a count, an average and a 1–5 breakdown.
--
-- The owner page read the whole `reviews` list for an owner and derived those
-- numbers in JS. That's an O(n) fetch for O(1) values, and the full list was
-- also serialized into the client pager's props — so every review body crossed
-- the wire to render four cards. With the list now capped to one page at a
-- time, an average computed from the fetched rows would be plain wrong, so the
-- aggregates have to come from the database.
--
-- PostgREST aggregate functions are disabled on this project (PGRST123), which
-- rules out `select=rating.avg()`; an RPC is the way to expose this.
--
-- security invoker: RLS still applies. `reviews_select_public` grants SELECT to
-- everyone, so anonymous visitors get the same numbers the cards show.

create or replace function public.owner_review_stats(owner uuid)
returns table (total bigint, avg numeric, dist jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*)::bigint,
    -- No reviews → 0 rather than NULL, so callers can render it directly.
    coalesce(avg(r.rating), 0)::numeric,
    jsonb_build_object(
      '1', count(*) filter (where r.rating = 1),
      '2', count(*) filter (where r.rating = 2),
      '3', count(*) filter (where r.rating = 3),
      '4', count(*) filter (where r.rating = 4),
      '5', count(*) filter (where r.rating = 5)
    )
  from public.reviews r
  where r.owner_id = owner_review_stats.owner;
$$;

-- Read-only and RLS-bound, so both roles may call it over REST.
grant execute on function public.owner_review_stats(uuid) to anon, authenticated;

-- The paged list query filters and sorts by exactly these columns; the
-- aggregate above filters by owner_id alone. Without it both do a seq scan.
--
-- id is part of the sort, not just the index: two reviews written in the same
-- transaction share a created_at, and ordering by that alone is unstable
-- across range requests — a row can repeat on one page and vanish from the
-- next. The id tiebreaker makes the order total.
create index if not exists reviews_owner_created_id_idx
  on public.reviews (owner_id, created_at desc, id desc);
