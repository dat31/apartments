-- Which notifications a person wants in their feed.
--
-- The `notifications` table answers "what happened"; this one answers "what do
-- you want to hear about". One row per profile, one boolean per category, and
-- the categories are groupings of `notification_kind` rather than a second
-- enum the app has to keep in step:
--
--   tours     tour_requested, tour_confirmed, tour_reschedule_proposed,
--             tour_reschedule_accepted, tour_declined
--   matches   saved_search_match
--   activity  review_received
--
-- Deliberately no email column. Email is not implemented anywhere in this
-- codebase -- the `saved-search-alerts` Edge Function that would have sent it
-- is inert and superseded (supabase/README.md) -- and a switch that silently
-- does nothing is worse than no switch. Add the column with the sender.
--
-- The preference is read at *read* time, not at write time: the triggers keep
-- writing rows whatever this table says, and the feed query filters on it.
-- That is what makes the switch reversible — turning a category back on
-- restores its history instead of revealing a gap where the rows were never
-- written. A muted category costs a few rows nobody reads, which the
-- dismissal sweep's retention already bounds.
--
-- No row means all-on. The table is therefore empty for everyone who has never
-- opened the settings dialog, and the service's defaults are the real source
-- of the initial state -- an INSERT-on-signup trigger would only add a row
-- that says what its absence already says.

create table public.notification_preferences (
  -- Also the primary key: a person has one set of preferences, and the
  -- upsert's conflict target is this column.
  profile_id uuid primary key
    references public.profiles (id) on delete cascade,

  tours boolean not null default true,
  matches boolean not null default true,
  activity boolean not null default true,

  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Per-profile, per-category switches for the in-app notification feed. '
  'A missing row means every category is on. Read-time filter only: rows are '
  'still written for muted categories, so switching one back on restores its '
  'history.';

create trigger set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------- RLS
--
-- Nothing here is anyone else's business, so every policy is the same
-- predicate: the row is yours. Unlike `notifications` this table *does* grant
-- INSERT -- these are the reader's own settings rather than news about them,
-- and there is no way to write into someone else's, because the WITH CHECK
-- pins profile_id to the session rather than trusting the payload.
--
-- `(select auth.uid())` rather than a bare call, as everywhere else in this
-- schema: it keeps the lookup out of the per-row loop.

alter table public.notification_preferences enable row level security;

create policy "Users read own notification preferences"
  on public.notification_preferences for select
  using ((select auth.uid()) = profile_id);

create policy "Users create own notification preferences"
  on public.notification_preferences for insert
  with check ((select auth.uid()) = profile_id);

create policy "Users update own notification preferences"
  on public.notification_preferences for update
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

-- No DELETE policy, and none is wanted: deleting a row is indistinguishable
-- from setting every category back on, which the UPDATE above already does.
-- Account deletion goes through the profiles FK cascade, which RLS does not
-- gate.
