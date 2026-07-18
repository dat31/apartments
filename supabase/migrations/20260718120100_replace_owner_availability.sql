-- Atomic weekly-availability replace (code review finding #5).
--
-- The owner editor's "apply preset" replaced the whole week from the client as
-- a DELETE followed by a separate INSERT (hooks/use-availability.ts). If the
-- INSERT failed after the DELETE succeeded, the owner's entire availability was
-- permanently wiped: onError only rolled back the local cache, and the
-- follow-up refetch then read the now-empty table. Move both steps into one
-- function so they share a transaction — a failed insert rolls back the delete.
--
-- security invoker: RLS still applies, so an owner can only ever delete/insert
-- their own rows (owner_id = auth.uid()); the function forces owner_id to the
-- caller regardless of the payload.

create or replace function public.replace_owner_availability(slots jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.owner_availability where owner_id = uid;

  insert into public.owner_availability (owner_id, weekday, time)
  select uid, (elem->>'weekday')::int, (elem->>'time')::time
  from jsonb_array_elements(coalesce(slots, '[]'::jsonb)) as elem;
end;
$$;
