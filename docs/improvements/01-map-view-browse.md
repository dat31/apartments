# 1. Map view on browse

**Impact: high.** Location is the #1 criterion for renters, yet the only maps
today are the single-listing pin on the detail page and the tour-day route on
`/tour`. Browse is list-only.

## The flow

1. Renter opens `/apartments`. Next to the sort menu there's a **List ⇄ Map**
   toggle (URL param, e.g. `?view=map`, so it survives back/forward and
   sharing — same philosophy as the existing filter params).
2. **Desktop:** switching to map shows a split view — filtered result cards in
   a narrow left column, a Leaflet map on the right filling the viewport
   height. **Mobile:** map is full-screen with a floating "Show list" pill
   (the pattern renters know from Airbnb/Zillow).
3. Every listing in the current filtered set appears as a **price-pin**
   ("$1.4k") at its coordinates. Filters keep working exactly as they do
   now — tap "Studio" and the pins re-render to just studios.
4. Tapping a pin opens a small card popup (cover photo, title, price,
   beds/area, save button) with a link to the detail page. Hovering a card in
   the list highlights its pin, and vice versa.
5. Panning/zooming the map filters the list to the visible bounds
   ("Search this area" — either automatic or a button; a button is simpler
   and avoids request storms).

## Why this beats the current flow

Today a renter who cares about "walkable to Mỹ Khê beach" has to know which
district that is, filter by district, then open each detail page to see the
map. With a map view they see the whole inventory spatially in one glance and
never leave browse.

## Integration points

- **Coordinates already exist:** listings created via the form store
  `lat`/`lng`; legacy/seed rows fall back to `coordsOf()` in `lib/geo.ts` —
  the exact same fallback the detail map and tour route map already use.
- **Map stack exists:** reuse the lazy-loading pattern from
  `app/[lang]/(app)/apartments/[id]/components/location-map-lazy.tsx` and the
  tour route map (`tour/components/tour-route-map-lazy.tsx`) so Leaflet stays
  out of the initial JS bundle — important given the landing-LCP work already
  done on this branch.
- **View toggle state** goes through `use-filter-nav.ts` like every other
  browse param; `parseFilters`/`parseSort` in `apartments/lib/query.ts` stay
  untouched, only a `parseView` is added.
- **Bounds filtering** can start fully client-side (the filtered set is
  already small); if inventory grows, push a bounding-box condition into the
  Supabase query in `lib/services/listings.ts`.

## Scope notes

- Pagination doesn't apply in map mode (pins show the whole filtered set);
  the list column can keep pagination or switch to scroll — keep pagination
  for the first cut, it's already built.
- Marker clustering is unnecessary at current inventory size; note it as a
  follow-up, don't build it now.
- Respect the existing skeleton/Suspense structure in
  `apartments/components/browse.tsx` so the shell stays prerenderable.
