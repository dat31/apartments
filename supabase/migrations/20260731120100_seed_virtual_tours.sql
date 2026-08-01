-- Seed the 360° tours the feature previously derived in code, so switching
-- the read path to Postgres changed nothing a renter can see.
--
-- Requires 20260731120000_virtual_tours.sql. Applied 2026-07-31: 13 of the 22
-- active listings got a published tour, 60 scene rows.
--
-- The content is the five CC0 demo rooms in public/panoramas (CREDITS.txt
-- there): every seeded home gets the *same* apartment. That is honest demo
-- data, not a claim about the unit — real tours arrive with the owner
-- uploader (plan §9). Every scene row was generated from the demo module this
-- replaced, so the angles below are the ones the app has always shipped.
--
-- Guarded throughout (`on conflict do nothing`, `where ... is null`), so
-- re-running is a no-op and an owner's later edits are never clobbered.

-- 1. Which homes get one. Two in three, deterministically, so the 360° badge
--    means something on the browse grid *and* the no-tour path stays
--    reachable — the detail page, the card badge and one e2e spec all depend
--    on some listings having none. (hashtext can be negative; PostgreSQL's %
--    keeps the dividend's sign, so `<> 0` still selects two thirds.)
--
--    This is the same *rule* as the old FNV-1a hash over the listing id, not
--    the same hash, so which homes carry the badge shifted on the switchover.
--    Matching exactly would have meant hardcoding this database's uuids,
--    which would seed nothing in any other environment.
insert into public.listing_virtual_tours (listing_id, status)
select l.id, 'published'::public.virtual_tour_status
  from public.listings l
 where l.status = 'active'
   and hashtext(l.id::text) % 3 <> 0
on conflict (listing_id) do nothing;

-- 2. The rooms. Scene ids are derived from (tour, room slug) rather than
--    random, for two reasons: a door can name the row it leads to inside the
--    same INSERT, and re-running this file collides on the primary key
--    instead of duplicating every room. The uploader will generate ordinary
--    uuids; nothing reads the derivation.
--
-- 2a. Homes with a separate bedroom — five rooms.
insert into public.virtual_tour_scenes
  (id, tour_id, name, room, panorama_url, preview_url, yaw, pitch, sort_order, hotspots)
select
  md5(t.id::text || ':' || s.slug)::uuid,
  t.id,
  s.name,
  s.room::public.room_kind,
  '/panoramas/' || s.file || '.jpg',
  '/panoramas/' || s.file || '-preview.jpg',
  s.yaw,
  0,
  s.sort_order,
  s.hotspots
  from public.listing_virtual_tours t
  join public.listings l on l.id = t.listing_id and l.beds > 0
 cross join lateral (values
  ('living', 'Living room', 'living', 'living-room', 0.314159265, 0,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'living-to-kitchen',
        'kind', 'link',
        'yaw', -0.879645943,
        'pitch', -0.157079633,
        'label', 'Kitchen & dining',
        'target', md5(t.id::text || ':' || 'kitchen')::uuid::text
      ),
      jsonb_build_object(
        'id', 'living-to-balcony',
        'kind', 'link',
        'yaw', 0.81681409,
        'pitch', -0.09424778,
        'label', 'Balcony',
        'target', md5(t.id::text || ':' || 'balcony')::uuid::text
      ),
      jsonb_build_object(
        'id', 'living-to-bedroom',
        'kind', 'link',
        'yaw', 2.324778564,
        'pitch', -0.157079633,
        'label', 'Bedroom',
        'target', md5(t.id::text || ':' || 'bedroom')::uuid::text
      ),
      jsonb_build_object(
        'id', 'living-area',
        'kind', 'info',
        'yaw', 0,
        'pitch', -0.376991118,
        'label', 'Living area',
        'body', 'About 22 m² of furnished living space, with the balcony doors on the far side.'
      )
    )),
  ('kitchen', 'Kitchen & dining', 'kitchen', 'kitchen', -0.314159265, 1,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'kitchen-to-living',
        'kind', 'link',
        'yaw', -1.947787445,
        'pitch', -0.157079633,
        'label', 'Living room',
        'target', md5(t.id::text || ':' || 'living')::uuid::text
      ),
      jsonb_build_object(
        'id', 'kitchen-to-balcony',
        'kind', 'link',
        'yaw', -0.565486678,
        'pitch', -0.062831853,
        'label', 'Balcony',
        'target', md5(t.id::text || ':' || 'balcony')::uuid::text
      ),
      jsonb_build_object(
        'id', 'kitchen-fittings',
        'kind', 'info',
        'yaw', 2.261946711,
        'pitch', 0,
        'label', 'Fitted kitchen',
        'body', 'Comes with the fridge, gas hob and cabinetry you can see — nothing to buy on move-in.'
      )
    )),
  ('bedroom', 'Bedroom', 'bed', 'bedroom', 1.759291886, 2,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'bedroom-to-bathroom',
        'kind', 'link',
        'yaw', -2.387610417,
        'pitch', -0.157079633,
        'label', 'Bathroom',
        'target', md5(t.id::text || ':' || 'bathroom')::uuid::text
      ),
      jsonb_build_object(
        'id', 'bedroom-to-balcony',
        'kind', 'link',
        'yaw', 0.628318531,
        'pitch', -0.062831853,
        'label', 'Balcony',
        'target', md5(t.id::text || ':' || 'balcony')::uuid::text
      ),
      jsonb_build_object(
        'id', 'bedroom-to-living',
        'kind', 'link',
        'yaw', -1.130973355,
        'pitch', -0.157079633,
        'label', 'Living room',
        'target', md5(t.id::text || ':' || 'living')::uuid::text
      ),
      jsonb_build_object(
        'id', 'bedroom-aircon',
        'kind', 'info',
        'yaw', 2.513274123,
        'pitch', 0.439822972,
        'label', 'Air conditioning',
        'body', 'Split-unit air conditioning over the bed, plus a ceiling fan in the living room.'
      )
    )),
  ('bathroom', 'Bathroom', 'bath', 'bathroom', -1.759291886, 3,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'bathroom-to-bedroom',
        'kind', 'link',
        'yaw', 1.256637061,
        'pitch', 0,
        'label', 'Bedroom',
        'target', md5(t.id::text || ':' || 'bedroom')::uuid::text
      ),
      jsonb_build_object(
        'id', 'bathroom-fittings',
        'kind', 'info',
        'yaw', -0.188495559,
        'pitch', -0.376991118,
        'label', 'Bath & shower',
        'body', 'Full-size bath with an overhead shower, and a window that actually opens.'
      )
    )),
  ('balcony', 'Balcony', 'balcony', 'balcony', -0.188495559, 4,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'balcony-to-living',
        'kind', 'link',
        'yaw', -2.827433388,
        'pitch', -0.157079633,
        'label', 'Living room',
        'target', md5(t.id::text || ':' || 'living')::uuid::text
      ),
      jsonb_build_object(
        'id', 'balcony-to-kitchen',
        'kind', 'link',
        'yaw', 2.701769682,
        'pitch', -0.157079633,
        'label', 'Kitchen & dining',
        'target', md5(t.id::text || ':' || 'kitchen')::uuid::text
      ),
      jsonb_build_object(
        'id', 'balcony-view',
        'kind', 'info',
        'yaw', -0.188495559,
        'pitch', 0.157079633,
        'label', 'The view',
        'body', 'East-facing balcony — morning sun, and the sea visible past the rooftops.'
      )
    ))
) as s(slug, name, room, file, yaw, sort_order, hotspots)
on conflict (id) do nothing;

-- 2b. Studios — no bedroom, so the living room's third archway opens onto the
--     bathroom instead (otherwise the bathroom, whose only other door was the
--     bedroom's, is stranded). The bathroom is left with no door of its own,
--     exactly as the derived tour has it today: the room rail is the way back
--     out, which is why validateTourGraph tolerates one-way links.
insert into public.virtual_tour_scenes
  (id, tour_id, name, room, panorama_url, preview_url, yaw, pitch, sort_order, hotspots)
select
  md5(t.id::text || ':' || s.slug)::uuid,
  t.id,
  s.name,
  s.room::public.room_kind,
  '/panoramas/' || s.file || '.jpg',
  '/panoramas/' || s.file || '-preview.jpg',
  s.yaw,
  0,
  s.sort_order,
  s.hotspots
  from public.listing_virtual_tours t
  join public.listings l on l.id = t.listing_id and l.beds = 0
 cross join lateral (values
  ('living', 'Living room', 'living', 'living-room', 0.314159265, 0,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'living-to-kitchen',
        'kind', 'link',
        'yaw', -0.879645943,
        'pitch', -0.157079633,
        'label', 'Kitchen & dining',
        'target', md5(t.id::text || ':' || 'kitchen')::uuid::text
      ),
      jsonb_build_object(
        'id', 'living-to-balcony',
        'kind', 'link',
        'yaw', 0.81681409,
        'pitch', -0.09424778,
        'label', 'Balcony',
        'target', md5(t.id::text || ':' || 'balcony')::uuid::text
      ),
      jsonb_build_object(
        'id', 'living-to-bathroom',
        'kind', 'link',
        'yaw', 2.324778564,
        'pitch', -0.157079633,
        'label', 'Bathroom',
        'target', md5(t.id::text || ':' || 'bathroom')::uuid::text
      ),
      jsonb_build_object(
        'id', 'living-area',
        'kind', 'info',
        'yaw', 0,
        'pitch', -0.376991118,
        'label', 'Living area',
        'body', 'About 22 m² of furnished living space, with the balcony doors on the far side.'
      )
    )),
  ('kitchen', 'Kitchen & dining', 'kitchen', 'kitchen', -0.314159265, 1,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'kitchen-to-living',
        'kind', 'link',
        'yaw', -1.947787445,
        'pitch', -0.157079633,
        'label', 'Living room',
        'target', md5(t.id::text || ':' || 'living')::uuid::text
      ),
      jsonb_build_object(
        'id', 'kitchen-to-balcony',
        'kind', 'link',
        'yaw', -0.565486678,
        'pitch', -0.062831853,
        'label', 'Balcony',
        'target', md5(t.id::text || ':' || 'balcony')::uuid::text
      ),
      jsonb_build_object(
        'id', 'kitchen-fittings',
        'kind', 'info',
        'yaw', 2.261946711,
        'pitch', 0,
        'label', 'Fitted kitchen',
        'body', 'Comes with the fridge, gas hob and cabinetry you can see — nothing to buy on move-in.'
      )
    )),
  ('bathroom', 'Bathroom', 'bath', 'bathroom', -1.759291886, 2,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'bathroom-fittings',
        'kind', 'info',
        'yaw', -0.188495559,
        'pitch', -0.376991118,
        'label', 'Bath & shower',
        'body', 'Full-size bath with an overhead shower, and a window that actually opens.'
      )
    )),
  ('balcony', 'Balcony', 'balcony', 'balcony', -0.188495559, 3,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'balcony-to-living',
        'kind', 'link',
        'yaw', -2.827433388,
        'pitch', -0.157079633,
        'label', 'Living room',
        'target', md5(t.id::text || ':' || 'living')::uuid::text
      ),
      jsonb_build_object(
        'id', 'balcony-to-kitchen',
        'kind', 'link',
        'yaw', 2.701769682,
        'pitch', -0.157079633,
        'label', 'Kitchen & dining',
        'target', md5(t.id::text || ':' || 'kitchen')::uuid::text
      ),
      jsonb_build_object(
        'id', 'balcony-view',
        'kind', 'info',
        'yaw', -0.188495559,
        'pitch', 0.157079633,
        'label', 'The view',
        'body', 'East-facing balcony — morning sun, and the sea visible past the rooftops.'
      )
    ))
) as s(slug, name, room, file, yaw, sort_order, hotspots)
on conflict (id) do nothing;

-- 3. Open every tour in the living room. Left null the tour would still work
--    (the mapper falls back to the lowest sort_order), but the column is the
--    owner's choice and the seed should state it.
update public.listing_virtual_tours t
   set entry_scene_id = md5(t.id::text || ':living')::uuid
 where t.entry_scene_id is null
   and exists (
     select 1 from public.virtual_tour_scenes s
      where s.id = md5(t.id::text || ':living')::uuid
   );

-- listings.has_virtual_tour needs no update here: the trigger from
-- 20260731120000 fired on the inserts in step 1.
