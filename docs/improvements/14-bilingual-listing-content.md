# 14. Bilingual listing content — `title_en` / `description_en`

**Impact: medium-high for the English audience, effort: unknown until the
approach is picked.** The app ships in two locales, but a listing's two most
important strings aren't part of that. `listings.title` and
`listings.description` are single `text` columns, so whatever the owner typed
is what every renter sees — a Vietnamese listing stays Vietnamese under `/en`,
and an English one stays English under `/`.

Everything *around* the listing is already translated: chrome, filters, cost
labels, availability, amenity names, alert emails. The listing itself is the
hole in the middle of that.

> **Status: decided — see [`docs/plans/multilingual-listing-content.md`](../plans/multilingual-listing-content.md).**
> The call is **option C**, a `listing_translations` side table, with
> owner-authored optional translations and `vi` + `en` on day one. The
> candidate designs below are kept as the record of what was weighed; the plan
> states the deviations from C as written here (the base copy stays in
> `listings`) and why.
>
> One factual correction this file makes worth carrying: it assumes the seeded
> rows are Vietnamese-based. The live database says 18 of 28 listings are
> **English-only** demo rows and only 10 carry the `"<VI> · <EN>"` shape, so
> the base language has to be recorded per listing, not assumed globally —
> which is also the strongest argument against option A.

## Why it matters now

Da Nang's rental market is genuinely bilingual — Vietnamese owners listing to a
mix of local renters and expats/remote workers. An English-speaking renter
filtering to An Thượng today lands on a page of Vietnamese titles they can't
skim, and the `q` free-text filter can't match what they'd actually type.

The seed data currently papers over this: the ten seeded listings put both
languages in one string (`"<VI> · <EN>"` in the title, a `EN — …` block at the
foot of the description). That renders both languages to *everyone* regardless
of locale, which is a demo workaround, not a design. Whatever we build has to
replace it.

## What "done" looks like, whatever the approach

These hold regardless of which option wins:

1. A renter on `/en` sees English listing copy when it exists; a renter on `/`
   sees Vietnamese. No mixed-language strings in either.
2. Missing a translation degrades gracefully — show the language that exists,
   never a blank title. An empty English description must not read as "this
   listing has no description".
3. The owner is never *forced* to write twice to publish. Whatever fills the
   second language must be optional or automatic.
4. Free-text search matches either language, so an English speaker typing
   "sea view" finds a listing titled in Vietnamese.
5. Existing rows keep working through the migration, on the `lat`/`lng`
   precedent — absent is a normal state, not a broken one.

## The open question: four candidate shapes

### A. Sibling columns — `title_en`, `description_en`

Vietnamese stays in the existing columns as the base; English gets its own
nullable pair. Read path picks by locale with a fallback to the base.

*For:* smallest diff, obvious mapping in `listings-map.ts`, trivially
indexable, no new joins. *Against:* hardcodes exactly two languages into the
schema, and a third locale means another migration and another branch
everywhere. Also quietly declares Vietnamese the source of truth, which is
wrong for owners who think in English.

### B. JSONB per field — `title jsonb` as `{ vi, en }`

*For:* adding a locale is data, not DDL. *Against:* loses column-level
constraints, every read site needs an accessor, and Postgres text search over
JSONB is more work than over a column. Migrating the existing `text` columns is
the most invasive of the four.

### C. Side table — `listing_translations (listing_id, locale, title, description)`

The textbook normalization. *For:* scales to N locales, keeps `listings`
narrow, and makes "which listings lack an English version?" a one-line query.
*Against:* a join on every listing read — including the browse list, the
sitemap and the alerts edge function — and the domain `Listing` type stops
being a straight row map.

### D. Don't store it — translate on read

Machine-translate (LLM or a translation API) at request time, cached. *For:*
zero owner burden, instant coverage of every existing row. *Against:* cost and
latency on a hot path, non-deterministic copy, no owner control over how their
home is described, and a hard dependency for what is otherwise a static field.
Plausibly a *complement* to A/B/C — auto-fill the second language on write,
let the owner edit it — rather than a replacement.

**Leaning, for whoever picks this up:** A is the honest default if two locales
is genuinely the ceiling, and C is right the moment it isn't. D as a write-time
assist on top of either is the interesting combination. But this is exactly the
call that hasn't been made.

## Cross-cutting decisions any approach still has to answer

- **Source of truth.** Is Vietnamese the base with English derived, or are both
  peers? A implies the former; C allows the latter. This also decides what the
  sitemap's `x-default` should point at.
- **Who writes the second language** — the owner (form gains a language
  toggle), an automated pass on save, or a background job over existing rows.
- **Partial translations.** Title translated but description not is the common
  case. Does the page mix, or fall back wholesale per listing?
- **A "translated" affordance.** If copy is machine-generated, renters should
  probably be told, and offered the original.
- **Migrating the seeded rows.** The ten `"<VI> · <EN>"` rows need splitting
  back apart — mechanical, but it needs doing in the same change.

## Integration points

- **Schema:** Supabase migration on `listings` (or a new table under C), plus
  `lib/database.types.ts` regeneration.
- **Domain:** `schemas/listing` — `Listing`, `ListingCore`, and the form schema
  in `createListingFormSchema`. Mapping in `lib/services/listings-map.ts`
  (`toListing` / `toListingWrite`), which is where a locale argument would have
  to enter — note it's a *pure* module used from both server and client reads,
  so it can't reach for `getLocale()` itself.
- **Reads:** `lib/services/listings.ts` and every caller that renders a title —
  `detail-view.tsx`, the browse cards, `owner-tour-card.tsx`,
  `listing-row.tsx`, `propose-time-modal.tsx`, `share-header-slot.tsx`.
- **Search:** `filterListings` in `app/[lang]/(app)/apartments/lib/query.ts`
  builds its haystack from `l.title + district + city + type` — it must take in
  both languages, or English `q` silently misses.
- **Alerts:** `supabase/functions/saved-search-alerts/index.ts` duplicates that
  matching in `listingMatches` (line ~125) and renders `listing.title` into the
  email body at the subscriber's `locale` — the edge function reads rows
  directly, so it needs the same treatment independently.
- **SEO:** `app/[lang]/(app)/apartments/[id]/page.tsx` `generateMetadata` and
  `lib/seo.ts`. `app/sitemap.ts` already emits hreflang alternates for every
  active listing; those alternates become a lie if `/en` serves Vietnamese
  copy. OG images (`app/[lang]/opengraph-image.tsx`, `lib/og.tsx`) render the
  title too.
- **Form:** `listing-form.tsx` — whatever the owner-side entry surface is.
- **i18n:** new `listingForm.*` strings, vi + en, per the `i18n-translation`
  skill's conventions.

## Scope notes

- Unrelated to `saved_searches.locale`, which is the subscriber's email
  preference, not content language.
- The `q` haystack change is easy to forget and has no test that would catch
  it — `app/[lang]/(app)/apartments/lib/__tests__/query.test.ts` should grow a
  case for it in the same PR.
- Amenity labels, district names and cost terms are *already* localized through
  `messages/` — this is only about the two owner-authored free-text fields.
  Don't widen it into a general content-translation system.
- Detail's description renders as bare `{listing.desc}` in a plain `<p>`
  (`detail-view.tsx:110`), so authored newlines collapse. Independent of this
  work, but any multi-paragraph description is affected — worth fixing with
  `whitespace-pre-line` whenever this area is next touched.
