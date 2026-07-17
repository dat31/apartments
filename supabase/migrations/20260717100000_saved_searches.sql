-- Saved-search alerts (improvement #3).
--
-- A renter saves a filter set from Browse; with alerts on, publishing a
-- matching listing emails them. The search itself is just the browse URL's
-- query string — no separate filter model.
--
--   saved_searches               one row per saved search, owner-scoped RLS
--   saved_search_notifications   (search, listing) pairs already emailed, so
--                                re-publishing a listing never emails twice.
--                                Service-role only — no user policies.
--
-- The email delivery is NOT wired up yet: the publish trigger that would
-- pg_net-POST to the `saved-search-alerts` Edge Function is deliberately
-- left out until the email provider is configured. The function itself is
-- deployed and inert (see supabase/functions/saved-search-alerts).

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- Browse URL query string ("type=Apartment&district=hai-chau&maxPrice=2000").
  query_string text not null check (char_length(query_string) <= 2000),
  alerts boolean not null default true,
  -- Locale the search was saved in — alert emails are sent in this language.
  locale text not null default 'vi' check (locale in ('vi', 'en')),
  created_at timestamptz not null default now()
);

create index saved_searches_profile_idx
  on public.saved_searches (profile_id, created_at desc);

alter table public.saved_searches enable row level security;

create policy "Users read own saved searches"
  on public.saved_searches for select
  using ((select auth.uid()) = profile_id);

create policy "Users insert own saved searches"
  on public.saved_searches for insert
  with check ((select auth.uid()) = profile_id);

create policy "Users update own saved searches"
  on public.saved_searches for update
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy "Users delete own saved searches"
  on public.saved_searches for delete
  using ((select auth.uid()) = profile_id);

-- Cap searches per user so the publish-time matching loop stays trivially
-- cheap. Keep the limit in sync with SAVED_SEARCH_MAX in schemas/saved-search.
create or replace function public.enforce_saved_search_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.saved_searches
      where profile_id = new.profile_id) >= 10 then
    raise exception 'saved_search_cap_reached';
  end if;
  return new;
end;
$$;

create trigger saved_searches_cap
  before insert on public.saved_searches
  for each row execute function public.enforce_saved_search_cap();

-- One row per alert email actually sent; the primary key is the dedupe.
create table public.saved_search_notifications (
  saved_search_id uuid not null
    references public.saved_searches (id) on delete cascade,
  listing_id uuid not null
    references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (saved_search_id, listing_id)
);

-- Service-role only: RLS on with no policies denies all client access.
alter table public.saved_search_notifications enable row level security;
