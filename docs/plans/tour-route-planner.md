# Plan: Tour Route Planner ("best route for my tour day")

> Handover doc for a future session. Written 2026-07-08 on branch
> `feat/detail-location-map` (PR #40 — the detail-page Leaflet map). Read this
> whole file before writing code; it records decisions already made with the
> user, the current state of the map stack, and a working verification recipe.

## 1. Feature summary

When a renter has ≥2 upcoming home tours on the same day, the `/tour` page
offers a per-day route view: a Leaflet map showing every tour stop as a
numbered pin plus the renter's own location, the driving route between them in
schedule order, per-leg drive times, a total, and warnings when the gap
between two tours is shorter than the drive. Later phases add "better order"
suggestions and real per-listing coordinates.

## 2. Decisions already made (do not re-litigate)

- **No privacy gating on listing location.** The user decided owners are
  service providers and publish their location. Show exact pins everywhere
  once real coordinates exist. The detail map's "approximate location" circle
  and `detail.map.approx*` copy can be dropped when phase A lands (ask the
  user first — it's their design copy).
- **Suggest-only optimization.** Phase D suggests a better visiting order; it
  does NOT rebook or touch owner availability.
- **Route view lives inline on `/tour`** (expandable per-day section), not a
  separate route/page.
- **Keep OSRM** (public `router.project-osrm.org`) as the routing engine — no
  API keys, already used by the detail map. Degrade gracefully when it's down.

## 3. Current state (what already exists)

### The detail-page map stack (reuse all of it)

- `app/[lang]/(app)/apartments/[id]/components/location-map.tsx` — `"use client"`
  Leaflet map: dynamic `await import("leaflet")` inside `useEffect` (leaflet
  touches `window` at import), theme colors resolved via
  `getComputedStyle(node).getPropertyValue("--primary"/"--background")` because
  Leaflet writes SVG presentation attributes that can't evaluate `var()`,
  divIcon pin/dot markers, geolocation-on-mount, OSRM route drawing,
  scroll-wheel zoom only after click, `invalidateSize()` on a 250 ms timer.
- `app/[lang]/(app)/apartments/[id]/components/location-map-lazy.tsx` —
  `next/dynamic` wrapper with `ssr: false` + skeleton fallback. Copy this
  pattern for the tour route map.
- `app/[lang]/(app)/apartments/[id]/components/location-map-skeleton.tsx` —
  section-shaped skeleton (uses `Skeleton` from `components/ui/skeleton` +
  the repo's `.skeleton` shimmer class).
- `app/[lang]/(app)/apartments/[id]/components/leaflet-theme.css` — map chrome
  themed with design tokens + dark-mode tile invert
  (`.dark .leaflet-tile { filter: invert(1) hue-rotate(180deg) ... }`).
  Imported by location-map.tsx so it ships only with routes that render a map.
  The tour route map should import this same file (it stays global-CSS by
  nature; scoping comes from the import site).
- `app/[lang]/(app)/apartments/[id]/lib/geo.ts` — `listingCoords(listing)`
  (district centroid + deterministic ±650 m jitter from listing id, because
  the DB has **no lat/lng column**), `kmBetween`, `LatLng` type.
- **Gotcha:** globals.css enforces `* { border-radius: 0 !important;
  box-shadow: none !important }` (flat "Hearth" system). Round map markers
  need inline `!important` on `border-radius` in the divIcon HTML strings —
  see the existing pin/dot markers.

### Tours data

- Supabase `tours` table: `id, listing_id, owner_id, renter_id, date
  (YYYY-MM-DD), time (HH:mm), status (pending|confirmed|declined|reschedule),
  proposed_date, proposed_time, note, move_in, people, renter_*`.
- `hooks/use-my-tours.ts` → `useMyTours()` returns
  `items: { tour: TourRequest; listing: Listing | null }[]` — the listing is
  already joined (`select("*, listing:listings(*)")`). Coordinates for each
  stop are therefore one `listingCoords(listing)` call away. React-query,
  keyed on user id.
- Renter tour UI: `app/[lang]/(app)/tour/page.tsx` →
  `components/renter-tours.tsx` (client, uses `useMyTours`) →
  `components/renter-tour-card.tsx`.
- Domain schema: `schemas/tour/index.ts` (`TourRequest`).

### Listings data

- Supabase `listings` table columns (see `lib/database.types.ts`): no
  address, no lat/lng. Row → domain mapping in
  `lib/services/listings-map.ts` (`toListing`), domain type in
  `schemas/listing/index.ts` (`ListingSchema`). Districts are a Postgres enum
  matching the `District` enum slugs.
- Listing create/edit form: `app/[lang]/(app)/apartments/components/listing-form.tsx`
  (client, react-hook-form + `createListingFormSchema` in
  `schemas/listing/index.ts`; string-typed numerics converted in
  `formToCore`).

### Repo conventions (enforced by project skills — read them first)

- `.claude/skills/design-handoff` — component reuse rules, route-local file
  structure (`app/<route>/{components,lib,schemas,hooks}`), zod-derived types,
  one component per file, `Link` for navigation.
- `.claude/skills/server-first-rendering` — server components by default,
  client leaves only.
- `.claude/skills/i18n-translation` — next-intl v4, vi (default, source of
  truth) + en, mirror both `messages/{vi,en}.json`, ICU plurals, format
  numbers/dates via `useFormatter`/`getFormatter`, locale-aware `Link` from
  `@/i18n/navigation`.
- **pnpm, not npm** (`npm install` fails in this repo). Build:
  `pnpm run build:local` (wraps `.env.local`). Lint: `pnpm lint` — has 4
  pre-existing errors + 5 warnings (react-hooks/set-state-in-effect etc. in
  back-to-results, book-tour-button, language-switcher, site-header); don't
  add new ones. `react-hooks/set-state-in-effect` forbids sync setState in
  effect bodies — put setState inside async callbacks (see the
  `requestPosition` pattern in location-map.tsx).

## 4. Phases

Recommended order: A can ship independently; B–D depend on nothing in A
(they work with synthesized coords) but are much more useful after A.

### Phase A — real listing coordinates

1. Migration (via supabase MCP `apply_migration` or SQL):
   ```sql
   alter table public.listings
     add column lat double precision,
     add column lng double precision;
   ```
   Nullable on purpose — old rows fall back to `listingCoords()`.
2. Regenerate `lib/database.types.ts` (supabase MCP
   `generate_typescript_types`).
3. Move `app/[lang]/(app)/apartments/[id]/lib/geo.ts` → `lib/geo.ts` (shared;
   two routes need it now). Update the two imports in
   `location-map.tsx`/`detail-view.tsx`.
4. `ListingSchema`: add `lat: z.number().optional()`, `lng: z.number().optional()`.
   `toListing`: map the columns. Add a shared helper
   `coordsOf(listing): LatLng` = real coords if present else
   `listingCoords(listing)` — every consumer goes through it.
5. Listing form: add a pin-picker section — a lazy Leaflet map (reuse the
   lazy + skeleton pattern) centered on the selected district's centroid;
   click/drag a marker to set `lat`/`lng`; changing district recenters if no
   pin set yet. Form schema: keep as numbers-in-strings like the other
   numeric fields or as a `{lat,lng} | null`; wire through `formToCore` and
   the create/edit submit paths (find them via `formToCore` usages).
6. Detail map: use `coordsOf`; optionally drop the privacy circle/copy (ask).
7. Optional backfill: leave old rows null (fallback covers them).

### Phase B — per-day route in schedule order (the core feature)

New route-local files under `app/[lang]/(app)/tour/`:

- `lib/route-plan.ts` — pure, no React:
  - `groupTourDays(items: MyTour[]): TourDay[]` — filter status
    `pending|confirmed` and `date >= today`, group by `date`, sort each day by
    `time`, drop days with <1 stop; a day needs ≥2 stops to get route UI.
  - `TourDay = { date: string; stops: TourStop[] }`,
    `TourStop = { tour: TourRequest; listing: Listing; coords: LatLng }`
    (skip tours whose `listing` is null — deleted listing).
  - `legGapMinutes(a: TourStop, b: TourStop, tourMin: number)` — minutes
    between `a.time + tourMin` and `b.time`. `TOUR_DURATION_MIN = 30` as an
    exported constant (assumption; make it easy to change).
  - Google Maps deep link builder:
    `https://www.google.com/maps/dir/{lat},{lng}/{lat},{lng}/...` (origin
    optional; if user location known, prepend it).
- `components/tour-day-route.tsx` — client island rendered per day section
  when `stops.length >= 2`: a "View route" toggle (`Button variant="secondary"`)
  that mounts the lazy map + legs below the day's cards.
- `components/tour-route-map-lazy.tsx` + `components/tour-route-map.tsx` +
  `components/tour-route-skeleton.tsx` — clone the detail-map trio. Map
  contents:
  - Numbered stop markers: divIcon like the existing pin but with the stop
    index (1-based) as text instead of the white dot
    (`<span ...>${i + 1}</span>`, `text-align:center`, `color: bg`,
    remember inline `border-radius: ... !important`).
  - User start dot (same geolocation-on-mount pattern; if denied, route
    starts at stop 1 — no dot, no leg 0).
  - One OSRM call with all waypoints in schedule order:
    `GET https://router.project-osrm.org/route/v1/driving/{lng},{lat};{lng},{lat};...`
    `?overview=full&geometries=geojson&steps=false`
    → `routes[0].geometry.coordinates` ([lng,lat][] — flip to [lat,lng]),
    `routes[0].legs[i].{distance,duration}` (one leg per consecutive pair),
    `routes[0].{distance,duration}` totals.
  - `fitBounds` over all points, `pad(0.2)`.
- `components/route-legs.tsx` — ordered list: for each leg
  `stop A → stop B · {km} · {min} phút`, plus a total row and the Google Maps
  link (`<a target="_blank" rel="noopener noreferrer">`).

Integration point: `renter-tours.tsx` currently renders a flat card list —
restructure to group by day (`groupTourDays` for upcoming; keep
past/declined rendering as-is) and render `TourDayRoute` per day. Keep the
existing card component untouched.

i18n namespace `tours.route.*` (mirror vi + en; vi is source of truth):
`viewRoute`, `hideRoute`, `yourLocation`, `stop` ("Điểm {n}"), `leg`
("{from} → {to}"), `total`, `openInGoogleMaps`, `locating`, `locationDenied`,
`routeError` (+ retry), `tightGap` (phase C), `suggestion` (phase D).
Durations/distances via `useFormatter` (`style: "unit"`, `unit: "kilometer"`
/ minutes as plain number + ICU) — copy `distanceLabel` from
location-map.tsx into the shared lib rather than duplicating a third time.

### Phase C — feasibility warnings (small delta on B)

After the OSRM response: for each consecutive pair, compare
`legGapMinutes(a, b, TOUR_DURATION_MIN)` with `legs[i].duration / 60`. If
drive > gap, mark the leg row with a warning
(`tours.route.tightGap`: "Chỉ có {gap} phút giữa hai lịch — lái xe mất
{drive} phút") and give the leg polyline the destructive color (resolve
`--destructive` the same way `--primary` is resolved). Draw per-leg
polylines (one `L.polyline` per leg from the leg's slice of the geometry —
OSRM annotations or per-pair route calls; simplest is N−1 separate
`/route` calls only when a warning color is needed, otherwise one call.
Check `routes[0].legs[].steps` is not needed; geometry slicing by waypoint
indices requires `annotations` — evaluate, but N−1 pair calls for N≤6 is
fine and simpler).

### Phase D — "better order" suggestion (flexible days)

Only when a day has ≥3 stops and at least one `pending` (i.e. time not
owner-confirmed): call OSRM trip service
`GET /trip/v1/driving/{user};{s1};{s2};{s3}?roundtrip=false&source=first`
→ `waypoints[i].waypoint_index` gives the optimized visiting order.
If its total duration beats the schedule-order total by >5 min, render a
passive hint: "Đi theo thứ tự ② → ① → ③ sẽ tiết kiệm ~{min} phút" with a
"preview" toggle that redraws the map in that order. No booking changes.

## 5. Edge cases (all phases)

- Geolocation denied/unavailable → route stops-only, hide "from you" leg,
  show a quiet retry (reuse the detail-map retry pattern).
- A tour's joined `listing` is null (deleted) → exclude from route, still
  show the card.
- Two tours at the same listing / identical coords → OSRM handles zero-length
  legs; dedupe pins by offsetting the number badge, or stack "①②" in one pin.
- Tours across multiple days → strictly per-day planning.
- `reschedule` status → excluded from the route (time is in flux) but the
  day section still shows the card.
- OSRM failure → error row + retry; fall back to dashed straight lines +
  `kmBetween` estimates so the map is still useful.
- 1 upcoming stop on a day → no route UI (nothing to plan).
- Locale: dates with `getFormatter().dateTime` / `useFormatter`, not manual.

## 6. Verification recipe (worked, reuse it)

The Chrome extension wasn't connected in the previous session; headless
puppeteer-core against installed Chrome works well and lets you mock
geolocation (which the extension can't):

```js
// scratchpad: npm i puppeteer-core, then:
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", defaultViewport: { width: 1380, height: 950 },
});
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions("http://localhost:3000", ["geolocation"]);
const page = await browser.newPage();
await page.setGeolocation({ latitude: 16.0605, longitude: 108.2242 }); // central Da Nang
await page.setExtraHTTPHeaders({ "accept-language": "vi" }); // headless defaults to en
```

- Dev server: `pnpm dev` (background), wait for "Ready in". Kill leftovers:
  the `pnpm dev` wrapper survives TaskStop — find the listener with
  `Get-NetTCPConnection -LocalPort 3000` and Stop-Process it.
- `/tour` requires a signed-in renter with tours. Seed via the book-tour flow
  in the browser, or insert `tours` rows directly (supabase MCP
  `execute_sql`) for a test renter; you need 2–3 tours on one date with
  different listings/districts to see a multi-stop route.
- Assert: numbered pins present, one polyline per leg, legs list text, tight-
  gap warning when you seed e.g. 14:00 and 14:15 tours in different
  districts, Google Maps href waypoint count.
- Throttle to see the lazy skeleton:
  `cdp.send('Network.emulateNetworkConditions', {...})`.
- Production CSS-scoping check: `pnpm run build:local`, `pnpm start`, then
  diff `<link ... .css>` hrefs between `/`, `/apartments`, `/tour`.

## 7. Open items to confirm with the user before/while implementing

1. Drop the "approximate location" circle + copy on the detail map once real
   coords exist? (They said ignore privacy, but the copy is design-sourced.)
2. `TOUR_DURATION_MIN = 30` assumption for gap math — confirm.
3. Phase A pin-picker: required or optional field on the listing form?
   (Plan assumes optional with district-centroid fallback.)
4. Motorbike vs car: a motorbike/car dual estimate was implemented and then
   reverted (git history `fa8ad2b`/`6d2ff5e` before squash — reverted by user
   choice). Route legs use car only unless the user asks again.
