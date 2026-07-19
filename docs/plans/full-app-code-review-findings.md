# Full-app code review — findings

> Results of executing `docs/plans/full-app-code-review.md`. Reviewed
> **2026-07-18** on branch `main` (~256 TS/TSX files). Method: six read-only
> finder passes across the plan's six phases, then a recall-biased verification
> pass — two verifiers cross-checked candidates against the **live** Supabase
> project `tkislpxzptslgaxfrvgt`. Findings are ranked security → correctness →
> SEO. No code was changed.
>
> **Environment note:** `pnpm lint` / `pnpm typecheck` were not run locally (no
> Node on PATH in the review env); CI remains the check for those.

## Headline correction: RLS is deployed, just not in the repo

The scariest structural candidate — "no RLS policies exist in the repo's
migrations for the core tables" — was **REFUTED against the live database**. A
read-only `pg_policies` query confirmed RLS is enabled on all seven core tables
(`listings`, `tours`, `profiles`, `reviews`, `saved_listings`, `owners`,
`owner_availability`) with correct owner-scoped policies (e.g. `listings`
INSERT/UPDATE/DELETE gated on `auth.uid() = owner_id`).

It is therefore a **repo-hygiene gap, not a live vulnerability**: those policies
live only in the deployed DB, not in `supabase/migrations/` (which only cover
the storage bucket, listing-cost columns, and `saved_searches`). A fresh
environment rebuilt from migrations would have **no** row-level protection.
**Recommended:** backfill the deployed core-table policies into a migration.

---

## Reported findings (verified, ranked)

Severity legend: 🔴 security · 🟠 correctness · 🟡 SEO/quality. All CONFIRMED
unless noted.

### 1. 🔴 Edge function does no caller authorization
`supabase/functions/saved-search-alerts/index.ts:375`

The function performs no caller authorization yet runs with the service-role
key. No `supabase/config.toml` exists to pin `verify_jwt`, so the default
applies and the public anon key (a valid JWT) passes.

**Failure:** attacker POSTs `{"listing_id":"<any active listing uuid>"}` to
`/functions/v1/saved-search-alerts` with the site's public anon key as Bearer.
The function service-role-reads every user's saved searches, calls
`auth.admin.getUserById` to resolve their private emails, and sends emails at
attacker-controlled volume/timing.

**Fix:** require a shared-secret header (or restrict to a service-role/DB-webhook
caller) before any privileged work; add a `config.toml` that pins `verify_jwt`.

### 2. 🔴 Unescaped `query_string` injected into alert-email HTML
`supabase/functions/saved-search-alerts/index.ts:239` (emitted at ~321)

`escapeHtml` is applied to other fields, but `seeAllUrl` is built from the saved
search's raw `query_string` and interpolated unescaped into an `<a href>`. The
DB only enforces `char_length <= 2000`.

**Failure:** a user inserts a saved search directly (bypassing the UI serializer)
with `query_string = '"><a href="https://evil/verify">Re-verify your
account</a><x y="'`. It passes the length check and the app's lenient
`parseFilters`. When any listing publishes, the platform's Resend account emails
official-looking phishing HTML from the Danapa sender domain.

**Fix:** `escapeHtml` (or URL-encode) `query_string` before interpolation;
validate/serialize it on insert instead of trusting stored text.

### 3. 🔴 Tour `owner_id` is client-supplied
`hooks/use-book-tour.ts:43`

The tour insert sets `owner_id` from client-controlled input instead of deriving
it server-side from `listing_id`. The live `tours_insert_renter` policy only
checks `auth.uid() = renter_id`, so `owner_id`, `renter_name`, and
`renter_email` are unvalidated at every trust boundary.

**Failure:** a signed-in renter replays the insert with a real `listing_id` but
`owner_id` set to a different user's id. The row lands on the victim owner's
dashboard (`use-owner-tours` filters `.eq('owner_id', userId)`) while the real
owner never sees the request; renter identity fields can impersonate anyone.

**Fix:** derive `owner_id` server-side from the listing, or add a `WITH CHECK`
that ties `owner_id` to the listing's real owner; validate renter fields.

### 4. 🟠 Saved-page search errors on every query (enum `ilike`)
`hooks/use-saved-listings.ts:56`

`textOr()` builds `district.ilike.%term%` against the `district` column, which is
a Postgres **enum** with no `ilike` operator.

**Failure:** a signed-in user opens `/apartments/saved` and types anything.
PostgREST returns `42883 operator does not exist: district ~~* unknown`
(reproduced against the live DB), the `queryFn` throws, and the saved list shows
an error/empty state — for every non-empty query.

**Fix:** cast the column (`district::text`) in the filter, or drop `district`
from the free-text OR and match it separately as an enum equality.

### 5. 🟠 Week-replace wipes all availability on partial failure
`hooks/use-availability.ts:98`

`replaceMutation` replaces an owner's whole week via a delete-all followed by a
separate insert, with no transaction/RPC.

**Failure:** owner applies a preset → `DELETE from owner_availability` succeeds →
network drop or rejected `INSERT` → mutation throws. `onError` restores only the
local cache, then `onSettled`'s `invalidateQueries` refetches the now-empty
table and overwrites it. All tour slots are gone and renters can no longer book
with that owner.

**Fix:** do the replace in one Postgres RPC/transaction (delete + insert atomic).

### 6. 🟠 Past-slot booking uses device clock, not Da Nang UTC+7
`app/[lang]/(app)/apartments/[id]/constants/tours.ts:38`

`isPastSlot`/`todayYmd` use the renter's device-local clock while tour slots are
fixed Da Nang (UTC+7) wall-clock times (`tour/lib/calendar.ts` pins +07:00).
Nothing server-side rejects a past slot (live `tours` has no CHECK constraint).

**Failure:** renter in San Francisco at 21:00 on 2026-07-17 (Da Nang 2026-07-18
11:00) opens the calendar. `todayYmd()` returns `2026-07-17`, so `isPastSlot` is
false for every 07-18 time; the already-elapsed 09:00/10:00 Da Nang slots show
open and the tour inserts with a past date/time.

**Fix:** compute "now" in UTC+7 (same pinning as `calendar.ts`); add a
server/DB guard rejecting past slots.

### 7. 🟠 Reschedule proposals ignored → double-booking
`app/[lang]/(app)/apartments/[id]/constants/tours.ts:56`

`occupiedSet` keys on `t.date`/`t.time` only and ignores the *effective* proposed
slot (`proposedDate`/`proposedTime`) of `reschedule` tours (`tourSlot`, ~line 79).

**Failure:** owner proposes 2026-07-20 10:00 to renter A (tour A → status
`reschedule`, proposed 07-20 10:00, original 07-19 09:00). Opening the modal for
renter B, `occupiedSet` contains only `2026-07-19|09:00`, so 07-20 10:00 is
offered again and proposed to B. Both accept → two confirmed tours at the same
slot, while the abandoned original stays blocked.

**Fix:** build `occupiedSet` from the same `tourSlot` accessor used elsewhere, so
proposed slots count as occupied.

### 8. 🟠 Inverted `NaN` guard drifts from the browse filter
`supabase/functions/saved-search-alerts/index.ts:134` (also 135, 143)

For a non-numeric `minPrice`/`maxPrice`/`minArea`, the app's filter computes
`price >= NaN` (excludes everything) while the edge function uses an inverted
`price < NaN` guard (excludes nothing).

**Failure:** a saved search stored with `minPrice='2,000'` (comma-formatted,
inserted outside the UI) shows 0 results on Browse, but the edge function treats
it as matching every newly published listing and emails an alert on each
publish.

**Fix:** mirror the app's comparison exactly (parse-and-`>=`), and reject/ignore
non-numeric bounds identically in both code paths.

### 9. 🟠 Blank area silently stored as a fabricated 40 m²
`schemas/listing/index.ts:294`

`formToCore` maps area as `Number(v.area) || 40`, and the zod schema declares
`area` as an unconstrained string.

**Failure:** owner submits the create form with area blank. The row is stored as
`area=40`; browse cards and the detail page state "40 m²" as fact, the listing
matches the `minArea='40'` filter and sorts accordingly, and `listingToForm`
maps it back to "40" so even the owner sees a value they never entered.

**Fix:** make `area` required and numeric in the schema; drop the `|| 40`
fallback.

### 10. 🟡 Invalid JSON-LD `availabilityStarts: "now"`
`app/[lang]/(app)/apartments/[id]/lib/json-ld.ts:50`

The JSON-LD Offer emits `availabilityStarts: "now"` — a non-ISO-8601 value —
whenever a listing's `available` field is the `"now"` sentinel (seeds
l1/l3/l5/l7/l9/l10). Google Rich Results / Search Console flags the invalid Date,
degrading structured-data eligibility for most listings — a violation of the
plan's don't-break-SEO constraint.

**Fix:** map `"now"` to the current date (or omit `availabilityStarts` and set
`availability` to `InStock`).

---

## Honorable mentions (verified, below the 10-cap)

All CONFIRMED; lower severity or narrower blast radius.

| # | Location | Issue |
|---|---|---|
| A | `lib/actions/listings.ts:12` | `revalidateListings` lets **any** signed-in user flush the site-wide `listings` cache tag (authenticated cache-bust DoS); also silently no-ops when `getClaims()` is empty, and the caller `void`s the result → successful writes can leave public pages stale for the `cacheLife('hours')` window. |
| B | `schemas/filters/index.ts:18` | `availCutoffISO` derives the cutoff from machine-local time (browser vs. server), not Da Nang UTC+7 → off-by-one availability filtering; browse and saved pages disagree for the same filter. |
| C | `hooks/use-saved.ts:163` | `migratedRef` is set on sign-in and never reset on sign-out → guest saves made after a same-session sign-out are never merged on re-sign-in; hearts silently turn off. |
| D | `hooks/use-profile.ts:75` | Profile edits invalidate only react-query; the server `owner:${id}` cache tag is never revalidated anywhere → public owner page + metadata serve stale name/bio for up to hours. |
| E | `app/[lang]/(app)/apartments/[id]/components/back-to-results.tsx:37` | `useSyncExternalStore` with an `emptySubscribe` that never fires `onChange` on Next-16 bfcache restore (the repo already fixed this pattern in `recently-viewed.ts:93-99`) → stale "back to results" href on modified-click / `!canGoBack` paths. |
| F | `app/[lang]/(app)/apartments/components/saved-searches-strip.tsx:45` | Client `select("*")` downloads **every** active listing (images, amenities, description) into the browser just to compute per-card match counts; no `.limit()`. Grows with the table. |
| G | `app/[lang]/(app)/owner/[id]/page.tsx:37` & `.../[id]/components/detail-content.tsx:31` | Independent async fetches awaited sequentially → TTFB is the sum, not the max, on cache-miss renders. Use `Promise.all`. |

### Quality / consistency tier (not individually verified)

- **CI never typechecks the edge function** — `tsconfig.json` excludes
  `supabase/functions`, and CI is lint + typecheck only (no `deno check`). The
  400+-line alert function (findings #1, #2, #8) has no static safety net.
- **UUID regex duplicated verbatim in 6 files** (`use-saved.ts`,
  `services/listings.ts`, `services/owners.ts`, `saved-list.tsx`, `compare.ts`,
  `recently-viewed.tsx`) — extract a shared `isUuid()` in `lib/utils.ts`.
- **`use-owner-tours` ≈ `use-my-tours`** — ~100 lines of duplicated
  optimistic-update machinery differing only in the filter column + query key.
- **Hardcoded English a11y strings** in a vi-default app — `carousel.tsx`
  ("Previous/Next slide"), `language-switcher.tsx` ("Change language"),
  `similar-homes.tsx` / `skeleton-listing-card.tsx` skeleton labels; plus
  English-only date-picker (`date-picker.tsx`), auth `err.message` toasts, and
  the OG image `alt`.
- **Custom photo lightbox** lacks dialog semantics / focus trap / focus restore;
  photo reordering is mouse-drag-only (no keyboard path); all gallery photos
  share one `alt`.
- **Leaflet theme colors** cached once at map mount (`colorsRef`) → pins/circles
  keep light-theme colors after a dark-mode toggle until reload
  (`location-map.tsx`, `tour-route-map.tsx`, `location-picker.tsx`).

---

## Cleared during review (checked, no issue)

Publishable keys only in app code (service-role key exists only in the edge
function's Deno env); `safeInternalPath` correctly blocks open redirects in
`auth/confirm` + signin; storage upload paths are UUID-random under the user's
`auth.uid()` folder with bucket RLS; `saved_searches` has complete owner-scoped
CRUD policies; message catalogs are in sync (709 keys each); canonical / hreflang
/ sitemap / robots agree on the as-needed URL shape (vi unprefixed, `/en`
prefixed); JSON-LD prices use the same fixed USD→VND rate as the display layer;
`lib/geo.ts` haversine and `lib/money.ts` single-rounding are correct; Leaflet is
lazy-loaded; `next.config.ts` `remotePatterns` are narrow and strict mode is on.
