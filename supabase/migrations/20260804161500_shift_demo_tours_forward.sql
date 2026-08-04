-- Demo data: keep the seeded tours ahead of today.
--
-- The tour rows are demo content created through the app, not seeded by any
-- tracked migration, so the owner dashboard goes stale on its own: every slot
-- eventually elapses and the "Upcoming" and "Needs a response" sections empty
-- out. That is correct behaviour (see 20260804081614_tour_slot_date) and it is
-- exactly what a demo must not show.
--
-- Shifted by whole weeks so every tour keeps its weekday and its time.
-- Availability is a weekly template keyed on weekday (owner_availability), so
-- an arbitrary offset would move tours onto days their owner does not work.
--
-- The earliest elapsed tour is deliberately left where it is, so the "Past"
-- section holds a viewing that happened rather than only declined requests.
-- Declined tours are never moved: they are history whatever day they sat on.
--
-- Re-runnable. After it runs, the only elapsed non-declined tour is the one it
-- keeps, so a second run moves nothing.
--
-- Note current_date is the database's UTC day while the app's cutoff is Da
-- Nang's (UTC+7, see todayYmd). For demo content a day either way does not
-- matter; nothing that decides a *user's* view is computed here.

with elapsed as (
  select id, row_number() over (order by date, time) as rn
  from public.tours
  where status <> 'declined'
    and date < current_date
)
update public.tours t
set date = t.date + (ceil((current_date - t.date) / 7.0) * 7)::int
from elapsed e
where t.id = e.id
  and e.rn > 1;
