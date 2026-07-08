# Plan: Tour Route Planner ("best route for my tour day")

> Handover doc for a future session. Written 2026-07-08 alongside PR #40 (the
> detail-page Leaflet map). Read this whole file before writing code; it
> records decisions already made with the user, the current state of the map
> stack, and a working verification recipe.
>
> **Status (2026-07-08): ALL PHASES (A–D) ARE DONE** — A merged in PR #41,
> B merged in PR #42, C merged in PR #43, D in PR #45
> (`feat/tour-order-suggestion`, based on main; #44 was the same change but
> GitHub auto-closed it, unreopenable, when the #43 merge deleted its stacked
> base branch). Section 3 reflects the post-Phase-A state; see each phase
> section for what it added. Remaining open item: `TOUR_DURATION_MIN = 30`
> is still an unconfirmed assumption.

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
  once real coordinates exist. *(Applied in Phase A: the detail map shows the
  exact pin with no circle/"approximate" copy when `lat`/`lng` are stored;
  the approximate presentation remains only for legacy rows without a pin.)*
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
- `app/leaflet-theme.css` — map chrome themed with design tokens + dark-mode
  tile invert (`.dark .leaflet-tile { filter: invert(1) hue-rotate(180deg)
  ... }`). Imported by each map component so it ships only with routes that
  render a map. The tour route map should import this same file (it stays
  global-CSS by nature; scoping comes from the import site).
- `lib/geo.ts` (shared) — **`coordsOf(listing)`: use this for every stop's
  coordinates.** Returns the owner-set `lat`/`lng` when stored, else a
  synthesized fallback (district centroid + deterministic ±650 m jitter from
  the listing id). Also exports `districtCenter(district)`, `kmBetween`, and
  the `LatLng` type.
- `app/[lang]/(app)/apartments/components/location-picker.tsx` — the owner's
  pin picker (click to set, drag to adjust, clear, district recenter). A
  working example of a Leaflet map with interactive editing; the "latest
  props in refs synced via an effect" pattern in it exists because the React
  Compiler lint forbids writing refs during render.
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
  stop are therefore one `coordsOf(listing)` call away. React-query, keyed
  on user id.
- Renter tour UI: `app/[lang]/(app)/tour/page.tsx` →
  `components/renter-tours.tsx` (client, uses `useMyTours`) →
  `components/renter-tour-card.tsx`.
- Domain schema: `schemas/tour/index.ts` (`TourRequest`).

### Listings data

- Supabase `listings` table (see `lib/database.types.ts`): has nullable
  `lat`/`lng` (`double precision`, migration `add_listing_coordinates`) — set
  by the owner via the form's pin picker; null on legacy/seed rows. Row →
  domain mapping in `lib/services/listings-map.ts` (`toListing` /
  `toListingWrite`), domain type in `schemas/listing/index.ts`
  (`ListingSchema`, optional `lat`/`lng`; form schema keeps them nullable
  numbers, wired through `ListingCore`). Districts are a Postgres enum
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

A is done. Recommended remaining order: B → C → D (C is a small delta on B;
D is independent of C). All of them work for legacy rows too via the
`coordsOf()` fallback.

### Phase A — real listing coordinates ✅ DONE (PR #41)

Everything landed as planned: migration `add_listing_coordinates`
(nullable `lat`/`lng`), regenerated types, shared `lib/geo.ts` with
`coordsOf()`, `LocationPicker` in the listing form (new "Location on the
map" section; strings under `listingForm.location.*` in vi+en), exact-pin
display on the detail map (`approx` prop on `LocationMap` gates the circle
+ badge + footnote). Old rows stay null and fall back — no backfill.

**Known gap:** the authenticated save → DB roundtrip (signed-in owner
submits the form with a pin) was NOT driven end-to-end — headless
verification can't sign in (credential entry is off-limits;
`/apartments/create` is middleware-gated to signin). The mapping is the
same `toListingWrite` used by all fields, but if a "pin doesn't persist"
bug is reported, look there first and ask the user to do one manual
create-with-pin check.

### Phase B — per-day route in schedule order ✅ DONE (`feat/tour-day-route`)

Landed as planned, with these deltas from the spec below:

- `groupTourDays` returns `{ date, items, stops }` per day — `items` is every
  upcoming non-declined tour that day (drives the card list, so reschedule /
  deleted-listing tours still show), `stops` the routeable subset
  (pending|confirmed with a live listing). `renter-tours.tsx` now renders day
  sections (localized date heading) plus a "Past & cancelled" history list
  (`tour.historySection`).
- `distanceLabel` became `formatDistance(format, km)` in `lib/geo.ts`
  (follows the `formatMoney(format, …)` pattern); location-map.tsx uses it.
- The map component owns geolocation + the single OSRM call and renders
  `RouteLegs` itself. OSRM failure falls back to dashed straight legs with
  `kmBetween` distances (no minutes) + retry — there is no separate error-only
  state. Same-coord stops share one pin with stacked numbers ("1·2").
- i18n lives at `tour.route.*` (the existing namespace is `tour`, not
  `tours`). `tightGap`/`suggestion` keys deferred to C/D.
- `legGapMinutes` + `TOUR_DURATION_MIN` are in `route-plan.ts` but unused
  until Phase C.
- The lint dodge for auto-fetch: the OSRM effect defers via
  `setTimeout(fetchRoute, 0)` — calling an async setState-ing function
  synchronously in an effect body trips `react-hooks/set-state-in-effect`.
- Verified headlessly (recipe in §6, harness route deleted): schedule order,
  reschedule exclusion, numbered pins + user dot, legs/total text vi+en,
  gmaps waypoint count, geolocation-denied path, OSRM-down fallback.

Original spec, kept for reference:

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

### Phase C — feasibility warnings ✅ DONE (`feat/tour-tight-gaps`)

Landed as specced, with the per-leg-geometry question resolved: **one OSRM
call with `steps=true&overview=false`** — each leg's polyline is the concat
of its steps' geojson geometries, so no N−1 pair calls and no annotations.
`RouteLeg` gained `tightGap?: { gap, drive }` (gap clamped to ≥0 for display
— overlapping bookings would otherwise read "-15 phút"); the warning row
renders in `route-legs.tsx` under the leg, and the tight leg's polyline uses
`--destructive` (resolved at mount next to `--primary`). Legs from the
renter's location (leg 0 when geolocation granted) have no gap to check. The
straight-line fallback stays a single dashed polyline with no warnings (no
drive times to compare). Verified headlessly: 09:00 → 09:31 cross-district
schedule produced exactly one red polyline (leg 1→2) + one warning row with
the right minutes, comfortable legs stayed primary.

Original spec, kept for reference:

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

### Phase D — "better order" suggestion ✅ DONE (`feat/tour-order-suggestion`)

Landed as specced, all inside `tour-route-map.tsx`. Notes:

- The trip call runs best-effort after the route call succeeds (nested
  try/catch so a trip failure can't trip the route's fallback path); when
  geolocation is denied the trip runs over stops only with `source=first`
  pinning stop 1 (no free-start optimization without an origin).
- `Suggestion` state holds the stop order, saved minutes, suggested legs
  (labeled, no tightGap — times would shift), totals, reordered points for
  the Google Maps link, and the trip geometry.
- Preview: the schedule layer group is removed (not destroyed) and a lazily
  built **dotted** polyline (`dashArray: "1 7"`) is added, so toggling back
  restores tight-gap coloring intact. Legs list + gmaps href swap to the
  suggested order while previewing.
- Circled digits (①–⑨, plain past 9) via `String.fromCodePoint(0x245f + n)`.
- Any refetch (location/route retry) clears suggestion + preview; so does
  the route fallback path.
- Verified headlessly: zigzag NHS→LienChieu→CamLe schedule with one pending
  → "① → ③ → ②, ~10 phút" hint; preview showed one dotted polyline,
  reordered legs/href; toggle-back restored all three solid polylines.

Original spec, kept for reference:

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
- **Auth-gated pages can't be driven headlessly** (entering credentials is
  off-limits; the middleware redirects to `/signin?next=…`). Two workarounds
  used in Phase A: (1) exercise data-dependent display by inserting a temp
  row via supabase MCP `execute_sql` (bypasses RLS; server cache keys by id,
  so a *new* id is fetched fresh while list pages stay cached) and deleting
  it after; (2) mount the component on a throwaway unauthenticated route
  (e.g. `app/[lang]/(app)/apartments/picker-test/page.tsx`), drive it, and
  delete the route before committing.
- `/tour` requires a signed-in renter with tours. Seed via `execute_sql`
  (insert `tours` rows for a test renter — 2–3 tours on one date with
  different listings/districts to see a multi-stop route); the tours query
  is client-side react-query (no server cache), but it filters by the
  signed-in `renter_id`, so a headless run still can't see them — plan for
  a component-level harness route as above, feeding it fixture MyTour data.
- Windows shell gotchas hit before: PowerShell treats `[lang]` in paths as a
  wildcard (`Remove-Item` needs `-LiteralPath`); bash inside `node -e "…"`
  eats `page.$('…')` as command substitution — put puppeteer scripts in
  files, not inline strings.
- Assert: numbered pins present, one polyline per leg, legs list text, tight-
  gap warning when you seed e.g. 14:00 and 14:15 tours in different
  districts, Google Maps href waypoint count.
- Throttle to see the lazy skeleton:
  `cdp.send('Network.emulateNetworkConditions', {...})`.
- Production CSS-scoping check: `pnpm run build:local`, `pnpm start`, then
  diff `<link ... .css>` hrefs between `/`, `/apartments`, `/tour`.

## 7. Open items to confirm with the user before/while implementing

1. ~~Drop the "approximate location" circle + copy once real coords exist?~~
   **Resolved in Phase A:** exact pins render without the circle/copy; the
   approximate presentation remains only for rows without a stored pin.
2. `TOUR_DURATION_MIN = 30` assumption for gap math — confirm.
3. ~~Pin-picker required or optional?~~ **Resolved in Phase A:** optional,
   with the district-centroid fallback. If the user later wants it required,
   add a zod refinement on the form schema, not a DB constraint (legacy rows
   are null).
4. Motorbike vs car: a motorbike/car dual estimate was implemented and then
   reverted (reverted by user choice; squashed away — see PR #40 discussion).
   Route legs use car only unless the user asks again.
5. After PR #41 merges: ask the user to do one manual signed-in
   create-with-pin check (see the Phase A known gap).
