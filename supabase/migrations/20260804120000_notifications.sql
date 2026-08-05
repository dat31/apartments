-- In-app notifications for both roles.
--
-- Until now the app told a user something had happened in exactly one place:
-- the Messages unread badge. A renter whose tour was confirmed, declined or
-- rescheduled found out by navigating to /tour and looking; an owner learned
-- about a new request only by opening the dashboard.
--
--   notifications          one row per thing-that-happened, addressed to the
--                          profile it happened *to*. Read-only for clients.
--   listings.published_at  when a listing last became active — what the
--                          saved-search cron treats as "new".
--
-- Rows are written by SECURITY DEFINER triggers, never by the client. That is
-- forced by the shape of the problem: every event here is caused by the *other*
-- party's session (an owner accepting writes a row the renter owns), and no
-- sane RLS policy lets one user insert into another's feed. A trigger is also
-- the only place that catches every writer — a service, the cron, or someone
-- in the SQL editor.
--
-- Deliberately stores no prose. The row carries a `kind` plus foreign keys;
-- the sentence is rendered through next-intl at read time, so both locales
-- work and switching language re-renders correctly. Only values that have no
-- translation (a tour's date and time, a review's rating) go in `data`.

create type public.notification_kind as enum (
  'tour_requested',            -- → owner:  a renter asked for a viewing
  'tour_confirmed',            -- → renter: the owner took the requested slot
  'tour_reschedule_proposed',  -- → renter: the owner offered another slot
  'tour_reschedule_accepted',  -- → owner:  the renter took the offered slot
  'tour_declined',             -- → whichever side did not decline
  'review_received',           -- → owner:  a renter reviewed them
  'saved_search_match'         -- → renter: a new home matches a saved search
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- The recipient. Never the actor: see the self-notification guard below.
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  -- Who caused it, for the "Maya confirmed your tour" half of the sentence.
  -- ON DELETE SET NULL: a deleted account must not take the news with it.
  actor_id uuid references public.profiles (id) on delete set null,
  -- Subjects. Cascade, because a notification about a listing that no longer
  -- exists has nothing to link to and nothing to say.
  listing_id uuid references public.listings (id) on delete cascade,
  tour_id uuid references public.tours (id) on delete cascade,
  saved_search_id uuid references public.saved_searches (id) on delete cascade,
  -- Untranslatable snapshot values only (tour date/time, review rating).
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- The feed, newest first.
create index notifications_profile_idx
  on public.notifications (profile_id, created_at desc);

-- The badge count, which runs on every page whose cache went stale. Partial,
-- so it stays small: read notifications leave the index as they are marked.
create index notifications_unread_idx
  on public.notifications (profile_id)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select
  using ((select auth.uid()) = profile_id);

create policy "Users dismiss own notifications"
  on public.notifications for delete
  using ((select auth.uid()) = profile_id);

-- "Mark as read" is the only update a client may make. RLS cannot scope to a
-- column, so the row predicate below is paired with a column-level grant: the
-- policy says *which rows*, the grant says *which column*. Without the grant a
-- user could mark their own notification read and rewrite its kind and
-- subjects on the way past.
create policy "Users mark own notifications read"
  on public.notifications for update
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- No INSERT policy at all, by design. The triggers below are SECURITY DEFINER
-- and the saved-search cron uses the service role; both bypass RLS. A client
-- has no way to forge news.


-- ============================================================
-- listings.published_at
-- ============================================================
--
-- The saved-search cron needs to know when a home *became visible*, which is
-- not when its row was created: a draft written in June and published today is
-- new to every renter, and created_at says June.

alter table public.listings
  add column if not exists published_at timestamptz;

create or replace function public.set_listing_published_at()
returns trigger
language plpgsql
as $$
begin
  -- Only the transition into `active` counts. Re-saving an already-active
  -- listing must not re-publish it, or an owner fixing a typo would re-alert
  -- every matching saved search.
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_listing_published_at on public.listings;
create trigger set_listing_published_at
  before insert or update of status on public.listings
  for each row execute function public.set_listing_published_at();

-- Backfill. Everything already active has been visible for a while, so its
-- creation time is the honest answer and safely in the past — the cron's
-- lookback window will not pick any of it up.
update public.listings
   set published_at = created_at
 where status = 'active' and published_at is null;

-- Not SECURITY DEFINER (it only writes NEW on the row being written), but
-- still trigger-only — keep it off the REST surface.
revoke execute on function public.set_listing_published_at() from public, anon, authenticated;


-- ============================================================
-- Tour triggers
-- ============================================================

/* One rule covers every tour event: the actor is whoever is making the
   request, and the recipient is the other party. Deriving it rather than
   hardcoding a side is what makes `tour_declined` correct — declineTour()
   in lib/services/tours.ts deliberately accepts either the renter or the
   owner, so neither side is a fixed recipient.

   auth.uid() reads the request's JWT claim, which is present for anything
   arriving through PostgREST. When it is null nobody human acted (service
   role, a migration, the SQL editor) and there is no "other party" to tell,
   so the trigger writes nothing rather than guessing. */
create or replace function public.notify_tour_counterparty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  recipient uuid;
  event_kind public.notification_kind;
begin
  if actor is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    event_kind := 'tour_requested';
  elsif new.status is not distinct from old.status then
    -- An update that didn't move the status is not news. Accepting a proposed
    -- slot rewrites date/time too, but it also moves the status, so it still
    -- lands below.
    return new;
  elsif new.status = 'confirmed' then
    -- Which side confirmed is decided by where the tour came from: out of
    -- `reschedule` it is the renter taking the owner's offer; out of `pending`
    -- it is the owner taking the renter's request.
    event_kind := case when old.status = 'reschedule'
                  then 'tour_reschedule_accepted'
                  else 'tour_confirmed' end;
  elsif new.status = 'reschedule' then
    event_kind := 'tour_reschedule_proposed';
  elsif new.status = 'declined' then
    event_kind := 'tour_declined';
  else
    return new;
  end if;

  recipient := case when actor = new.renter_id then new.owner_id
                    else new.renter_id end;

  -- An account that both rents and hosts can end up on both sides of its own
  -- tour; telling someone what they just did is noise. A legacy tour booked
  -- before accounts existed has no renter_id and so has no second party.
  if recipient is null or recipient = actor then
    return new;
  end if;

  insert into public.notifications
    (profile_id, kind, actor_id, tour_id, listing_id, data)
  values (
    recipient, event_kind, actor, new.id, new.listing_id,
    -- The slot the recipient needs to read in the sentence. For a proposal
    -- that is the *proposed* slot, which has not been copied onto date/time
    -- yet; for everything else it is the real one.
    case when event_kind = 'tour_reschedule_proposed'
         then jsonb_build_object('date', new.proposed_date, 'time', new.proposed_time)
         else jsonb_build_object('date', new.date, 'time', new.time) end
  );

  return new;
end;
$$;

drop trigger if exists notify_tour_counterparty on public.tours;
create trigger notify_tour_counterparty
  after insert or update of status on public.tours
  for each row execute function public.notify_tour_counterparty();

revoke execute on function public.notify_tour_counterparty() from public, anon, authenticated;


-- ============================================================
-- Review trigger
-- ============================================================

/* INSERT only. submitReview upserts against the one_review_per_owner index
   (20260730090000), so an owner would otherwise be re-notified every time a
   renter edited their wording — and an edit is not news. */
create or replace function public.notify_review_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Reviewing yourself is already refused upstream ("own-profile"), but the
  -- guard is cheap and belongs next to the insert it protects.
  if new.author_id is null or new.author_id = new.owner_id then
    return new;
  end if;

  insert into public.notifications
    (profile_id, kind, actor_id, listing_id, data)
  values (
    new.owner_id, 'review_received', new.author_id, new.listing_id,
    jsonb_build_object('rating', new.rating)
  );

  return new;
end;
$$;

drop trigger if exists notify_review_received on public.reviews;
create trigger notify_review_received
  after insert on public.reviews
  for each row execute function public.notify_review_received();

revoke execute on function public.notify_review_received() from public, anon, authenticated;
