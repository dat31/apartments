-- Dismissing a notification becomes reversible.
--
-- Dismissal used to be a hard DELETE, which made "undo" impossible to build
-- rather than merely unbuilt: `notifications` has no INSERT policy at all --
-- deliberately, so that nobody can forge news into another person's feed --
-- so once a row is gone, neither the client nor a Server Action running on
-- that user's cookie can put it back.
--
-- Undo needs reversible state somewhere, and the two places it could live are
-- the client (a tombstone list every reader subtracts, plus a deferred delete
-- that a reload loses) or the row. The row is the honest place: one column,
-- and every surface stays correct across tabs, devices and reloads without
-- knowing undo exists.
--
--   dismiss  ->  dismissed_at = now()
--   undo     ->  dismissed_at = null
--   forever  ->  the retention sweep, below

alter table public.notifications
  add column dismissed_at timestamptz;

-- Both existing indexes back reads that now say `dismissed_at is null`. The
-- predicate has to be repeated here or the planner stops matching them; making
-- them partial is free on top, and keeps them shrinking as rows are dismissed
-- exactly as the unread index already shrinks as rows are read.
drop index if exists public.notifications_profile_idx;
create index notifications_profile_idx
  on public.notifications (profile_id, created_at desc)
  where dismissed_at is null;

drop index if exists public.notifications_unread_idx;
create index notifications_unread_idx
  on public.notifications (profile_id)
  where read_at is null and dismissed_at is null;

-- The retention sweep's index. Cross-user by nature, so it leads on the
-- timestamp rather than on profile_id, and partial because the sweep never
-- looks at a row that is still in somebody's feed -- which is nearly all of
-- them.
create index notifications_dismissed_idx
  on public.notifications (dismissed_at)
  where dismissed_at is not null;

-- RLS still cannot scope to a column, so widening what a client may write
-- means widening the *grant*, not the policy -- the same pairing the original
-- migration set up for read_at, and the same reason: without it, a user
-- dismissing their own notification could rewrite its kind and subjects on the
-- way past. `dismissed_at` joins `read_at` as the second and last column a
-- client may set. Both are the reader's own state; neither is the news itself.
revoke update on public.notifications from anon, authenticated;
grant update (read_at, dismissed_at) on public.notifications to authenticated;

alter policy "Users mark own notifications read"
  on public.notifications
  rename to "Users update own notification state";

-- The delete policy goes. Dismissing is an update now, and nothing in the app
-- deletes a notification through a session any more. Removing it makes "rows
-- leave this table only on a retention schedule, never on a click" an
-- invariant the database enforces rather than a convention the services keep.
-- Account deletion is unaffected: that path is the profiles FK cascade, which
-- is not subject to RLS.
drop policy if exists "Users dismiss own notifications" on public.notifications;
