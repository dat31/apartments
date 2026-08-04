-- Tour slot date: the day a tour actually holds, as a column the database can
-- filter and index on.
--
-- "Still to come" is a question about a date, but the date lives in two
-- columns: once an owner proposes a new time, `proposed_date` is the day the
-- tour holds and `date` is only the day it was first asked for. A query
-- couldn't ask the question, so the owner dashboard fetched every tour the
-- owner had ever hosted and worked it out in JS — a read that grew with their
-- history rather than with what the page shows.
--
-- The expression mirrors tourSlot() in
-- app/[lang]/(app)/apartments/[id]/constants/tours.ts; the two are one
-- definition in two places and must agree. Stored rather than virtual so it
-- can carry an index.
--
-- Note the cutoff itself is NOT computed here: "today" is the Da Nang day
-- (UTC+7), which now() in a UTC database would get wrong for seven hours
-- every night. The caller passes it in.

alter table public.tours
  add column if not exists slot_date date
  generated always as (
    case
      when status = 'reschedule' and proposed_date is not null then proposed_date
      else date
    end
  ) stored;

-- The dashboard's two reads are both "this owner, this side of a date".
create index if not exists tours_owner_id_slot_date_idx
  on public.tours (owner_id, slot_date);
