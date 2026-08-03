-- Multilingual listing content — the two owner-authored strings (title,
-- description) in every locale the app serves.
--
--   listings.base_locale   what listings.title/description are written in.
--                          Per listing, never global: this database holds
--                          Vietnamese-authored *and* English-authored homes,
--                          so there is no one "source language" (backfill 3).
--   listing_translations   every other locale, one row per (listing, locale).
--                          Either column may be null — a translated title
--                          with an untranslated description is the common
--                          case, and falls back per field, not wholesale.
--
-- The base copy deliberately stays on `listings` instead of moving into the
-- side table (docs/plans/multilingual-listing-content.md §1a). It keeps
-- title/description NOT NULL, so no read path can render a blank home, and
-- the existing denormalisations — Stream channel data, reviews' `stay`, the
-- alerts edge function — keep working untouched.
--
-- Adding a third locale is an i18n/routing.ts edit and nothing else: that is
-- why `locale` is a checked text column rather than an enum, and why nothing
-- below names 'vi' or 'en' outside the one-off backfill.
--
-- Applied 2026-08-02.

-- ------------------------------------------------------------ base locale

alter table public.listings
  add column base_locale text not null default 'vi'
    constraint listings_base_locale_check
    check (base_locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

comment on column public.listings.base_locale is
  'Language of title/description on this row. Reads fall back to these '
  'columns when listing_translations has no entry for the active locale.';

-- ------------------------------------------------------------ translations

create table public.listing_translations (
  listing_id uuid not null
    references public.listings (id) on delete cascade,
  locale text not null
    constraint listing_translations_locale_check
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),

  -- Nullable on purpose: partial translation is a first-class state. No
  -- length checks — listings.title/description have none either, and a
  -- translation must never be harder to write than the original.
  title text,
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The pair is both the identity and the only index the read path needs:
  -- listing_id leads, so the embedded `listing_translations(*)` select and
  -- the FK's cascade both ride it.
  primary key (listing_id, locale),

  -- A row with neither string is garbage every reader would have to filter.
  -- The service drops all-blank locales before writing (plan §5); this is
  -- the backstop.
  constraint listing_translations_not_empty check (
    nullif(btrim(coalesce(title, '')), '') is not null
    or nullif(btrim(coalesce(description, '')), '') is not null
  )
);

comment on table public.listing_translations is
  'Owner-authored listing copy in locales other than listings.base_locale. '
  'A row for the base locale itself is allowed and simply shadows the '
  'columns — not worth a cross-table trigger to forbid.';

create trigger set_updated_at
  before update on public.listing_translations
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------- RLS
--
-- Translations are never independently sensitive: they are visible exactly
-- when their listing is, and writable exactly by its owner. Same shape as
-- listing_virtual_tours' policies, including the `(select auth.uid())` form
-- that keeps the call out of the per-row loop.

alter table public.listing_translations enable row level security;

create policy "Anyone reads translations of visible listings"
  on public.listing_translations for select
  using (exists (
    select 1 from public.listings l
     where l.id = listing_id
       and (l.status = 'active' or (select auth.uid()) = l.owner_id)
  ));

create policy "Owners insert translations for own listings"
  on public.listing_translations for insert
  with check (exists (
    select 1 from public.listings l
     where l.id = listing_id and (select auth.uid()) = l.owner_id
  ));

create policy "Owners update own translations"
  on public.listing_translations for update
  using (exists (
    select 1 from public.listings l
     where l.id = listing_id and (select auth.uid()) = l.owner_id
  ))
  with check (exists (
    select 1 from public.listings l
     where l.id = listing_id and (select auth.uid()) = l.owner_id
  ));

create policy "Owners delete own translations"
  on public.listing_translations for delete
  using (exists (
    select 1 from public.listings l
     where l.id = listing_id and (select auth.uid()) = l.owner_id
  ));

-- ----------------------------------------------------------------- backfill
--
-- Ten seeded rows carry both languages in one string — '<VI> · <EN>' in the
-- title, a '\n\nEN — …' block at the foot of the description. That renders
-- both languages to everyone regardless of locale; it was a demo workaround
-- for the absence of this table, and it has to be gone when this file
-- finishes (assertion at the end).
--
-- Every step is a pure function of current content, so re-running the file
-- is a no-op rather than a corruption: once split, no title matches the
-- separator, and the language test below returns the same answer on a row it
-- has already classified. Nothing here hardcodes a uuid — on a rebuilt
-- database each step simply matches nothing, which leaves the correct
-- defaults in place.

-- 1. The English half of a bilingual row becomes its 'en' translation.
insert into public.listing_translations (listing_id, locale, title, description)
select id,
       'en',
       nullif(btrim(split_part(title, ' · ', 2)), ''),
       nullif(btrim(split_part(description, E'\n\nEN — ', 2)), '')
  from public.listings
 where title like '% · %'
   and (nullif(btrim(split_part(title, ' · ', 2)), '') is not null
     or nullif(btrim(split_part(description, E'\n\nEN — ', 2)), '') is not null)
on conflict (listing_id, locale) do nothing;

-- 2. The Vietnamese half stays in the base columns.
update public.listings
   set title = btrim(split_part(title, ' · ', 1)),
       description = btrim(split_part(description, E'\n\nEN — ', 1))
 where title like '% · %';

-- 3. Which language each row's base copy is in.
--
--    Runs *after* the split, so the ten rows above are pure Vietnamese by the
--    time they are tested. The alternative — classifying by "does the title
--    still carry the separator" — would silently relabel every row on a
--    second run, and would sweep in any listing created between this file
--    being written and being applied.
--
--    The test is a set of Vietnamese words that cannot appear in English
--    copy. It is not language detection; it is a rule sized to this data,
--    which is why the assertion below states what it expected to find. The
--    English demo seed contains Vietnamese *place* names ('Mỹ Khê', 'Hàn
--    River'), so diacritics alone would misclassify all ten of them.
update public.listings
   set base_locale = case
         when (title || ' ' || description) ~* '(căn hộ|địa chỉ|mô tả|nội thất|phòng ngủ|nguyên căn| và | của | gần | ra biển|đi bộ)'
         then 'vi' else 'en' end;

-- 4. Assert the outcome rather than trusting it.
do $$
declare
  mixed int;
  vi int;
  en int;
begin
  select count(*) into mixed from public.listings
   where title like '% · %' or description like ('%' || E'\n\nEN — ' || '%');
  if mixed > 0 then
    raise exception 'listing_translations backfill left % mixed-language row(s)', mixed;
  end if;

  select count(*) filter (where base_locale = 'vi'),
         count(*) filter (where base_locale = 'en')
    into vi, en
    from public.listings;

  -- Informational, not a constraint: a rebuilt database legitimately has
  -- different counts (this database had vi=15, en=13 on 2026-08-02).
  raise notice 'listing base_locale: vi=%, en=%, en translations=%',
    vi, en, (select count(*) from public.listing_translations where locale = 'en');
end $$;
