# 6. Filter gaps — availability date, area range, "newest" sort

**Impact: medium, effort: small.** Three additions to the existing
filter/sort system that each remove a real renter dead-end. All three ride
the existing URL-param architecture — no new patterns.

## 6a. "Newest" sort (do this one first)

**Flow:** renter visits weekly to see what's new → opens the sort menu →
picks **"Newest"** → listings order by `created_at` descending.

Today's sorts are featured / price low / price high / area. There is no way
to see fresh inventory first, which punishes exactly the repeat visitors the
app most wants. This is also the natural default landing sort for a
marketplace.

- `SORTS` array + `parseSort` in `apartments/lib/query.ts`; one more case in
  `filterListings`'s sort switch; label in `sort-menu.tsx` + messages.
- `created_at` exists on the DB row; expose it on the domain `Listing`
  (`schemas/listing`, mapped in `lib/services/listings-map.ts`). Seed rows
  can synthesize a stable order from their index.

## 6b. Availability filter

**Flow:** renter needs a place for **August 1** → filters panel gains an
"Available" section: **[Any] [Now] [By date…]** → picking a date hides
listings whose `available` date is after it → the listing card's existing
availability line does the rest.

The data is fully present — `Listing.available` is `"now"` or `YYYY-MM-DD`,
and the detail page already renders it via `availability-label.tsx`. The
renter just can't *query* it. Predicate: `available === "now" ||
available <= chosenDate`.

- New `avail` URL param in `parseFilters` + `DEFAULT_FILTERS`
  (`schemas/filters`), predicate in `filterListings`, chips + a native date
  input in `filters-panel.tsx`, count in `activeFilterCount`.

## 6c. Area (m²) range

**Flow:** renter working from home wants ≥ 60 m² → filters panel gains
min/max area inputs mirroring the price pair → results narrow.

Area is already displayed on every card and sortable, but not filterable —
an odd asymmetry. Implementation is a copy of the min/max price pattern,
including the `useDebouncedTextParam` hook already in `filters-panel.tsx`.

## Shared integration notes

- Every change flows through the same four touchpoints: `schemas/filters`
  (shape + defaults) → `apartments/lib/query.ts` (parse + predicate) →
  `filters-panel.tsx` (controls) → messages (`apartments.filtersPanel.*`,
  vi + en).
- The Saved page's DB-side filtering (`hooks/use-saved-listings.ts`
  translates filters into a Supabase query) must gain the same three
  conditions — keep the two predicate implementations in sync or extract a
  shared mapping.
- `remember-search` and saved searches (#3) inherit all of this for free
  since they store the query string.
