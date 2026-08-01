-- 360° virtual tours — the tables behind /apartments/[id]/virtual-tour.
--
-- Naming: "tour" alone already means an *in-person viewing appointment* in
-- this app (public.tours, the tour_status enum, /tour). Everything here is
-- deliberately virtual_tour / listing_virtual_tours and never nests inside
-- those names — see docs/plans/virtual-home-tour.md §2.
--
--   listing_virtual_tours       one per listing, draft until published
--   virtual_tour_scenes         one per room: an equirectangular panorama
--                               plus the hotspots painted on it (jsonb)
--   listings.has_virtual_tour   trigger-maintained flag, so the browse cards'
--                               360° badge and the detail page's entry button
--                               cost no extra query
--   listing-panoramas           public Storage bucket for the owner uploader
--                               (phase 3) — nothing is written to it yet
--
-- Applied 2026-07-31. The seed migration that follows (20260731120100) fills
-- these tables with the demo content the feature previously derived in code.

-- ---------------------------------------------------------------- enums

create type public.virtual_tour_status as enum ('draft', 'published');

-- Mirrors ROOM_KINDS in schemas/virtual-tour: presentation only (rail icon,
-- default room name), never a query key.
create type public.room_kind as enum
  ('living', 'bed', 'bath', 'kitchen', 'balcony', 'other');

-- --------------------------------------------------------------- tables

create table public.listing_virtual_tours (
  id uuid primary key default gen_random_uuid(),
  -- One tour per home: the renter-facing route is /apartments/<id>/virtual-tour.
  listing_id uuid not null unique
    references public.listings (id) on delete cascade,
  status public.virtual_tour_status not null default 'draft',
  -- The room the tour opens on. Nullable, and FK'd once the scenes table
  -- exists (below): a tour is inserted, then its scenes, then pointed at one.
  -- Null means "the lowest sort_order scene", which is also what a deleted
  -- entry scene degrades to — a missing room must not break the whole tour.
  entry_scene_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.virtual_tour_scenes (
  id uuid primary key default gen_random_uuid(),
  -- Named explicitly because PostgREST needs it: entry_scene_id below makes a
  -- *second* FK between these two tables, so an embedded read has to say
  -- which one it means — `virtual_tour_scenes!virtual_tour_scenes_tour_id_fkey(*)`.
  tour_id uuid not null
    constraint virtual_tour_scenes_tour_id_fkey
    references public.listing_virtual_tours (id) on delete cascade,
  -- Owner-authored and stored as written: room names are content, not UI
  -- copy, so they are never translated (plan §10).
  name text not null check (char_length(name) between 1 and 80),
  room public.room_kind not null default 'other',
  -- Equirectangular 2:1 panorama, at most 4096×2048, plus a 512×256 version
  -- of the same shot for the room rail and the first paint (plan §5). A URL,
  -- so it can be a bucket object or an app-served path.
  panorama_url text not null,
  preview_url text,
  -- Where the camera looks when the room opens: radians, yaw around the
  -- vertical axis, pitch up (+) / down (−) — the conventions owned by
  -- lib/virtual-tour/math.ts and shared with the hotspots below.
  yaw double precision not null default 0,
  pitch double precision not null default 0,
  -- Optional initial field of view, degrees.
  hfov double precision,
  sort_order integer not null default 0,
  -- Optional position on a future floor plan, 0..1.
  plan_x double precision,
  plan_y double precision,
  -- Doors ({kind:"link", target}) and points of interest ({kind:"info",
  -- body}). A small bounded list, authored with its scene and always read
  -- with it — no query wants "all hotspots of kind X", so a third table would
  -- buy only a join and a second policy set. Shape is enforced by zod
  -- (HotspotSchema) at both boundaries; the check refuses the one error every
  -- consumer would break on.
  hotspots jsonb not null default '[]'::jsonb
    check (jsonb_typeof(hotspots) = 'array'),
  created_at timestamptz not null default now()
);

alter table public.listing_virtual_tours
  add constraint listing_virtual_tours_entry_scene_fkey
  foreign key (entry_scene_id) references public.virtual_tour_scenes (id)
  on delete set null;

-- The only access pattern: every scene of one tour, in walking order.
create index virtual_tour_scenes_tour_idx
  on public.virtual_tour_scenes (tour_id, sort_order);

-- ------------------------------------------------- denormalized flag

-- "Does this home have a tour?" is asked by every browse card, the detail
-- page and (later) a has360 filter chip — all of which already hold the
-- listing row. Without the flag each of them needs a second query.
alter table public.listings
  add column has_virtual_tour boolean not null default false;

-- Recomputed from scratch for every listing the change touched, so it can
-- never drift: publish, unpublish, delete and re-parenting all land here.
create or replace function public.sync_listing_has_virtual_tour()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- NEW and OLD are only read inside a branch guarded by TG_OP: referencing
  -- the unassigned one raises "record is not assigned yet".
  new_listing uuid;
  old_listing uuid;
begin
  if tg_op <> 'DELETE' then
    new_listing := new.listing_id;
  end if;
  if tg_op <> 'INSERT' then
    old_listing := old.listing_id;
  end if;

  if new_listing is not null then
    update public.listings l
       set has_virtual_tour = exists (
             select 1
               from public.listing_virtual_tours t
              where t.listing_id = new_listing
                and t.status = 'published'
           )
     where l.id = new_listing;
  end if;

  -- Only when the tour moved between listings — the common case touches one.
  if old_listing is not null and old_listing is distinct from new_listing then
    update public.listings l
       set has_virtual_tour = exists (
             select 1
               from public.listing_virtual_tours t
              where t.listing_id = old_listing
                and t.status = 'published'
           )
     where l.id = old_listing;
  end if;

  return null;
end;
$$;

create trigger listing_virtual_tours_sync_flag
  after insert or delete or update of status, listing_id
  on public.listing_virtual_tours
  for each row execute function public.sync_listing_has_virtual_tour();

-- Trigger-only SECURITY DEFINER function: keep it off the REST API, exactly
-- as 20260718120200_revoke_trigger_fn_rpc_execute does for the others.
-- Triggers fire regardless of EXECUTE grants, so revoking is safe.
revoke execute on function public.sync_listing_has_virtual_tour()
  from public, anon, authenticated;

-- ------------------------------------------------------------------ RLS

alter table public.listing_virtual_tours enable row level security;
alter table public.virtual_tour_scenes enable row level security;

-- Supabase's default privileges already grant these to new tables in `public`;
-- stated explicitly so the feature cannot fail silently (an anon read with no
-- table grant returns nothing, which looks exactly like "no tour"). Grants are
-- additive — RLS above is what actually decides who sees which row.
grant select on public.listing_virtual_tours, public.virtual_tour_scenes
  to anon, authenticated;
grant insert, update, delete on public.listing_virtual_tours, public.virtual_tour_scenes
  to authenticated;

-- Anonymous reads are what actually serve the feature: every read goes
-- through createPublicClient (anon key) inside a "use cache" boundary. A tour
-- is visible only when the home is on the market and the tour is finished.
create policy "Anyone reads published tours of active listings"
  on public.listing_virtual_tours for select to anon
  using (
    status = 'published'
    and exists (
      select 1 from public.listings l
       where l.id = listing_id and l.status = 'active'
    )
  );

-- Signed in: the same, plus an owner always sees their own drafts — mirrors
-- listings_select_auth, which is how drafts reach the owner console.
create policy "Owners read own tours, everyone reads published"
  on public.listing_virtual_tours for select to authenticated
  using (
    exists (
      select 1 from public.listings l
       where l.id = listing_id
         and (
           (l.status = 'active' and listing_virtual_tours.status = 'published')
           or (select auth.uid()) = l.owner_id
         )
    )
  );

create policy "Owners insert tours for own listings"
  on public.listing_virtual_tours for insert to authenticated
  with check (
    exists (
      select 1 from public.listings l
       where l.id = listing_id and (select auth.uid()) = l.owner_id
    )
  );

create policy "Owners update own tours"
  on public.listing_virtual_tours for update to authenticated
  using (
    exists (
      select 1 from public.listings l
       where l.id = listing_id and (select auth.uid()) = l.owner_id
    )
  )
  with check (
    exists (
      select 1 from public.listings l
       where l.id = listing_id and (select auth.uid()) = l.owner_id
    )
  );

create policy "Owners delete own tours"
  on public.listing_virtual_tours for delete to authenticated
  using (
    exists (
      select 1 from public.listings l
       where l.id = listing_id and (select auth.uid()) = l.owner_id
    )
  );

-- Scenes carry no visibility of their own: they resolve through their tour,
-- so there is exactly one place where "who may see this" is decided.
create policy "Anyone reads scenes of published tours"
  on public.virtual_tour_scenes for select to anon
  using (
    exists (
      select 1
        from public.listing_virtual_tours t
        join public.listings l on l.id = t.listing_id
       where t.id = tour_id
         and t.status = 'published'
         and l.status = 'active'
    )
  );

create policy "Owners read own scenes, everyone reads published"
  on public.virtual_tour_scenes for select to authenticated
  using (
    exists (
      select 1
        from public.listing_virtual_tours t
        join public.listings l on l.id = t.listing_id
       where t.id = tour_id
         and (
           (t.status = 'published' and l.status = 'active')
           or (select auth.uid()) = l.owner_id
         )
    )
  );

create policy "Owners insert scenes into own tours"
  on public.virtual_tour_scenes for insert to authenticated
  with check (
    exists (
      select 1
        from public.listing_virtual_tours t
        join public.listings l on l.id = t.listing_id
       where t.id = tour_id and (select auth.uid()) = l.owner_id
    )
  );

create policy "Owners update own scenes"
  on public.virtual_tour_scenes for update to authenticated
  using (
    exists (
      select 1
        from public.listing_virtual_tours t
        join public.listings l on l.id = t.listing_id
       where t.id = tour_id and (select auth.uid()) = l.owner_id
    )
  )
  with check (
    exists (
      select 1
        from public.listing_virtual_tours t
        join public.listings l on l.id = t.listing_id
       where t.id = tour_id and (select auth.uid()) = l.owner_id
    )
  );

create policy "Owners delete own scenes"
  on public.virtual_tour_scenes for delete to authenticated
  using (
    exists (
      select 1
        from public.listing_virtual_tours t
        join public.listings l on l.id = t.listing_id
       where t.id = tour_id and (select auth.uid()) = l.owner_id
    )
  );

-- -------------------------------------------------------------- storage

-- A separate bucket rather than a relaxation of listing-photos: panoramas are
-- an order of magnitude larger and only ever JPEG/WebP/AVIF. Created now so
-- the phase 3 uploader has somewhere to write; the seeded demo rows point at
-- the app's own /panoramas/*.jpg files and put nothing here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-panoramas',
  'listing-panoramas',
  true,
  20971520, -- 20 MB per panorama (4096×2048 JPEG is ~1–3 MB; the headroom is
            -- for the source file an owner uploads before downscaling)
  array['image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Reads go through the bucket's public URL; these policies only govern
-- writes, and only inside a folder named after the owner's user id.
create policy "Owners upload own panoramas"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-panoramas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Owners delete own panoramas"
on storage.objects for delete to authenticated
using (
  bucket_id = 'listing-panoramas'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
