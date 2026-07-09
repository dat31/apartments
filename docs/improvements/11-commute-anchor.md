# 11. Commute anchor ("distance to my place")

**Impact: high for renters with a fixed destination, effort: medium.** Most
renters optimize for one place — office, school, the beach, a partner's
apartment. The app knows where every listing is, but nothing about where the
renter's life is anchored, so they mentally triangulate on every card.

## The flow

1. On `/apartments` (filters panel or the map view from #1), the renter taps
   **"Set a place I care about"** → a small dialog with the same Leaflet
   pin-picker the listing form already uses (`location-picker.tsx`) + an
   optional label ("Office"). Stored client-side (localStorage) for guests,
   on the profile for members.
2. From then on, **every listing card shows a distance line**:
   "📍 2.1 km to Office". The detail page map draws both pins.
3. The sort menu gains **"Closest to Office"**. In map view (#1) the anchor
   renders as a distinct marker so spatial scanning is instant.
4. The anchor is editable/removable from the same entry point. One anchor in
   v1 — multiple anchors (office + gym) is a later refinement.

## Straight-line vs. real routing

Start with **haversine straight-line distance** (a `distanceKm` helper
belongs in `lib/geo.ts` next to `coordsOf`). It's computable for the whole
result set instantly with no network calls, and for intra-city Da Nang it
ranks correctly even when the km value is approximate.

Real drive times via OSRM (already used by the detail map and tour route
planner) don't scale to "every card in a result list" — the route planner
gets away with it because a tour day has ~2–5 stops. Compromise: show OSRM
drive time **on the detail page only** ("~9 min by motorbike"), keep
straight-line on cards. Degrade gracefully when OSRM is down, as the route
planner already does.

## Integration points

- **Pin picking:** reuse `apartments/components/location-picker.tsx`
  (built for the listing form) in renter mode.
- **Coordinates:** `lat`/`lng` with `coordsOf()` fallback — same as every
  map feature.
- **Cards:** `components/listing-card.tsx` gains an optional distance line;
  it must stay cheap since cards render in lists (pure math, no fetch).
- **Sort:** "closest" slots into `SORTS`/`filterListings` in
  `apartments/lib/query.ts` — but note the anchor is client-side state, so
  either the sort happens in a client layer or the anchor coords ride the
  URL (`?near=16.06,108.22`). URL param is the cleaner fit with the
  existing "URL is the single source of truth" architecture and makes the
  sort shareable.
- **Compare view (#10)** and the tour planner both get a free row/feature
  from the same helper.

## Scope notes

- No geocoding/address search in v1 — pin-drop only (matches the listing
  form's approach; avoids a geocoding dependency).
- Privacy: the anchor never leaves the device unless the member saves it to
  their profile; it's never attached to tours or shared listings.
