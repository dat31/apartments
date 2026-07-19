-- Tour owner_id integrity (code review finding #3).
--
-- Booking a tour is a client-side insert into public.tours. owner_id was taken
-- from client-controlled input (hooks/use-book-tour.ts) while the tours INSERT
-- RLS policy only checks renter_id = auth.uid(). A signed-in renter could
-- therefore set owner_id to any user id and misdirect the tour: it would land
-- on the wrong owner's dashboard (which filters .eq('owner_id', ...)), while
-- the listing's real owner never saw the request.
--
-- Fix: derive owner_id authoritatively from the listing on the server and
-- ignore whatever the client sent. A BEFORE trigger runs ahead of the NOT NULL
-- constraint check, so the client no longer needs to supply a correct value.
-- (renter_name / renter_email remain the renter's own free-text contact
-- details, bound to the authenticated renter_id by the existing RLS policy.)

create or replace function public.set_tour_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select owner_id into new.owner_id
  from public.listings
  where id = new.listing_id;

  if new.owner_id is null then
    raise exception 'listing % not found', new.listing_id;
  end if;

  return new;
end;
$$;

-- Fires on insert, and on any later attempt to change listing_id/owner_id, so
-- the owner can never be reassigned by tampering with an update either.
drop trigger if exists set_tour_owner_id on public.tours;
create trigger set_tour_owner_id
  before insert or update of listing_id, owner_id on public.tours
  for each row execute function public.set_tour_owner_id();

-- Trigger-only: it must not be reachable as a REST RPC. Triggers fire
-- regardless of EXECUTE grants, so this is safe and keeps the SECURITY DEFINER
-- function off the exposed API.
revoke execute on function public.set_tour_owner_id() from public, anon, authenticated;
