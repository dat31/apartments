# Plan: Virtual home tour (360° panoramas + Three.js)

> Handover doc. Written 2026-07-30 on branch
> `claude/virtual-home-tour-flow-hni1bf` after a full read of the current app.
> Part 1 (§1) is the flow audit that the plan is built on — read it before
> §3 onward, because every design decision below is a consequence of an
> existing invariant.
>
> **Status: phases 0–2 shipped on real tables (2026-07-31).** A renter can
> walk a home in 360° and the content comes out of Postgres. See §16 for the
> full built / not-built ledger — read that before picking anything up.
>
> Scope of the ask: *"an interactive virtual home tour platform that combines
> photorealistic 360° panoramas with Three.js-powered interactions. Users can
> navigate naturally between rooms, explore points of interest, and view
> property information on desktop, tablet, mobile, or VR devices."*

---

## 1. Current app flow (audit)

### 1.1 What the product is

**Danapa** — apartment renting in Da Nang. Two roles: **renter** and **owner
(host)**. Vietnamese is the default locale, English secondary.

### 1.2 Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript, `cacheComponents: true` |
| Styling | Tailwind v4, CSS-first theme in `app/globals.css` (`@theme inline`), shadcn/ui in `components/ui/` |
| Design system | "Hearth" — **flat**: `* { border-radius: 0 !important; box-shadow: none !important; }` (globals.css:169-173) |
| i18n | next-intl v4, routes under `app/[lang]`, `vi` default + `en`, `localePrefix: "as-needed"` |
| Data | Supabase (Postgres + RLS + Auth + Storage); server reads via `createPublicClient` inside `"use cache"` boundaries; client writes via `@supabase/ssr` browser client + TanStack Query |
| Maps | Leaflet, lazily loaded, OSRM for routing |
| Messaging | Stream Chat |
| Analytics | PostHog (proxied through `/ingest/*` rewrites) |
| Tests | Vitest (`*.test.ts`, pure logic only) + Playwright (`e2e/*.spec.ts`) |
| Package manager | **pnpm** (`pnpm dev`, `pnpm run build:local`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`) |

### 1.3 Route map

```
/                                    landing — role chooser, district tiles, newest + trending carousels
/apartments                          browse — URL-driven filters/sort/pagination, saved searches,
                                     recently-viewed strip, saved-search alerts
/apartments/[id]                     detail  ← THE INTEGRATION POINT
/apartments/create                   owner listing form (create)
/apartments/[id]/edit                owner listing form (edit)
/apartments/saved                    shortlist
/apartments/saved/compare            side-by-side compare (?ids=…)
/owner/[id]                          public host profile + reviews
/owner/dashboard/{overview,active,drafts,tours,availability}   owner console
/tour                                renter's **in-person viewing appointments** + day route planner
/messages                            Stream Chat inbox
(auth) /signin /signup /forgot-password /reset-password
```

### 1.4 Renter flow today

Landing → Browse (`/apartments`) → Detail (`/apartments/[id]`) → **Book a
tour** (calendar + owner availability slots, sign-in gated) → Saved shortlist
→ `/tour` (day grouping, route planner, reschedule accept/decline) →
Messages.

The virtual tour slots in **between browse and book-a-tour**: it is the step
that lets a renter decide whether an in-person visit is worth booking.

### 1.5 Detail page anatomy (`app/[lang]/(app)/apartments/[id]/`)

```
page.tsx                     thin. awaits params, setRequestLocale, generateStaticParams over
                             every active listing, generateMetadata (title/desc/OG/canonical).
                             Renders <BackToResults> + <Suspense fallback={DetailSkeleton}>
  └ detail-content.tsx       async server: getListingById → notFound(); auth.getUser() → isOwner;
                             emits JSON-LD; renders <DetailView>
     └ detail-view.tsx       sync server component, the whole layout:
        ├ gallery.tsx            server mosaic (desktop 3-col / mobile hero), tiles carry
        │  └ gallery-lightbox    `data-shot={i}`; thin client island delegates clicks
        │     └ lightbox.tsx     dynamic({ssr:false}) embla carousel + thumb rail
        ├ title / badges / facts row / ShareButton
        ├ costs-section.tsx      costs & terms + move-in estimate
        ├ about / amenities
        ├ location-map-lazy.tsx  dynamic({ssr:false}) Leaflet + skeleton
        ├ owner-card (Suspense) / reviews (Suspense) / similar-homes (Suspense)
        ├ aside: sticky booking card — price, BookTourButton, SaveHomeButton, MessageOwnerButton
        └ mobile sticky bottom bar
```

### 1.6 Data path (how a field gets from Postgres to the UI)

```
supabase/migrations/*.sql                 column added here
        ↓ (regenerate)
lib/database.types.ts                     Tables<"listings">
        ↓
lib/services/listings-map.ts              toListing(row) → domain  |  toListingWrite(core) → row
        ↓                                 (pure, browser-safe — client reads use it too)
schemas/listing/index.ts                  zod ListingSchema → `type Listing = z.infer<…>`
        ↓
lib/services/listings.ts                  "use cache" + cacheLife + cacheTag("listings") readers
        ↓                                 getActiveListings / getListingById / getSimilarListings / …
Server Components                         props down; invalidation via
                                          lib/actions/listings.ts → updateTag("listings")
```

Client writes go through `hooks/use-listings.tsx` (TanStack Query mutations
straight to Supabase under RLS) and then call the `revalidateListings()`
server action.

### 1.7 Invariants the feature must not break

1. **Server-first.** `"use client"` only on leaf islands. Orchestrators,
   lists, and list items stay Server Components
   (`.claude/skills/server-first-rendering/SKILL.md`).
2. **Heavy client deps are code-split.** The established "lazy trio":
   `x-lazy.tsx` (`dynamic(() => import("./x"), { ssr: false, loading: … })`)
   + `x.tsx` + `x-skeleton.tsx`. Leaflet and embla both follow it; three.js
   must too, or the detail page's LCP work regresses.
3. **URL is the source of truth** for view state.
4. **The detail route prerenders.** `generateStaticParams` + `use cache`
   readers; reading the clock is only legal inside a cache boundary.
5. **SEO**: canonical via `pageAlternates`, JSON-LD, OG image per listing.
6. **i18n**: every string in *both* `messages/vi.json` and `messages/en.json`,
   same shape; translate on the server where possible.
7. **Flat design system.** Anything round needs an explicit `!important`
   escape *and a named class in globals.css* — see `.route-teardrop` /
   `.route-dot` / `.route-pulse` (globals.css:175-186). Don't invent inline
   one-offs.
8. **Reuse `components/ui/` primitives**; never fork shadcn structure
   (`.claude/skills/design-handoff/SKILL.md`).
9. **Tests.** Pure logic → Vitest in `__tests__/` *beside* the module.
   Anything I/O-bound or React → Playwright. **Coverage thresholds are
   95/95/92/95 over `lib/**`, `schemas/**`, `app/**/lib/**`** (vitest.config.ts)
   — a new pure module without tests fails CI.
10. **Storage**: public bucket `listing-photos`, writes restricted by RLS to
    a folder named after the writer's `auth.uid()`, 5 MB/file, image MIME
    allowlist.

---

## 2. Naming: this feature collides with an existing concept

**"Tour" already means an in-person viewing appointment.** `/tour`,
the `tours` + `tour` i18n namespaces, `TourRequest`, `book-tour-dialog`,
`owner-tours`, `use-my-tours`, the whole `/tour` route planner. In
Vietnamese it is *"Lịch xem nhà"* (viewing appointment) — no collision there,
but in English "Book a tour" vs "Virtual tour" on the same page is confusing.

**Decision (do not re-litigate):**

| Layer | Name |
| --- | --- |
| Code / files / route | `virtual-tour` (e.g. `/apartments/[id]/virtual-tour`) |
| DB tables | `listing_virtual_tours`, `virtual_tour_scenes` |
| i18n namespace | `virtualTour` (top-level, sibling of `tour`/`tours` — never nested inside them) |
| EN copy | "360° tour" (button), "Virtual tour" (headings) |
| VI copy | "Tham quan 360°" |

Existing `tour`/`tours` namespaces and routes are **untouched**.

---

## 3. Feature summary

A listing can have a **virtual tour**: an ordered set of **scenes** (rooms),
each backed by one equirectangular 360° photo. The renter opens the tour from
the detail page, looks around by dragging, walks between rooms by clicking
door hotspots, taps info hotspots to read points of interest (e.g. "north-
facing balcony, 6 m²"), and sees price/facts/CTAs in a side panel without
leaving the tour. On a VR headset the same tour runs as an immersive WebXR
session.

Owners author tours from the dashboard: upload panoramas, order rooms, drop
hotspots by clicking inside a live preview, publish.

---

## 4. Data model

> **Shipped and applied 2026-07-31**, with three deliberate deviations from
> what follows. Read §16.1 for what the database actually contains.

### 4.1 Tables (new migration)

`supabase/migrations/<ts>_virtual_tours.sql`:

```sql
create table public.listing_virtual_tours (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null unique references public.listings(id) on delete cascade,
  status        virtual_tour_status not null default 'draft',   -- new enum: draft | published
  entry_scene   uuid,                                            -- FK added after scenes table
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.virtual_tour_scenes (
  id            uuid primary key default gen_random_uuid(),
  tour_id       uuid not null references public.listing_virtual_tours(id) on delete cascade,
  name          text not null,                 -- "Living room" (owner-authored, not translated)
  room          room_kind,                     -- new enum, optional: living|bed|bath|kitchen|balcony|other
  panorama_url  text not null,                 -- public URL in the listing-panoramas bucket
  preview_url   text,                          -- small (512×256) jpeg for rail thumbnails + first paint
  yaw           double precision not null default 0,   -- initial camera direction, radians
  pitch         double precision not null default 0,
  hfov          double precision,              -- optional initial field of view, degrees
  sort_order    int not null default 0,
  plan_x        double precision,              -- optional position on the floor plan, 0..1
  plan_y        double precision,
  hotspots      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);
```

**Why `hotspots` is JSONB and not a third table.** Hotspots are a small,
bounded list authored together with their scene and always read with it;
a table would add a join, a second RLS policy set, and ordering concerns for
no query we actually need (nobody queries "all hotspots of kind X"). The
scene-link integrity a FK would give us is instead enforced by
`validateTourGraph()` (§6.1) at write time and tolerated at read time (a
dangling link renders as disabled). The row shape is validated by zod at both
boundaries, exactly like `ListingCosts` is.

Hotspot JSON shape (zod `HotspotSchema`):

```ts
{ id: string;                    // client-generated uuid, stable across edits
  kind: "link" | "info";
  yaw: number; pitch: number;    // radians, direction from scene origin
  label: string;                 // short, shown on the marker
  target?: string;               // kind === "link": scene id
  body?: string;                 // kind === "info": 1–2 sentences
  photo?: string }               // kind === "info": optional close-up (listing-photos bucket)
```

### 4.2 Denormalized flag on `listings`

```sql
alter table public.listings
  add column has_virtual_tour boolean not null default false;
```

Maintained by a trigger on `listing_virtual_tours` (insert/update of
`status`/delete). **Why:** the detail page, the browse cards' "360°" badge and
a future `has360=1` filter chip all need "does this listing have a published
tour?" — with the flag it costs zero extra reads because every one of those
surfaces already has the `Listing` domain object in hand. Without it, browse
needs a second query per render.

`toListing()` maps it to `Listing.hasVirtualTour`; **`toListingWrite()` must
not write it** (server/trigger-owned, like `views` and `palette`).

### 4.3 RLS

- `virtual_tour_scenes` / `listing_virtual_tours` **select**: public when the
  parent listing is `active` **and** the tour is `published`; the owner always
  sees their own (mirrors how `listings` exposes drafts to their owner).
- **insert/update/delete**: only `auth.uid() = listings.owner_id` for the
  parent listing.
- Model the policies on `20260717100000_saved_searches.sql` and
  `20260718120000_tour_owner_id_integrity.sql`.

### 4.4 Migration hygiene

Add a row to the table in `supabase/README.md` describing what the migration
does and that it is required for the feature (that file is the project's
migration ledger). Regenerate `lib/database.types.ts` afterwards.

---

## 5. Panorama storage

New bucket, **not** a relaxation of the existing one:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-panoramas', 'listing-panoramas', true,
        20971520,                                   -- 20 MB
        array['image/jpeg','image/webp','image/avif'])
on conflict (id) do nothing;
```

Same owner-folder write policies as `listing-photos`
(`(storage.foldername(name))[1] = auth.uid()::text`). `lib/supabase/storage.ts`
gains `uploadPanorama(file, userId)` next to `uploadListingPhoto`.

**Hard constraints on the asset itself** (enforced client-side in the
uploader, documented for owners):

- Equirectangular projection, 2:1 aspect ratio.
- **Max 4096×2048.** Larger is tempting but an 8192×4096 texture decodes to
  ~128 MB of GPU memory; iOS Safari kills the tab. Downscale in the uploader
  with `createImageBitmap` + an `OffscreenCanvas`, then upload the result.
- Generate and upload a 512×256 `preview_url` in the same pass — used for the
  room rail, the floor plan, and as the low-res first texture (§6.4).

**Sourcing real panoramas is not a code task.** Photorealistic 360s come off
an Insta360/Ricoh Theta or a Matterport export. For demo/seed data use CC0
interior panoramas (Poly Haven) uploaded to the bucket and referenced from a
seed migration, in the style of
`20260729150000_seed_remaining_listing_costs.sql`. See §13, open item 1.

---

## 6. Rendering architecture

### 6.1 Module layout

```
lib/virtual-tour/                            shared pure logic (unit-tested, no React)
  math.ts             yawPitchToVector3, vector3ToYawPitch, clampPitch,
                      projectToScreen(vec3, camera, size) → {x,y,visible}, fovForZoom
  scene-graph.ts      adjacency(scenes), preloadOrder(scenes, currentId),
                      validateTourGraph(scenes) → issues[]  (dangling links, orphans, no entry)
  __tests__/{math,scene-graph}.test.ts

schemas/virtual-tour/index.ts                zod: HotspotSchema, SceneSchema, VirtualTourSchema,
                                             + createSceneFormSchema(t) for the owner editor
  __tests__/index.test.ts

lib/services/virtual-tours.ts                "use cache" reads (server-only)
lib/services/virtual-tours-map.ts            toVirtualTour(rows) / toSceneWrite(core)  (pure)

app/[lang]/(app)/apartments/[id]/virtual-tour/
  page.tsx                    thin shell: params, setRequestLocale, metadata, Suspense
  components/
    tour-content.tsx          async server: getVirtualTour(id) + getListingById(id) → notFound()
    tour-stage.tsx            client orchestrator: owns current scene + panel state
    panorama-viewer-lazy.tsx  dynamic({ ssr:false, loading: <TourSkeleton/> })
    panorama-viewer.tsx       three.js: renderer, sphere, camera, pointer controls, RAF loop
    hotspot-layer.tsx         DOM overlay, positions projected each frame
    hotspot-marker.tsx        one marker (a real <button>)
    poi-panel.tsx             info hotspot body — Drawer on mobile, Sheet on desktop
    room-rail.tsx             scene thumbnails (server-rendered where possible)
    property-panel.tsx        price/facts/CTAs — reuses BookTourButton/SaveHomeButton/MessageOwnerButton
    floor-plan.tsx            optional minimap (phase 2)
    tour-skeleton.tsx
    vr-button.tsx             phase 4
  hooks/use-scene-param.ts    reads/writes ?scene= via the router
```

Math and graph logic live in **`lib/virtual-tour/`** rather than the route
folder because the owner editor (a different route) needs them too.

### 6.2 The viewer

Standard equirectangular sphere setup, kept deliberately small:

- `WebGLRenderer({ antialias: false, powerPreference: "high-performance" })`,
  `setPixelRatio(Math.min(devicePixelRatio, 2))`.
- `SphereGeometry(500, 60, 40)` with `scale.x = -1` (inside-out),
  `MeshBasicMaterial({ map: texture })`, `PerspectiveCamera(75, …, 0.1, 1000)`
  at the origin.
- **Custom pointer controls, not `OrbitControls`.** ~70 lines of
  `pointerdown/move/up` + wheel, with pitch clamped to ±85° and inertial
  damping. OrbitControls is built for orbiting *around* an object and brings
  behaviour (panning, target, zoom-to-cursor) we'd have to disable one flag at
  a time; direct control also makes the reduced-motion and keyboard cases
  trivial.
- One `requestAnimationFrame` loop, **paused** when the tab is hidden
  (`visibilitychange`) or the canvas leaves the viewport (`IntersectionObserver`).
- Full teardown on unmount: `texture.dispose()`, `geometry.dispose()`,
  `material.dispose()`, `renderer.dispose()`, `renderer.forceContextLoss()`.
  Leaking a WebGL context per navigation exhausts the browser's context budget
  after ~16 tours.
- Dependency: `three` + `@types/three`, imported *inside* the lazy chunk only.

### 6.3 Hotspots are DOM, not sprites

Hotspot markers render as absolutely-positioned **real `<button>` elements** in
an overlay div; each frame the loop projects the hotspot's 3D direction to
screen space (`lib/virtual-tour/math.ts → projectToScreen`) and writes a
`transform: translate3d(...)`.

Why not `THREE.Sprite` + raycasting:

- Real buttons are keyboard-focusable and screen-reader-readable for free —
  `Tab` cycles rooms, `Enter` walks through a door. A sprite is invisible to
  assistive tech.
- Labels are next-intl strings styled with Tailwind tokens, so they match the
  rest of the app instead of being baked into a canvas texture.
- No raycaster, no per-frame hit-testing, no font atlas.

Cost: the overlay can't exist inside an immersive XR session, so phase 4 adds
a **second, sprite-based hotspot renderer** for XR only, fed by the same
hotspot data. That duplication is real and accepted — it is the price of an
accessible 2D viewer, which is the case 99% of users are in.

Markers are round, which the flat design system forbids: add
`.hotspot-dot { border-radius: 50% !important; }` to `globals.css` **next to
`.route-dot`**, as a named, commented exception in the same block.

### 6.4 Loading + transitions

- **Progressive texture**: paint `preview_url` (512×256) immediately, then
  swap in the full 4096×2048 when it decodes. First frame lands in ~100 ms
  instead of ~2 s on 4G.
- **Scene change**: crossfade two materials over ~450 ms plus a small camera
  dolly toward the hotspot direction, so walking through a door reads as
  movement. `prefers-reduced-motion` → hard cut, no dolly (globals.css
  already zeroes animations; the JS must check `matchMedia` itself).
- **Preloading**: after a scene settles, `requestIdleCallback` preloads the
  textures of directly-linked scenes (`preloadOrder()`), so room-to-room is
  instant.
- **LRU cap of 3 decoded full-res textures**; dispose the rest. Six 4K rooms
  otherwise sit at ~380 MB of GPU memory.

### 6.5 Fallbacks

| Condition | Behaviour |
| --- | --- |
| No WebGL / context creation fails | Static `<Image>` of the preview + a note; the CTA on the detail page still points at the gallery |
| Panorama fails to load | Keep the previous scene, toast via `sonner`, mark the room disabled in the rail |
| JS disabled / crawler | The route's server-rendered shell contains the listing title, the room list as text, and a link back to the listing — the viewer is a progressive enhancement |
| Dangling hotspot target | Marker renders disabled rather than throwing (`validateTourGraph` also surfaces it to the owner in the editor) |

---

## 7. Device matrix

| Device | Look | Zoom | Navigate | Notes |
| --- | --- | --- | --- | --- |
| Desktop | pointer drag | wheel → FOV 40–100° | click hotspot; `Tab`+`Enter`; `←/→` cycle rooms | cursor `grab`/`grabbing` |
| Tablet | touch drag | pinch | tap hotspot; room rail | rail becomes a bottom strip |
| Mobile | touch drag | pinch | tap hotspot; rail | optional gyro toggle — iOS requires `DeviceOrientationEvent.requestPermission()` **from a user gesture**, so it must be a button, never automatic; page scroll is never hijacked (the canvas only claims the gesture after the first `pointerdown` inside it, same rule as the Leaflet maps' wheel-zoom) |
| VR | headset pose | n/a | controller ray / gaze-dwell on sprite hotspots | phase 4; `VRButton` mounted only after `navigator.xr?.isSessionSupported("immersive-vr")` resolves true |

Breakpoints follow the app's existing `sm`/`md`/`lg` usage; the property panel
is a `Sheet` (desktop, right) and a `Drawer` (mobile, bottom) — both already
in `components/ui/`.

---

## 8. Surfaces and routes

### 8.1 The tour route

`/apartments/[id]/virtual-tour` — a **dedicated route**, not just an overlay:

- Shareable/deep-linkable (a renter sends "look at the balcony" as a URL).
- WebXR sessions want a stable page, not a modal over a scrolled document.
- Keeps three.js out of the detail route's chunk graph entirely.
- `generateStaticParams` over listings with a published tour; the shell
  prerenders and the scene data streams behind `<Suspense>`, exactly like
  `detail-content.tsx`.
- `generateMetadata`: title "360° tour — {title}", canonical via
  `pageAlternates(lang, "/apartments/{id}/virtual-tour")`, OG image = the
  entry scene's preview.
- No tour, or tour not published → `notFound()`.

**Scene state in the URL**: `?scene=<sceneId>`. Written with
`router.replace` (not `push`) on room change, so browser Back leaves the
tour instead of walking back through six rooms; an explicit "Back to listing"
control is the way out. Camera yaw/pitch is *not* in the URL — it changes
every frame.

### 8.2 Entry points

1. **Detail gallery** — a "360° tour" pill overlaid on the cover tile, as a
   `<Button asChild><Link>`. Safe inside `<GalleryLightbox>`: its click
   delegation only fires for elements matching `[data-shot]`, and the pill
   won't carry that attribute.
2. **Sticky booking card / mobile bar** — a secondary button above
   "Book a tour", so the virtual tour reads as the step before the real one.
3. **Browse + saved cards** — a small "360°" badge on `components/listing-card.tsx`
   driven by `listing.hasVirtualTour` (free, thanks to §4.2).
4. **Phase 2**: a `has360=1` filter chip through the existing
   `schemas/filters` + `lib/query.ts` path.

### 8.3 In-tour property info

`property-panel.tsx` shows price, beds/baths/area, availability, the move-in
estimate, and the CTAs — by **reusing the existing components**
(`MoveInEstimate`, `BookTourButton`, `SaveHomeButton`, `MessageOwnerButton`,
`AvailabilityLabel`). Nothing about the money/booking logic is re-implemented.
Room-level info is the scene name plus its info hotspots.

---

## 9. Owner authoring (phase 3)

Route: `/owner/dashboard/listings/[id]/virtual-tour` (fits the existing
dashboard shell + `dashboard-nav.tsx`).

- **Scenes**: upload panoramas (drag-to-reorder, mirroring
  `photo-uploader.tsx` + `photo-card.tsx`), name each room, pick a room kind,
  set the initial view by looking around and pressing "Set as entry view".
- **Hotspots**: the same viewer in `mode="edit"` — click the panorama,
  `vector3ToYawPitch` on the intersection gives the direction, then a popover
  asks link-vs-info and the target/body. Drag an existing marker to move it.
- **Publish**: blocked until `validateTourGraph()` is clean (≥1 scene, entry
  set, no dangling links); publishing flips `status` and the trigger sets
  `listings.has_virtual_tour`, then `revalidateListings()` + a new
  `revalidateVirtualTour(listingId)` action expire the cached reads.
- Writes go through a route-local `hooks/use-virtual-tour.ts` in the same
  TanStack-Query shape as `hooks/use-listings.tsx`.

---

## 10. i18n

New top-level namespace `virtualTour` in both message files, e.g.
`entryCta`, `heading`, `backToListing`, `rooms`, `roomOf`, `loadingScene`,
`sceneFailed`, `enterVr`, `exitVr`, `gyroOn`, `gyroOff`, `dragHint`,
`noWebgl`, `poiClose`, `propertyPanelTitle`, plus an `editor.*` sub-object in
phase 3. Owner-authored strings (room names, POI bodies) are **content, not
UI** — stored as written, never translated.

`vi` is the source of truth; both files must stay the same shape.

---

## 11. Analytics

PostHog events (client, via `posthog-js` as in `listing-form.tsx`):
`virtual_tour_opened` (listing id, entry point), `virtual_tour_scene_viewed`
(scene id, dwell ms), `virtual_tour_hotspot_clicked` (kind), `virtual_tour_vr_entered`,
`virtual_tour_exited` (total dwell, rooms seen), `virtual_tour_cta_clicked`
(which CTA). The funnel worth watching: tour opened → rooms ≥ 2 → book-a-tour
clicked, versus the same conversion for listings without a tour.

---

## 12. Testing + verification

**Vitest** (remember the 95% coverage gate on `lib/**`, `schemas/**`,
`app/**/lib/**`):

- `lib/virtual-tour/__tests__/math.test.ts` — yaw/pitch ↔ vector round-trips,
  pitch clamping at the poles, wrap-around at ±π, `projectToScreen` behind-camera
  case returns `visible: false`, FOV clamping.
- `lib/virtual-tour/__tests__/scene-graph.test.ts` — adjacency, preload order
  (linked-first, then by `sort_order`), `validateTourGraph` catching dangling
  targets / no entry / orphan rooms.
- `schemas/virtual-tour/__tests__/index.test.ts` — hotspot discriminated-union
  parsing, rejecting a `link` without `target`, JSONB round-trip.
- Add `makeVirtualTour` / `makeScene` to `tests/factories.ts` (the repo rule:
  no hand-rolled fixtures).

**Playwright** (`e2e/virtual-tour.spec.ts`):

- Detail page of a listing with a published tour shows the 360° entry; a
  listing without one does not.
- The route loads, the canvas mounts, the room rail lists every scene.
- Clicking a link hotspot changes `?scene=` and updates the room rail's
  active item.
- "Back to listing" returns to `/apartments/[id]`.
- Assert on **DOM** (hotspot buttons, rail items, `?scene=`), never on pixels.
  Headless Chromium renders WebGL through SwiftShader; if the context fails on
  the CI runner, launch with `--use-gl=swiftshader --enable-unsafe-swiftshader`
  in `playwright.config.ts`, and keep a `@webgl`-tagged skip so the suite
  degrades rather than flakes.

**Manual/build verification per phase:**

- `pnpm run build:local` — `/apartments/[id]` must still report Partial
  Prerender and its chunk graph must **not** contain `three`; the new route's
  shell prerenders.
- Network panel on `/apartments/[id]`: no three.js request until the tour
  route is opened.
- Lighthouse on the detail page: LCP unchanged from `main`.
- Throttled 4G: preview texture visible < 1 s, full-res swaps in silently.
- `pnpm lint` + `pnpm test` + `pnpm test:e2e` green (lint has pre-existing
  errors — add none).

---

## 13. Phasing (one PR each)

| Phase | Content | Rough size |
| --- | --- | --- |
| **0 — foundations** | migration (tables, enums, RLS, bucket, `has_virtual_tour` + trigger), regenerated `database.types.ts`, zod schemas, `virtual-tours-map.ts`, cached service reads, `lib/virtual-tour/{math,scene-graph}.ts` + unit tests, factories, seed tour for one demo listing, `supabase/README.md` row. **No UI.** | M |
| **1 — viewer MVP** | the route + shell + `panorama-viewer` (sphere, controls, link hotspots, crossfade), room rail, `?scene=`, detail-page entry pill, skeleton, no-WebGL fallback, i18n, e2e smoke | L |
| **2 — depth** | info hotspots + POI panel, property panel with CTAs, floor-plan minimap, idle preloading + LRU, card badges + `has360` filter, PostHog events | M |
| **3 — owner authoring** | dashboard editor route, panorama uploader with downscale + preview generation, edit-mode hotspot placement, publish gate | L |
| **4 — VR** | `VRButton` behind a capability check, sprite hotspot layer for XR, controller/gaze selection, comfort defaults (no forced motion, snap transitions) | M |

Phases 1 and 2 together are the shippable product; 3 unblocks real content;
4 satisfies the "VR devices" line of the brief and is genuinely optional
until a headset is in the loop.

**Where this landed:** 0, 1 and 2 are done (2026-07-31) barring the floor-plan
minimap and the `has360` chip; 3 and 4 are untouched. The phases did not ship
as one PR each — 1 and 2 were built together against the derived demo module,
and 0 landed last, which is why `lib/virtual-tour/demo-tours.ts` existed at
all. §16 is the ledger.

---

## 14. Risks

1. **Bundle weight.** three.js core is ~150 KB gzipped. Mitigated entirely by
   the dedicated route + lazy trio; the risk is someone later importing it
   from a shared component. Guard it with the build check in §12.
2. **GPU memory on mobile Safari.** 4K cap + LRU-3 (§5, §6.4). Exceeding it
   doesn't degrade — it kills the tab.
3. **WebGL in CI.** SwiftShader is slow; keep e2e assertions DOM-based and
   the tagged skip in place.
4. **Content, not code, is the bottleneck.** Without real panoramas the
   feature demos on CC0 stock. Decide sourcing before phase 3 (open item 1).
5. **Two hotspot renderers** once XR lands (§6.3) — accepted, but keep the
   hotspot *data* and the math shared so they can't drift.
6. **`cacheComponents` rules**: the new service reads must be `"use cache"` +
   `cacheTag`, and no clock reads may escape a cache boundary, or the route
   silently stops prerendering.
7. **Storage egress.** Six 4K panoramas ≈ 12 MB per tour view. Watch Supabase
   egress once more than a handful of listings have tours; a CDN/transform
   layer may become necessary.

---

## 15. Open items to confirm with the user

1. **Panorama sourcing** — real capture (owners with a 360 camera), a
   third-party embed (Matterport/Kuula), or CC0 stock for demo only? This
   decides whether phase 3 is a real product surface or a seed script.
   *Recommendation:* CC0 stock for phases 0–2, owner upload in phase 3.
2. **Scope of the first ship** — phases 1+2 (viewer only, seeded content) is
   my recommendation for the first PR pair; phase 3 doubles the build.
3. **VR priority.** The brief names VR devices, but WebXR needs a headset to
   test honestly. Confirm it's phase 4 and not a phase-1 requirement.
4. **Floor-plan minimap** — nice, but it needs a floor-plan image per listing
   (another asset owners rarely have). *Recommendation:* ship the room rail
   in phase 1, treat the minimap as optional in phase 2 and drop it if
   plan images aren't available.
5. **Route vs overlay** — §8.1 argues for a dedicated route. Say so now if
   the tour should instead open as a fullscreen overlay over the detail page
   (cheaper entry, worse sharing/VR).

---

## 16. Built / not built (as of 2026-07-31)

The ledger this doc should be read against. §§4–13 describe the plan *as
designed*; this section is what actually exists, where it deviates, and what
is still open.

### 16.1 Data — shipped and applied

`supabase/migrations/20260731120000_virtual_tours.sql` and
`…120100_seed_virtual_tours.sql`, applied to project `apartments`
(tkislpxzptslgaxfrvgt) on 2026-07-31 and recorded in the Supabase ledger as
`virtual_tours` / `seed_virtual_tours`. Note this project's ledger versions
have never matched the repo filenames — migrations were applied by hand, so
the timestamps are assigned at apply time.

| Shipped | Detail |
| --- | --- |
| `listing_virtual_tours`, `virtual_tour_scenes` | §4.1, with the deviations below |
| `virtual_tour_status`, `room_kind` enums | `tour_status` is the *in-person* appointment and was left alone |
| `listings.has_virtual_tour` + trigger | §4.2; `sync_listing_has_virtual_tour()`, `execute` revoked so it never surfaces as a REST RPC |
| RLS on both tables | anon sees a tour only when the listing is `active` **and** the tour is `published`; owners see their own drafts; only the owner writes |
| `listing-panoramas` bucket | created for phase 3; **empty** |
| Seed | 13 of the 22 active listings, 60 scene rows (5 rooms; 4 for studios) |

Three deviations from §4 as written, all deliberate:

1. **`entry_scene_id` is a real nullable FK** (`on delete set null`), added
   after both tables exist. Null — or stale — means "the lowest `sort_order`
   scene", resolved in the mapper. A deleted entry room degrades to the first
   room instead of breaking the tour.
2. **`hotspots` carries `check (jsonb_typeof(hotspots) = 'array')`.** Zod is
   still the real validator; this refuses the one shape error every consumer
   would break on.
3. **Explicit `grant select/insert/update/delete`** alongside the policies.
   Redundant if Supabase's default privileges are intact, but a missing table
   grant returns *zero rows*, which is indistinguishable from "no tour".

Verified after applying: zero flag drift (`has_virtual_tour` agrees with
"has a published tour" for every row), zero dangling doors across all 60
scenes, anon reads return the 13 tours, and `get_advisors(security)` reports
no new findings.

### 16.2 Read path — shipped

- `lib/virtual-tour/tour-map.ts` (+ `__tests__/tour-map.test.ts`) — pure row →
  domain mapping, deliberately forgiving: a bad hotspot is dropped without its
  siblings, a scene with unparseable JSON keeps the room and loses the
  markers, a stale entry scene falls back to the first room. It does **not**
  repair the graph — `validateTourGraph` is the write-time gate (phase 3).
- `lib/services/virtual-tours.ts` — one round trip for tour + scenes,
  `"use cache"` + `cacheTag("listings")` + `cacheTag("virtual-tours")`.
- `Listing.hasVirtualTour` maps `listings.has_virtual_tour`; `toListingWrite`
  does **not** write it (trigger-owned, like `views` and `palette`).
- `lib/virtual-tour/demo-tours.ts` and its test are **deleted**. The seed
  content was generated from it before removal, so the seeded angles are the
  ones the app always shipped.

### 16.3 Viewer + UI — shipped

The viewer (dedicated route, three.js engine behind a lazy boundary, DOM
hotspot overlay, `?scene=`, idle preloading + LRU-3, no-WebGL fallback) is
§§6–8 as designed.

The **interface was redesigned on 2026-07-31** against the Claude Design
project (`docs/design/virtual-tour-brief.md` is the brief it was designed
from). What changed from the first implementation:

- The room fills the viewport and every control floats on it as dark
  translucent glass. The shell scopes itself to `.dark` so the booking
  components it borrows from the detail page land on that glass in their dark
  palette instead of punching light rectangles through it.
- Top chrome: back link + listing identity, a room pill (`360° · name ·
  Phòng i/n`), and a share control (`ShareButton` gained an `iconOnly` mode)
  that shares the room you are standing in, since `?scene=` is already in the
  URL.
- Essentials are **one instance**: the fixed column from `lg` up, and the
  sheet the phone bar unfolds below that — so the booking CTAs are never
  mounted twice. The collapsed phone bar is `tour-summary.tsx`.
- Room rail as glass chips (thumbnail + name + index) rather than a strip of
  large thumbnails, which read as "more pictures" over a photograph.
- Doors and points of interest look unalike because they promise different
  things: a bright white ring you walk through vs. an outlined dot that opens
  a note (active state when its panel is open).
- Stage chrome: vignette, dim while a POI is open, glass "arriving" chip, a
  two-line look-around prompt retired by the first drag *or* the first marker
  use, and a zoom column that gained recentre (`engine.resetView`).
- New `virtualTour` keys in both locales: `dragHintBody`, `hostNote`,
  `recenter`, `essentials`, `bedsLabel`, `bathsLabel`, `sizeLabel`.
- The tour's CSS lives in one block at the end of `app/globals.css`.

### 16.4 Not built

| Gap | What it needs |
| --- | --- |
| **Owner authoring (phase 3)** — the big one | §9 in full: the dashboard route, `uploadPanorama()` + client-side downscale/preview generation, edit-mode hotspot placement, a publish gate on `validateTourGraph()`, and a `revalidateVirtualTour(listingId)` action to expire the `virtual-tours` tag. **No write path exists today** — the owner RLS policies are in place but nothing calls them, so they are untested in practice. |
| **Real panoramas** | The bucket is empty; every seeded home shows the same five CC0 demo rooms from `public/panoramas/`. Honest demo data, but not a claim about any unit. Open item §15.1 is still open. |
| **`has360=1` filter chip** | Column and badge exist; the `schemas/filters` + `lib/query.ts` wiring does not. |
| **Floor-plan minimap** | `plan_x` / `plan_y` columns exist and are unused. Needs a floor-plan image per listing (§15.4). |
| **WebXR (phase 4)** | Untouched. Needs the second, sprite-based hotspot renderer (§6.3). |
| **`hfov` column** | Written by nobody, read by nobody; the viewer uses its own `DEFAULT_FOV`. |
| **`listing_virtual_tours.updated_at`** | No trigger maintains it. Set it explicitly in phase 3's writes, or add one. |
| **Storage egress** | Unmeasured (§14.7). Only matters once real panoramas land. |

### 16.5 Gotchas worth keeping

Each of these cost time to find; none is obvious from the code.

1. **Two FKs between the tour tables** (`scenes.tour_id` and
   `tours.entry_scene_id`) make an embedded PostgREST read ambiguous. It must
   name the one it means: `virtual_tour_scenes!virtual_tour_scenes_tour_id_fkey(*)`.
2. **A server-rendered slot with a nested client component warns about keys.**
   Passing hand-built JSX from a Server Component to a client one loses the
   children's compile-time static marking when the tree contains a client
   island, so React validates it as a dynamic list. Fix: make the slot its own
   component (`tour-summary.tsx`). It only reproduced on the `/en` prefix.
3. **Chrome over photography must stay out of the marker field.** Markers are
   positioned where the real opening is, so a control parked mid-stage sits on
   top of a door — `e2e/virtual-tour.spec.ts` caught exactly that when the zoom
   column moved to the middle-right. It hugs an edge and folds into the bottom
   corner from `lg` up.
4. **The tour CSS is unlayered**, so it beats Tailwind utilities on the same
   element. `.tour-glass { color: #fff }` overrides `text-white/70` *on that
   element*; put text colours on children.
5. **The seed's `hashtext` rule is not the old FNV-1a hash.** Same ratio (two
   in three), different subset — which homes carry the 360° badge shifted when
   the read path switched.

### 16.6 Verification status

Green as of 2026-07-31: `pnpm typecheck`, `pnpm lint`, `pnpm test` (463 unit
tests, coverage thresholds held), `pnpm test:e2e` (34 passed, 5 auth specs
skipped without credentials). Browser-checked in both locales and at phone and
desktop widths: badge on browse, tour walks its rooms from the database, a
no-tour listing 404s, no console or hydration warnings.

Not covered by tests: the share control, the phone essentials sheet, recentre,
and the no-WebGL fallback. All four are manual-only today.
