# Design handoff: /tour day-route map ("Xem lộ trình ngày này")

> Flow + state handoff for redesigning the tour route view in Claude Design.
> The rest of the Claude Design project already mirrors the codebase; this
> doc covers the one out-of-sync area — the map view and route functionality
> on `/tour`. Source of truth for behavior:
> `app/[lang]/(app)/tour/components/{tour-day-route,tour-route-map,route-legs,tour-route-skeleton}.tsx`.

## 1. Where it lives — page anatomy

`/tour` (renter's "Lịch xem của tôi") groups **upcoming** tours into day
sections, each headed by the date (weekday + day + month); past/declined
tours sit below in a "Đã qua & đã hủy" history list.

```
┌ /tour ──────────────────────────────────────────────┐
│ H1 "Lịch xem của tôi" · count · [Xem nhà]            │
│                                                      │
│ THỨ TƯ, 9 THÁNG 7          ← day heading (uppercase) │
│   [tour card 09:00]                                  │
│   [tour card 09:31]                                  │
│   [tour card 14:00]                                  │
│   [⚏ Xem lộ trình ngày này]   ← THE FEATURE          │
│     └ (expanded) map + status rows + legs list       │
│                                                      │
│ ĐÃ QUA & ĐÃ HỦY                                      │
│   [card] [card] …                                    │
└──────────────────────────────────────────────────────┘
```

**When the button exists:** only when a day has **≥2 routeable stops** —
tours with status `pending` or `confirmed` whose listing still exists.
`reschedule` tours and deleted-listing tours show their card but are never
route stops. 1 routeable stop → no route UI at all.

## 2. Entry point + loading

- Toggle: secondary button, Route icon, label `viewRoute` ⇄ `hideRoute`,
  `aria-expanded`. Collapsed by default; nothing below it until opened.
- On first open, the map code is lazy-loaded; a **skeleton** holds the
  footprint: map-shaped block (288px tall, 320px ≥sm) + two 32px row
  skeletons + one short line (the legs list + link placeholder).

## 3. The map canvas

- OpenStreetMap tiles inside a bordered, square-cornered container
  (flat "Hearth" system: **no border radius, no shadows anywhere** —
  the only round things on the page are the map markers, deliberately).
- Dark mode inverts the tiles (`invert(1) hue-rotate(180deg)` + slight
  dim) so the map reads as dark; chrome (zoom, attribution) is themed
  with design tokens. Zoom control sits bottom-right. Wheel-zoom only
  after the user clicks into the map (page scroll is never hijacked).
- **Stop pins**: 30×30 teardrop (rotated square, round via inline style),
  filled `--primary`, with the **stop number** (1-based, schedule order)
  centered in `--background` color, 13px bold. Two tours at the same
  address share one pin with stacked numbers "1·2" (10px).
- **User dot**: 18×18 filled `--primary` circle with a 3px `--background`
  ring — only when geolocation is granted.
- **Route polylines** (all colored from CSS tokens, resolved at runtime):

| line | style | when |
|---|---|---|
| schedule leg | solid, 4px, 80% opacity, `--primary` | normal leg |
| tight leg | same but `--destructive` | drive > free gap (see §5) |
| fallback | dashed 4-8, 2px, 55%, `--primary` | OSRM down — straight lines |
| suggestion preview | dotted 1-7, 4px, 80%, `--primary` | previewing suggested order |

- Map frames all stops on open; reframes to the route once drawn.

## 4. Below-map stack (order matters)

Top → bottom, all `text-sm`, 12px gaps:

1. **Geolocation status row** (one of):
   - locating: spinner + `locating`
   - denied/unavailable: locate icon + `locationDenied` + ghost `retry`
   - granted: no row (the dot on the map is the signal)
2. **Suggestion row** (only when a suggestion exists — §6):
   💡 + `suggestion` sentence + ghost toggle `preview` ⇄ `previewOff`
3. **Route loading row**: spinner + `loadingRoute` (replaces 4 while
   fetching)
4. **Legs list**: bordered card-background ordered list, one row per leg:
   - left (muted, truncates): `leg` = "{from} → {to}" where from/to are
     `yourLocation` or `stop` ("Điểm {n}")
   - right (tabular numerals): distance (`m` under 1 km, `km` above,
     1 decimal < 10 km) — and `· {minutes} phút` when OSRM succeeded
   - **tight-gap legs** get a second line under the row, destructive
     color, 12px, warning triangle: `tightGap`
   - last row = `total`, medium weight, same metrics
   - below the list: external-link `openInGoogleMaps` (primary color,
     opens Google Maps directions through every point in order)
5. **OSRM-down variant**: a warning-triangle note (`routeError`) + ghost
   `retry` sits above the legs list; rows show distances only (crow-flies),
   no minutes, no tight-gap flags.

## 5. Tight-gap warning (feasibility)

Each stop→stop leg's OSRM drive time is compared with the free minutes
between the two bookings (tour assumed to take **30 min** —
`TOUR_DURATION_MIN`). Drive > gap ⇒ that leg's polyline turns
`--destructive` and its row gets the `tightGap` line. Displayed gap is
clamped to ≥0 (overlapping bookings show "0 phút"). The leg from the
user's location is never flagged (no schedule constraint).

## 6. Order suggestion (flexible days)

Gate: **≥3 stops AND ≥1 `pending`** stop (a time the owner hasn't
confirmed). After the route loads, one OSRM trip-service call checks the
optimal visiting order; a hint appears only when it saves **>5 minutes**:

> 💡 Đi theo thứ tự ① → ③ → ② sẽ tiết kiệm ~10 phút lái xe  [Xem thử]

- Order rendered with circled digits ①–⑨ referring to the **original**
  schedule numbers on the pins (pins never renumber).
- **Xem thử (preview)**: schedule polylines swap for one dotted line in
  the suggested order; the legs list and Google Maps link swap to the
  suggested order too (no tight-gap flags — the times would shift).
  Toggle label becomes `previewOff` ("Về thứ tự theo lịch"); toggling
  back restores the schedule view exactly, red legs included.
- Suggest-only: **no booking is ever changed** (locked product decision).

## 7. State machine (what can combine)

- geo: `locating → done | denied | unavailable` (retry loops back)
- route: `loading → shown | estimate(fallback)` (retry from estimate)
- suggestion: `none | available` (only ever when route = shown)
- preview: `off | on` (only when suggestion available)

Valid on-screen combinations a redesign must cover:

1. skeleton (chunk loading)
2. map + locating row + loading row
3. map(+dot) + legs (happy path)
4. map + denied row + legs starting at stop 1
5. map(+dot) + legs with 1+ tight rows / red legs
6. map(+dot) + suggestion row + legs (schedule)
7. map(+dot) + suggestion row (previewOff label) + dotted line + suggested legs
8. map + routeError note + dashed lines + distance-only legs + retry
9. Combinations: 4+5, 4+6 (denied + suggestion) etc. — rows stack, never replace each other except loading→legs.

## 8. Copy inventory (`tour.route.*`)

| key | copy |
|---|---|
| viewRoute | Xem lộ trình ngày này |
| hideRoute | Ẩn lộ trình |
| yourLocation | Vị trí của bạn |
| stop | Điểm {n} |
| leg | {from} → {to} |
| total | Tổng cộng |
| minutes | {minutes} phút |
| openInGoogleMaps | Mở trong Google Maps |
| locating | Đang xác định vị trí của bạn… |
| locationDenied | Không có vị trí của bạn — lộ trình bắt đầu từ điểm 1. |
| loadingRoute | Đang tải lộ trình lái xe… |
| routeError | Không tải được lộ trình lái xe — khoảng cách bên dưới là đường chim bay. |
| retry | Thử lại |
| tightGap | Chỉ có {gap} phút giữa hai lịch — lái xe mất {drive} phút |
| suggestion | Đi theo thứ tự {order} sẽ tiết kiệm ~{minutes} phút lái xe |
| preview | Xem thử |
| previewOff | Về thứ tự theo lịch |
| ariaMap | Bản đồ lộ trình các lịch xem trong ngày |

Plus `tour.historySection` ("Đã qua & đã hủy") for the page restructure.

## 9. Fixed vs. free

**Behavior contracts (keep):** the state machine and gating rules above;
stop numbering = schedule order, never renumbered; suggest-only (no
rebooking affordances); route inline on /tour per day (not a separate
page); all copy from the keys in §8, no hardcoded strings;
wheel-zoom-after-click; accessibility (`role="application"`, `ariaMap`
label, `aria-expanded` on the toggle); flat design system (no
radius/shadows) except round map markers.

**Free to redesign:** layout and hierarchy of the below-map stack; how the
legs list, warnings, totals and suggestion are presented (rows vs cards vs
timeline); pin/dot styling; how preview mode is communicated; whether the
route section sits below the day's cards or beside them on wide screens;
empty/edge presentations (single-warning emphasis, etc.). Map tiles stay
OSM/Leaflet — chrome around them is fair game.

## 10. Known rough edges — where the redesign can win

The current below-map stack is functional but grew state by state; these
are the spots that most deserve design attention:

- **Stacked status rows compete.** Locating, location-denied, suggestion,
  and the fallback note are all similar-weight text rows above the legs
  list; with several active at once nothing establishes hierarchy. A
  redesign could fold them into the map (overlay chips/banners) or give
  each a clear slot.
- **The tight-gap warning is easy to skim past.** A red polyline plus a
  12px second line inside one row undersells "you physically cannot make
  this booking". Consider elevating it to the day-section level ("1 lịch
  khó kịp") or onto the affected cards.
- **Preview mode is under-communicated.** The only signals that you're
  looking at the hypothetical order are the dotted line and a changed
  button label; the pins still show schedule numbers, and the legs list
  swaps silently. A visible "preview" state (banner, tinted list header,
  or re-badged pins) would help.
- **The map ↔ list link is implicit.** Rows and legs correspond 1:1 but
  nothing connects them (no hover highlight, no shared numbering in the
  list rows). The list uses "Điểm {n}" text where numbered badges matching
  the pins would scan faster.
- **Suggestion sentence carries a lot.** Circled digits + savings + toggle
  in one sentence; on narrow screens it wraps awkwardly around the ghost
  button.
- **The toggle gives no scent.** "Xem lộ trình ngày này" doesn't hint at
  total drive time or warnings before opening; a summary in the collapsed
  state (e.g. "3 điểm · ~18 phút lái xe · 1 cảnh báo") could earn the tap.

## 11. Reference

- Screens: dark-mode screenshots of states 3, 5, 7 exist from headless
  verification (ask in-session or re-run the recipe in
  `docs/plans/tour-route-planner.md` §6).
- Live demo data: seed 2–4 same-day tours (one at :31 past the previous in
  another district for a red leg; ≥3 stops with one pending + a zigzag
  order for the suggestion) — SQL pattern in the plan doc / session notes.
