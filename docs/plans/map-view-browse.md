# Plan: Map view on browse (improvement #1)

> Handover doc for a future session. Written 2026-07-09 on branch
> `feat/browse-map-view`. Implements `docs/improvements/01-map-view-browse.md`
> without regressing SEO or the prerenderable-shell architecture of
> `/apartments`. Read this whole file before writing code; §2 records
> decisions already made with the user and §7 is a working verification
> recipe.
>
> **Status (2026-07-09): NOT STARTED.** An earlier partial attempt
> (`parseView` edits in `lib/query.ts` + a `view-toggle.tsx` draft) was
> **deliberately discarded** at the user's request in favor of planning
> first — do not go looking for it, it's gone. The working tree is clean;
> this doc is the only artifact.
>
> **Integration check (2026-07-10):** every referenced file/function was
> re-verified against the codebase — all correct. Three fixes were folded
> in: `Filters` is zod-derived in `schemas/filters/index.ts` (§4), the
> money formatter is `lib/money.ts` not `lib/geo.ts` (§6), and prices are
> stored USD with locale-dependent VND conversion (§8.1).

## 1. Feature summary

`/apartments` gains a **List ⇄ Map** toggle next to the sort menu, driven by
a `?view=map` URL param. Map mode: desktop shows a split view (result cards
in a narrow left column, Leaflet map filling the rest); mobile shows a
full-screen map with a floating "Show list" pill. Every listing in the
current filtered set renders as a price-pin; tapping a pin opens a popup
card linking to the detail page. A "Search this area" button filters results
to the visible map bounds. Filters, sort, and pagination keep working
exactly as today.

## 2. Decisions already made (do not re-litigate)

- **SEO must not regress** — this is the user's explicit top constraint.
  §3 lists the four guarantees; every implementation choice below exists to
  preserve them.
- **Discard-and-plan:** the earlier partial code was thrown away on purpose;
  start fresh from this doc.
- **Bounds filtering goes through the URL** (`bounds=` param, server-side
  filter in `filterListings`), not client-side state — consistent with the
  repo's "URL search params are the single source of truth" rule.
- **"Search this area" is a button**, not automatic on pan/zoom (avoids
  request storms; called out in the improvement doc).
- **Keep pagination** in the map-mode list column for the first cut — it's
  already built. Pins always show the whole filtered set (no pagination on
  the map).
- **Deferred to follow-ups** (agreed, don't build now): card ⇄ pin hover
  sync, marker clustering, infinite scroll in the list column, pushing
  bounds into the Supabase query.

## 3. Why SEO is safe (the four guarantees)

The browse page's SEO rests on four things; each is preserved by design:

1. **Canonical URL.** `generateMetadata` in `apartments/page.tsx` never
   reads `searchParams`; every param permutation canonicalizes to clean
   `/apartments` via `pageAlternates` (`lib/seo.ts`). `?view=map` and
   `?bounds=` are just more params, covered automatically — no metadata
   changes needed, no duplicate-content risk.
2. **Crawlable listing links.** The server-rendered `<ListingCard>` grid is
   the crawl path to every `/apartments/[id]` page. In map mode the card
   list **stays in the server-rendered HTML**: desktop = visible left
   column; mobile = present in the DOM, hidden with CSS behind the "Show
   list" pill (a class toggle, never conditional rendering). The map is a
   client-only enhancement; crawlers that ignore it lose nothing.
3. **Prerenderable shell.** The static shell of `browse.tsx` never reads the
   URL; only Suspense islands do (see the comment block at the top of that
   file — it explains why back-navigation doesn't flash skeletons). The
   `view` param follows the same rule: read only inside the existing
   `Results` island and by the client `ViewToggle` (which, like `SortMenu`,
   uses `useSearchParams`). The shell stays static.
4. **No new initial JS.** Leaflet is code-split behind
   `dynamic({ ssr: false })` exactly like the two existing lazy maps and is
   only fetched when `view=map`. The default list view ships zero new bytes
   — the landing/browse LCP work (PR #49, see memory
   `mobile-perf-lcp-findings`) is untouched.

## 4. Current state (what already exists — reuse all of it)

### Browse architecture (`app/[lang]/(app)/apartments/`)

- `page.tsx` — passes the `searchParams` **promise un-awaited** into
  `<Browse>`; metadata is param-independent (guarantee 1). Route is public
  (not auth-gated), which also makes headless verification easy.
- `components/browse.tsx` — static shell + Suspense islands
  (`ResultsSummary`, `ShowCount`, `Results`). `getResults()` collapses to
  one cached read via `getActiveListings()`. **All view-dependent layout
  goes inside the `Results` island**; the shell must not read `view`.
- `components/listing.tsx` — server-rendered grid + pagination
  (`PAGE_SIZE = 6` in `lib/query.ts`). Reused as the map-mode list column.
- `lib/query.ts` — `parseFilters` / `parseSort` / `parsePage` /
  `filterListings` / `activeFilterCount`. Gets `parseView` and the `bounds`
  filter; existing functions otherwise untouched. NOTE: the `Filters` type
  is **zod-derived in `schemas/filters/index.ts`** (`filtersSchema` +
  `DEFAULT_FILTERS`) — adding `bounds` means extending the schema there,
  not hand-writing a type (PR #51 reverted exactly that mistake). A
  `bounds` field with `""` default should make `activeFilterCount` pick it
  up with little extra work.
- `components/use-filter-nav.ts` — the only way client islands write state:
  `setParams(patch, { resetPage? })` → `router.push`. Note it **deletes
  `page` by default**; view toggling must pass `{ resetPage: false }`.
- `components/sort-menu.tsx` — the styling/structure template for
  `ViewToggle`.

### Map stack (clone, don't reinvent)

Full detail lives in `docs/plans/tour-route-planner.md` §3 — the trio
pattern (`*-lazy.tsx` with `dynamic({ ssr: false })` + skeleton, the map
component with `await import("leaflet")` inside `useEffect`, a skeleton
component), `app/leaflet-theme.css` (import from the map component so the
CSS ships only with map routes), and theme colors resolved via
`getComputedStyle` because Leaflet writes SVG presentation attributes.
Critical gotchas repeated here:

- **globals.css forces `border-radius: 0 !important`** (flat "Hearth"
  system). Round price-pins need inline `border-radius: … !important` in
  the divIcon HTML string — see the existing pin markers in
  `apartments/[id]/components/location-map.tsx`.
- `react-hooks/set-state-in-effect` lint forbids sync setState in effect
  bodies — async callbacks / `setTimeout(fn, 0)` dodge, used by both
  existing maps.
- `invalidateSize()` on a ~250 ms timer after mount (container sizing).
- `lib/geo.ts` → **`coordsOf(listing)`** for every coordinate: returns
  stored `lat`/`lng` (owner-set via the form's pin picker) or the
  district-centroid + deterministic-jitter fallback for legacy rows. Call
  it **server-side** and pass resolved coords as props so the fallback
  logic never ships to the client.

### Repo conventions

Read the project skills before coding: `design-handoff` (route-local file
structure, component reuse, one component per file), `server-first-rendering`
(client leaves only), `i18n-translation` (next-intl v4, vi is source of
truth, mirror `messages/{vi,en}.json`). **pnpm, not npm.** Build:
`pnpm run build:local`. Lint: `pnpm lint` (has pre-existing errors — add
none). Never commit to main (memory `git-branch-workflow`); this feature's
branch `feat/browse-map-view` already exists.

## 5. Implementation steps

### Step 1 — `view` param plumbing

- `lib/query.ts`: `parseView(sp): "list" | "map"` — default `"list"`,
  anything unrecognized → `"list"`.
- `components/view-toggle.tsx` (client): List ⇄ Map segmented toggle styled
  like `sort-menu.tsx`; writes `setParams({ view: "map" }, { resetPage:
  false })` and `{ view: null }` back to list (keeps default URLs clean).
- Place next to both `SortMenu` instances in `browse.tsx` (desktop header
  row + mobile toolbar).
- i18n: `apartments.viewList` / `apartments.viewMap` (vi + en).

### Step 2 — map components (client, lazy)

- `components/browse-map-lazy.tsx` — the `dynamic({ ssr: false })` wrapper
  + a `<Skeleton>` block sized to the map container.
- `components/browse-map.tsx` — Leaflet map over a serialized prop
  `MapListing[]`: `{ id, title, price, beds, area, cover, lat, lng }`,
  coords resolved server-side with `coordsOf()`.
  - Price pins as `L.divIcon` (compact price, e.g. "5,5tr" — resolve exact
    format in §8.1).
  - Pin tap → popup card: cover, title, price, beds/area, locale-aware
    `Link` to the detail page.
  - "Search this area" button (top-center overlay) → step 4.
  - `fitBounds` over all pins on mount, `pad(0.2)`; when `bounds=` is set,
    fit to those bounds instead.

### Step 3 — layout in `browse.tsx`

All inside the existing `Results` island (it already awaits searchParams):

- `view === "list"`: render `<Listing>` exactly as today — zero change.
- `view === "map"`:
  - **Desktop:** split view — narrow left column with the same
    server-rendered `<Listing>` (pagination kept), map filling the
    remaining width at viewport height (`h-[calc(100vh-…)]`, sticky).
  - **Mobile:** map full-screen; the server-rendered list stays in the DOM,
    CSS-hidden behind a floating "Show list" pill (tiny client component
    toggling a class on a shared wrapper — cards stay server-rendered;
    guarantee 2).
- Filters sidebar/drawer, sort menu, results summary: untouched. The map
  gets the already-filtered results from `getResults()`, so every existing
  filter works on pins for free.

### Step 4 — bounds filtering ("Search this area")

- Button writes `bounds=swLat,swLng,neLat,neLng` (≈4 decimals) via
  `useFilterNav` (default page reset is correct here).
- `parseFilters` gains optional `bounds`; `filterListings` applies it via
  `coordsOf()` — one server code path filters both list column and pins.
- "Clear area" chip removes the param; `bounds` counts in
  `activeFilterCount` (so the mobile filter badge reflects it).
- SEO: just another param → guarantee 1 already covers it.

## 6. Edge cases

- Zero results in map mode → keep `EmptyResults` in the list column; map
  centers on the city default (`districtCenter` exists in `lib/geo.ts`).
- All-legacy listings (no stored `lat`/`lng`) → `coordsOf()` fallback means
  every listing always has coords; no pin can be missing.
- Identical/near-identical coords (same building) → acceptable overlap for
  the first cut; clustering is the deferred fix.
- `?view=map&page=3` → valid: pins show everything, list column shows
  page 3.
- Malformed `bounds` → `parseFilters` drops it (treat as absent), never
  throw.
- Locale: all strings via next-intl; price formatting via the repo's
  existing money formatter — `formatMoney` in **`lib/money.ts`** (takes a
  next-intl formatter + locale + USD amount). The compact pin label should
  follow the same shape.

## 7. Verification checklist + recipe

SEO assertions (the point of this whole design):

- `view-source:` (or `curl`) on `/apartments?view=map` contains every
  listing card `<a href="…/apartments/[id]">` — crawlable without JS.
- Rendered `<head>` on `?view=map` and `?view=map&bounds=…` shows canonical
  `/apartments`.
- `pnpm run build:local`: `/apartments` shell still prerenders; the Leaflet
  chunk is absent from the default-view network waterfall and loads only
  after toggling to map (throttle via CDP to watch the skeleton).
- Back/forward restores view + filters + bounds (pure URL state).

Recipe: `/apartments` is public, so plain headless puppeteer works — reuse
the recipe in `docs/plans/tour-route-planner.md` §6 (executablePath to
installed Chrome, `accept-language: vi` header, scripts in files not inline
strings, PowerShell needs `-LiteralPath` for `[lang]` paths, `pnpm dev`
leftovers killed via `Get-NetTCPConnection -LocalPort 3000`). No auth or
geolocation mocking needed for this feature. The repo `verify` skill has the
same recipe plus Leaflet-specific waits.

## 8. Open items to confirm with the user before/while implementing

1. **Price-pin label format.** The improvement doc says "$1.4k". Prices are
   **stored in USD** and `formatMoney` (`lib/money.ts`) converts to VND at
   the fixed `USD_TO_VND` rate only for the `vi` locale — so the pin label
   must be locale-aware: compact VND for vi (e.g. "5,5tr"), compact USD for
   en (e.g. "$240"). Propose that and confirm.
2. **Map on mobile: full-screen height** vs. leaving the header visible —
   pick header-visible (map fills below header) unless the user wants true
   full-screen.
3. Whether the desktop list column keeps the 3-across card grid collapsed
   to 1-across, or a slimmer horizontal card variant — start with the
   existing card at 1-across (zero new components) and ask only if it looks
   cramped.
