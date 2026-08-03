# Multilingual listing content — implementation plan

Owner-authored listing copy (`title`, `description`) in every locale the app
serves, resolved per request, with graceful fallback.

Requirements: [`docs/improvements/14-bilingual-listing-content.md`](../improvements/14-bilingual-listing-content.md).
That file left the shape as an open question between four candidates. **This
plan makes the call**, and it is option **C — a side table** (`listing_translations`),
with owner-authored, optional translations, shipping `vi` + `en` on a shape
where a third locale is data and config, never DDL or a code branch.

---

## 1. The decisions, and why

| Question (from #14) | Decision |
|---|---|
| Storage | `listing_translations (listing_id, locale, title, description)` — N locales without DDL. |
| Source of truth | **Per listing, not global.** `listings.base_locale` records what the owner wrote first. Both languages are peers. |
| Who writes it | The owner, **optional**. A listing publishes with one language. No LLM on the write path. |
| Locales day one | `vi` + `en` — exactly what `i18n/routing.ts` declares. |
| Partial translations | **Per field**, not per listing. A translated title with an untranslated description falls back only on the description. |
| Fields | `title` and `description` only. |

### 1a. Deviation from #14's option C, and the reason

#14 described C as a pure side table with `listings` keeping no copy. **This
plan keeps `listings.title` / `listings.description` as the base copy** and
uses the side table for *additional* locales. The base columns are never null.

That deviation buys three things worth more than the extra normalization:

- **Nothing existing breaks.** Every current read path — the Stream channel
  denormalization (`lib/stream/server.ts:34`), `reviews-map`'s `stay:
  row.listing?.title`, the alerts edge function, `getListingForChat`'s narrow
  column select — keeps working untouched on day one and can be migrated
  later, or never.
- **A listing can never render blank.** Requirement #2 ("missing a translation
  degrades gracefully") becomes a schema guarantee rather than an application
  invariant to remember. There is always a `NOT NULL` string to fall back to.
- **Search stays cheap.** The existing PostgREST `title.ilike` filter in
  `lib/services/saved-listings.ts` still matches the base copy; the side table
  is an *additional* match, not a replacement (§6).

"Which listings lack an English version?" — C's headline query — still works:
`select id from listings l where not exists (select 1 from listing_translations
t where t.listing_id = l.id and t.locale = 'en') and l.base_locale <> 'en'`.

### 1b. The finding that reshapes the migration

`docs/improvements/14` assumed the ten seeded rows carry `"<VI> · <EN>"` and
implied Vietnamese is the base. **A read of the live database (project
`tkislpxzptslgaxfrvgt`, 28 rows) says otherwise:**

| Rows | Shape | Real base locale |
|---|---|---|
| 10 | `"<VI> · <EN>"` title, `…\n\nEN — <english>` description | `vi` |
| 18 | English-only demo seed (`"Sunlit studio near Mỹ Khê"`) | `en` |

A blanket `base_locale default 'vi'` would mislabel 18 of 28 rows and make
`/en` announce English copy as a Vietnamese fallback. The backfill has to
classify per row (§3d). This is also the concrete argument against #14's
option A, which structurally assumes one global base language.

### 1c. Explicitly out of scope

- **Amenity labels, district names, home types, cost terms.** Already
  localized through `messages/`. #14's scope note stands: do not widen this
  into a general content-translation system.
- **Virtual-tour room names and hotspot labels.** `20260731120000_virtual_tours.sql`
  states outright that room names are content and are never translated. If
  that reverses, the same `*_translations` shape extends to
  `virtual_tour_scenes` — but not in this effort.
- **Machine translation.** #14's option D remains available as a *write-time
  assist* on top of this schema (fill the empty locale tab with a suggestion
  the owner edits) with no schema change. Deliberately deferred: it would put
  an LLM dependency on the save path and needs a "machine-translated"
  affordance of its own.
- **`saved_searches.locale`** — the subscriber's email preference, unrelated.

---

## 2. Architecture: resolve at render, not at fetch

The single most consequential structural choice, because #14 flagged the trap:
`lib/services/listings-map.ts` is a *pure* module and cannot call `getLocale()`
itself.

Two ways out, and this plan takes the second:

**Rejected — locale as a service argument.** `getActiveListings(locale)` makes
locale part of the `"use cache"` key, doubling every cache entry (browse, three
landing showcases, similar-listings-per-listing, owner listings) for two short
strings. It also forces a locale argument through `getActiveListingsByIds`,
`getSimilarListings`, and the sitemap, which does not render text at all.

**Chosen — carry all locales, resolve at the page boundary.**

```
service (cached, locale-free)          → Listing carries every translation
  ↓
filter / sort / paginate               → haystack spans all locales  (§6)
  ↓
localizeListing(l, lang)  ← page/section boundary, once per listing
  ↓
components                             → plain `Listing`, `l.title` as today
```

Consequences, all good:

- **One cache entry per dataset**, unchanged from today.
- **Zero component changes.** `localizeListing` returns a `Listing` whose
  `title`/`desc` are already the right language, so `detail-view.tsx`,
  `listing-card.tsx`, `listing-row.tsx`, `owner-tour-card.tsx`,
  `propose-time-modal.tsx`, `share-header-slot.tsx`, `header-card.tsx`,
  `recently-viewed.tsx`, `renter-tour-card.tsx`, `tour-route-map.tsx`,
  `saved-list.tsx` and `calendar.ts` need no edit. Each is one call site
  *upstream* instead.
- **Search sees every language for free** (§6), because filtering runs before
  localization.
- **The fallback affordance is possible** (§8), because the resolver reports
  which locale each field actually came from, and the raw map survives on the
  object for a "show the original" toggle.

The cost: ~2 short strings of extra RSC payload per listing, and one discipline
rule — *localize at the boundary where the listing enters the tree, never
inside a leaf component.*

---

## 3. Schema — `supabase/migrations/20260802120000_listing_translations.sql`

### 3a. `listings.base_locale`

```sql
alter table public.listings
  add column base_locale text not null default 'vi'
    check (base_locale ~ '^[a-z]{2}(-[A-Z]{2})?$');
```

A BCP-47-ish regex rather than an enum, so a third locale is an
`i18n/routing.ts` edit alone. Records which language `listings.title` /
`listings.description` are written in.

### 3b. `listing_translations`

```sql
create table public.listing_translations (
  listing_id uuid not null
    references public.listings (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  title text check (char_length(title) <= 120),
  description text check (char_length(description) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (listing_id, locale),
  -- Per-field partial translation is the point, so either column may be null —
  -- but a row with neither is garbage the read path would have to filter.
  constraint listing_translations_not_empty check (
    nullif(btrim(coalesce(title, '')), '') is not null
    or nullif(btrim(coalesce(description, '')), '') is not null
  )
);
```

The PK is `(listing_id, locale)` — it is both the uniqueness rule and the index
every embedded read uses. `on delete cascade` means deleting a listing needs no
extra service work.

A row whose `locale` equals the listing's `base_locale` is allowed (enforcing
otherwise needs a cross-table trigger for no benefit); the read path treats it
as a shadow of the base columns and prefers it. Documented, not policed.

### 3c. RLS — mirroring `listing_virtual_tours` exactly

The existing policies are the template (`Anyone reads published tours of active
listings`, `Owners insert tours for own listings`, …). Translations are not
independently sensitive: they are visible exactly when the listing is.

```sql
alter table public.listing_translations enable row level security;

create policy "Anyone reads translations of visible listings"
  on public.listing_translations for select
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status = 'active' or (select auth.uid()) = l.owner_id)
  ));

-- insert / update / delete: owner of the parent listing only.
-- (three policies, each `exists (… and (select auth.uid()) = l.owner_id)`,
--  update carrying the same expression in both `using` and `with check`)
```

`(select auth.uid())` — the wrapped form, matching every existing policy; it
keeps the call out of the per-row loop.

### 3d. Backfill (same migration, re-runnable)

1. `update listings set base_locale = 'en' where title not like '%·%';`
   — the 18 English-only demo rows (§1b).
2. For the 10 bilingual rows: `split_part(title, ' · ', 1)` → `listings.title`,
   `split_part(title, ' · ', 2)` → an `en` translation row. Description splits
   on the `E'\n\nEN — '` marker the seed uses.
3. `insert … on conflict (listing_id, locale) do nothing` so re-running is safe.
4. A guard at the end: `do $$ begin if exists (select 1 from listings where
   title like '%·%') then raise exception …` — the mixed-language strings #14
   calls a demo workaround must be gone when this migration finishes.

**Verify after applying:** no row still matches `'%·%'` or `'%EN —%'`, and
`select base_locale, count(*) from listings group by 1` returns roughly
`vi: 10, en: 18`.

### 3e. Indexes

None beyond the PK on day one — 28 listings, and both search paths (§6) are
already `ilike '%…%'`, which no btree serves anyway. When the table justifies
it, `pg_trgm` + `gin (title gin_trgm_ops)` on both tables together, as one
change. Noted so it isn't half-done.

### 3f. `supabase/README.md`

Add the migration row to the table, in the established voice: what it does,
that `lib/database.types.ts` must be regenerated after it, and that PostgREST
embeds it as `listing_translations(*)` (single FK, so no disambiguation needed
— unlike `virtual_tour_scenes`).

---

## 4. Domain — `schemas/listing/index.ts`

```ts
/** One locale's version of the owner-authored copy. Either field may be
    absent: a translated title with an untranslated description is the common
    case, and must fall back per field, not wholesale. */
export const ListingTextSchema = z.object({
  title: z.string().optional(),
  desc: z.string().optional(),
});

// on ListingSchema:
//   baseLocale: z.string().default("vi")
//   i18n: z.record(z.string(), ListingTextSchema).optional()
```

Both optional/defaulted, on the `lat`/`lng` precedent already in this file:
absent is a normal state for fixtures and seed objects, not a broken one.

### The resolver — the one function this whole plan turns on

```ts
export type LocalizedListing = Listing & {
  /** Which locale each field actually came from — drives the §8 affordance. */
  titleLocale: string;
  descLocale: string;
};

/** Swap a listing's owner-authored copy to `locale`, per field, falling back
    to the base copy. Pure: the locale is always passed in, never read from
    request context — this module runs in the browser too. */
export function localizeListing(l: Listing, locale: string): LocalizedListing;

export function localizeListings(ls: Listing[], locale: string): LocalizedListing[];
```

Falling back **per field** is deliberate and is the answer to #14's open
question "does the page mix, or fall back wholesale?". Wholesale would throw
away a good translated title because the owner skipped the description.

Empty strings are treated as absent — a cleared textarea is "not translated",
never "this listing has no description" (#14, requirement 2).

`ListingCore` gains `i18n?: Record<string, ListingText>` and `baseLocale`, so
the write path and the action's wire schema carry translations too.

---

## 5. Mapping and services

### `lib/services/listings-map.ts`

- `toListing` accepts the embedded rows and folds them into `i18n`, skipping
  entries where both fields are blank.
- New `toTranslationRows(listingId, core): TablesInsert<"listing_translations">[]`
  — drops locales equal to `core.baseLocale` and rows that would be all-blank,
  so the not-empty check never fires from our own writes.
- **Stale comment to fix while here:** the header claims the browser reuses
  this module ("the saved page fetches active listings straight from the
  browser Supabase client"). Since #104 moved every Supabase call into the
  service layer, only `lib/services/*` imports it. The *rule* (stay pure, no
  `server-only`, no `getLocale()`) still holds and is now what earns the split
  — say that instead.

### `lib/services/listings.ts`

Every read that returns a `Listing` swaps `.select("*")` for
`.select("*, listing_translations(*)")`: `fetchActiveListings`,
`getListingsByOwner`, `getSimilarListings` (both the district and city
queries), `getListingById`, `listMyListings`, and the `.select()` after
insert/update in `createListing` / `updateListing`.

`getListingForChat` keeps its narrow column list — see §9.

**Writes.** `createListing` / `updateListing` write two tables. supabase-js
cannot transact across them, so:

- Write `listings` first, then the translations.
- On update, `delete … where listing_id = $1 and locale not in (kept)`
  followed by an `upsert` on the PK — a cleared tab removes the row rather
  than leaving a stale translation live.
- On failure of the second write: log and throw `ServiceError("failed")`. The
  listing survives with correct base copy and stale-or-missing translations —
  a benign, self-correcting state the owner fixes by saving again. **Do not**
  add a Postgres function to make this atomic; it would move the ownership
  check off the query that states it, which AGENTS.md forbids.
- Ownership is re-stated on the translation writes even though RLS covers it
  (`… where listing_id in (select id from listings where owner_id = …)` via
  the existing `writeOwnedListing` result), on the AGENTS.md "RLS is the last
  line, not the only one" rule.

### `lib/actions/listings.ts`

The static wire schema in `schemas/listing/` grows the `i18n` map. Cap the
number of locales accepted (`routing.locales`) — an action is a public HTTP
endpoint, and an unbounded record is an unbounded insert.

---

## 6. Search — the requirement most likely to be dropped

#14: *"free-text search matches either language"*, and warns there is no test
that would catch a miss.

### Browse — `app/[lang]/(app)/apartments/lib/query.ts`

`filterListings` builds `l.title + l.district + districtLabel + l.city + l.type`.
It runs on the raw, unlocalized set (§2's ordering), so the fix is to append
every translation:

```ts
const text = [l.title, ...Object.values(l.i18n ?? {}).flatMap(t => [t.title, t.desc])]
```

Pagination and sorting are unaffected — they never touched text.

### Saved page — `lib/services/saved-listings.ts` `textOr`

This one is SQL, and PostgREST **cannot `or()` across a parent column and an
embedded resource in one expression**. The shape that works, inside the same
service function:

1. Resolve matching ids first:
   `from("listing_translations").select("listing_id").or("title.ilike.…,description.ilike.…")`
   — scoped by `.in("listing_id", saved)`, which is already bounded.
2. Add `id.in.(<those ids>)` as one more condition on the existing `or` string.

The existing `sanitize()` (`[(),\\%]` → space) must be applied to the
translation query too — same PostgREST expression grammar, same injection
surface. Its comment already explains why; keep them adjacent.

The district/type label→slug expansion already in `textOr` is unaffected:
those labels come from `messages/`, not from listing content.

### Alerts — `supabase/functions/saved-search-alerts/index.ts`

The edge function reads rows directly and duplicates the matching in
`listingMatches` (~line 125), so it needs the same treatment independently —
#14 is right about this and it is the easiest thing in the plan to forget.

- Widen its row select to embed `listing_translations(*)`.
- `listingMatches` haystack spans all locales, mirroring `filterListings`
  exactly — including the deliberate NaN behaviour the existing comment
  defends. Any divergence here emails phantom alerts.
- The email body renders `listing.title` at the **subscriber's** `locale`
  (already on `saved_searches`), falling back to base. This is the one place
  the "which locale" answer comes from stored data instead of the URL.

---

## 7. SEO, metadata and social

- **`app/[lang]/(app)/apartments/[id]/page.tsx` `generateMetadata`** — localize
  before building `t("title", { title })`. It already has `lang`.
- **`app/sitemap.ts`** — no code change, but this is the change that makes its
  existing hreflang alternates *honest*. `x-default` continues to point at the
  default-locale URL; per §1's "both are peers", it is a routing default, not a
  content claim.
- **JSON-LD — `app/[lang]/(app)/apartments/[id]/lib/json-ld.ts`** — `name` /
  `description` localized, and add `inLanguage: <the locale actually served>`,
  which the resolver now knows per field. Use the description's locale.
- **OG — `app/[lang]/opengraph-image.tsx` / `lib/og.tsx`** — renders the title;
  localize at the same boundary. Lexend already covers Vietnamese diacritics
  (`lib/og.tsx` says so), so no font work.

---

## 8. UI

### Owner — `app/[lang]/(app)/apartments/components/listing-form.tsx`

Title and description become per-locale tabs (`routing.locales`, base first,
marked "original"). Everything else in the form is untouched.

- Only the base locale's title is required — `createListingFormSchema`'s
  `t("listing.title")` rule applies to the base tab alone. Requirement 3: the
  owner is never forced to write twice to publish.
- Tabs for untranslated locales show a subdued "not translated — renters see
  the <base> version" hint, so the fallback is a stated choice, not a surprise.
- Form values gain `i18n: Record<locale, { title: string; desc: string }>`;
  `listingToForm` / `formToCore` round-trip it. `blankListingForm` seeds one
  empty entry per configured locale — adding a locale to `routing.ts` grows the
  form with no code change, which is the whole point of the shape.

### Renter — `detail-view.tsx`

When `descLocale !== locale`, a small line under the description: *"Shown in
Vietnamese — the owner hasn't written an English version."* Nothing on the
cards; a badge on every tile would be noise.

**Fix while here** (#14's closing note, independent but in this area): the
description renders as bare `{listing.desc}` in a plain `<p>`, collapsing
authored newlines. The seeded descriptions are genuinely multi-paragraph — add
`whitespace-pre-line`.

### Messages — `messages/vi.json` + `messages/en.json`

New keys under `listingForm.*` (tab labels, "original", the untranslated hint)
and `detail.*` (the fallback line). Both files, same shape, per the
`i18n-translation` skill. **Invoke that skill before writing them** — Vietnamese
is the source of truth for meaning, not a literal translation of the English.

---

## 9. Known limits, written down rather than discovered later

- **Stream channel data** (`lib/stream/server.ts:34`, `listing_title`) is
  denormalized at channel creation and rendered in the thread header at
  whatever language it was created in. Localizing it means re-writing custom
  data on every listing edit, for a header chip. Accept; leave it on base copy.
- **`reviews-map.ts` `stay: row.listing?.title`** — same call, same reason.
- **`getListingForChat`** keeps its narrow select for the same reason.
- **Sorting** never touched text and still doesn't; there is no alphabetical
  listing sort to make locale-sensitive.

---

## 10. Tests

Per AGENTS.md: pure logic only, in `__tests__` beside the module.

| File | Cases |
|---|---|
| `schemas/listing/__tests__/index.test.ts` | `localizeListing`: exact hit; per-field fallback (title translated, desc not); empty string treated as absent; unknown locale → base; `titleLocale`/`descLocale` correctness; `formToCore`/`listingToForm` round-trip with translations. |
| `app/[lang]/(app)/apartments/lib/__tests__/query.test.ts` | **The case #14 says nothing would catch**: an English `q` matching a listing whose base copy is Vietnamese, and vice versa. |
| `tests/factories.ts` | `makeListing` gains `baseLocale: "vi"` and an `i18n` fixture, so a schema change breaks in one place. |

`lib/services/**` and `lib/actions/**` are excluded from unit coverage by
design, so **the service, mapping and edge-function changes are only covered by
`pnpm test:e2e`** — AGENTS.md is explicit that a data-access change needs that
suite exercised. Add an e2e assertion that `/apartments/<id>` and
`/en/apartments/<id>` serve different titles for a translated listing.

Gate: `pnpm build:local` (client missing-keys only error at runtime), plus
switching languages in the running app.

---

## 11. PR breakdown

Each lands green and useful on its own.

| PR | Contents | Reviewable claim |
|---|---|---|
| **A — schema + backfill** | Migration (§3), `lib/database.types.ts` regen, `supabase/README.md` row. No app code. | The mixed-language seed strings are split and `base_locale` is right for every row. **Not render-neutral — see below.** |
| **B — read path** | Domain + resolver + tests (§4), mapping and service selects (§5 reads), `localizeListings` at every page boundary (§2), SEO/OG/JSON-LD (§7), the `whitespace-pre-line` fix. | `/en` serves the English copy the backfill created. Still no way to author one. |
| **C — search** | Browse haystack, `textOr` two-step, edge function, the `query.test.ts` case (§6). | An English `q` finds a Vietnamese listing, on browse, on saved, and in alert emails. |
| **D — authoring** | Write path (§5 writes), wire schema, form tabs, messages, detail affordance (§8). | An owner can write and clear a translation, and sees which locales are missing. |

B before C is deliberate: C's edge-function change is the one with no unit-test
safety net, and it is easier to verify once the read path is observable.

### PR A is not render-neutral — A and B should ship together

Splitting the ten bilingual rows removes the English half from
`listings.title`, and nothing reads `listing_translations` until PR B. In that
window those ten homes render **Vietnamese-only to everyone, including `/en`**,
where they previously rendered both languages at once.

That is a smaller regression than it sounds — the old behaviour was showing
every renter a language they didn't ask for, which #14 calls a demo workaround
rather than a design — and `getActiveListings` is `cacheLife("hours")`, so it
does not appear until the cache turns over or a deploy busts the tag. But it is
a real user-visible change, so **do not leave main sitting between A and B.**
If they must be separated, hold A's merge until B is ready to follow it.

---

## 12. Adding a third locale afterwards

The measure of whether this plan delivered. Adding `ko` should be:

1. `i18n/routing.ts` — `locales: ["vi", "en", "ko"]` + `localeNames`.
2. `messages/ko.json` — the UI strings (the large but unrelated job).
3. Nothing else. The form grows a tab, the resolver resolves it, search
   searches it, the sitemap emits the alternate, the migration is not touched.

If a step 4 appears during implementation, the shape drifted — fix it there
rather than documenting the exception.
