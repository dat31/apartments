# Code review — commit `bb4f386` (fix: resolve full-app code-review findings)

> Review of the committed diff `bb4f386b758319ab162bf4654364e163ab17d1be` on branch
> `fix/code-review-findings`, run **2026-07-18** at high effort: 7 finder angles
> (line-by-line, removed-behavior, cross-file tracer, reuse, simplification,
> efficiency, altitude) fanned out over the 865-line diff, ~24 raw candidates
> deduped to 14, each verified against the actual files. **No code was changed.**
>
> **Overall:** the 10 headline fixes themselves are correctly implemented — the
> RPC is genuinely atomic, the trigger fires before NOT NULL checks and covers
> UPDATEs, the NaN mirroring now matches the app, the escaping covers all
> query-derived fields, and accept-reschedule stays consistent with the new
> `occupiedSet` keying. The findings below are almost all **incomplete fixes**:
> the timezone fix misses a call site in the same dialog, the double-booking fix
> only protects one of the two booking paths, and several fixes stop at the
> client while the findings doc's own remedy called for a server/DB half.

Severity legend: 🟠 correctness · 🔴 security-depth · 🟡 ops/quality. Ranked
most severe first.

## 1. 🟠 Calendar month window still uses the device clock

`app/[lang]/(app)/apartments/[id]/components/month-calendar.tsx:38`

The calendar's month window (`start`/`view`/`canPrev`) is still built from
device-local `new Date()` while `todayYmd()` now returns the Da Nang date, so
the two disagree whenever the device month differs from Da Nang's month.

**Failure:** a renter in San Francisco on Jul 31 20:00 local (Da Nang already
Aug 1) opens the dialog on a July grid where every day is disabled (all past in
Da Nang) with no "today" marker — a dead grid they must guess to click past. A
renter east of UTC+7 (e.g. Auckland at 03:00 on Aug 1 local while Da Nang is
still Jul 31) is worse off: `canPrev` blocks navigating back, so the current Da
Nang day is unreachable and its still-open slots can never be booked.

**Fix:** derive the start month from the Da Nang date (same helper as
`todayYmd`), not `new Date()`.

## 2. 🟠 Renter booking path can still double-book a proposed slot

`app/[lang]/(app)/apartments/[id]/components/book-tour-dialog.tsx:120`

The renter path passes a hardcoded empty occupied set
(`occupied = new Set()`), so the `occupiedSet`/`tourSlot` double-booking fix
only protects the owner's propose modal — and no DB constraint enforces slot
uniqueness either.

**Failure:** owner proposes Jul 20 10:00 to renter A (tour → `reschedule`,
proposed slot now held per this commit's fix). Renter B opens the book-tour
dialog for the same listing: `openSlotsFor` sees an empty occupied set and
offers Jul 20 10:00; B books it, A accepts the proposal → two live tours at the
same owner slot — the exact outcome the commit message says it prevents.

**Fix:** the code comment correctly notes renter RLS can't see other renters'
tours — which is why this needs to be server-side: a slot-uniqueness
constraint/exclusion on `(owner_id, effective date, time)` for live statuses,
or an insert-time check in a SECURITY DEFINER RPC.

## 3. 🟠 Edge fn still diverges from the app on unrecognized `avail` keys

`supabase/functions/saved-search-alerts/index.ts:161`

The "mirror `filterListings` exactly" contract this commit tightens is still
broken for `avail`: the app coerces an unrecognized key to `"any"` (matches
everything, `lib/query.ts` parseFilters), while the edge function passes it
through raw and `listingMatches` returns false (matches nothing).

**Failure:** a saved search stored with `avail` outside `now/1w/2w/1m/any`
shows normal results on Browse but never matches any listing in the edge
function (`AVAIL_MAX_DAYS` lookup → `undefined` → `return false`) — the user
silently never receives alert emails. This is the mirror-image of fixed
finding #8 (silent no-alerts instead of phantom alerts).

**Fix:** root cause is the hand-mirrored predicate itself. Extract the pure
listing-match function (numeric bounds + beds + avail) into one shared,
runtime-agnostic module that both `query.ts` and the Deno function import;
short of that, coerce `avail` identically in the edge fn's `parseFilters`.

## 4. 🟠 `nowInDaNang()` reads an hour wrong across the visitor's DST transitions

`app/[lang]/(app)/apartments/[id]/constants/tours.ts:53`

`nowInDaNang()` applies the device's *current* UTC offset, but the fabricated
Date is read back with the offset at the *shifted* instant, so the Da Nang wall
clock reads one hour wrong in the hours before each DST transition in the
visitor's zone.

**Failure:** a renter in New York shortly before the November fallback: the
`+offset+7h` shift lands the fake instant past the transition, so local getters
apply the new offset and read 09:30 when Da Nang is at 10:30 — `isPastSlot`
offers an already-elapsed slot (spring-forward inverts it and hides a valid
slot for an hour).

**Fix:** the robust form is the one `tour/lib/calendar.ts` already uses: shift
a real instant (`Date.now() + DA_NANG_OFFSET_MS`) and read it through `getUTC*`
getters. That also removes the not-a-real-instant trap of the current
fake-local Date (its `getTime()`/`toISOString()` are wrong by the host offset,
but nothing in the type says so).

## 5. 🔴 Client still sends `owner_id`; correctness silently depends on the trigger

`hooks/use-book-tour.ts:48`

The client still sends `owner_id` (and the `tours` Insert type still requires
it, `lib/database.types.ts`), so correctness now silently depends on the
`set_tour_owner_id` trigger existing in the target database.

**Failure:** in any environment where the trigger is absent — a DB rebuilt from
a dump, a branch database predating the migration, or the trigger dropped in a
refactor — the client-supplied `OWNER_ID_BY_KEY` fallback value is stored again
with zero errors, invisibly reopening the misdirected-tour vulnerability this
commit fixed. This repo already has documented live-vs-migrations drift (RLS),
so "the migration is in the repo" is not a strong guarantee.

**Fix:** make the column trigger-populated (nullable pre-trigger or with a
default), regenerate types, and drop `owner_id` from the insert payload — then
a missing trigger fails loudly (NOT NULL violation) instead of succeeding
wrongly.

## 6. 🟠 Past-slot rejection is client-only; no server/DB guard was added

`app/[lang]/(app)/apartments/[id]/constants/tours.ts:62`

The findings doc's own remedy for #6 says "add a server/DB guard rejecting past
slots", but no migration adds one and the tours RLS insert policy still only
checks `renter_id`.

**Failure:** a renter opens the booking dialog at 08:55 Da Nang and confirms at
09:20 from the stale slot list (or replays the PostgREST insert directly): the
past 09:00 tour inserts successfully, occupies the owner's slot via
`occupiedSet`, and lands on the owner dashboard as a pending tour in the past.

**Fix:** a CHECK or BEFORE trigger on `tours` comparing the slot to
`now() at time zone '+07'` (could share the same migration as finding #2's
slot-uniqueness guard).

## 7. 🟡 Following the README's trigger-wiring instructions yields a silently dead pipeline

`supabase/README.md:25`

No `supabase/config.toml` pins `verify_jwt`, and the wiring snippet doesn't say
the pg_net POST also needs a JWT `Authorization` header (or that the secret
must be set before deploying).

**Failure:** an operator wires the publish trigger to POST with only the
`x-alert-secret` header: under the default `verify_jwt` the gateway 401s every
call before the function runs. Alternatively, deploying before
`supabase secrets set ALERT_TRIGGER_SECRET` makes the new fail-closed check 401
everything. pg_net failures are async and unmonitored, so zero alert emails
send and nothing surfaces it.

**Fix:** commit a `config.toml` pinning the function's `verify_jwt`, and update
the README wiring snippet to include the full header set and the deploy-order
requirement. A constant-time secret comparison (e.g. compare SHA-256 digests)
would also harden the gate.

## 8. 🟠 Saved-page district search lost slug/unaccented parity with Browse

`hooks/use-saved-listings.ts:60`

Dropping `district.ilike` leaves saved-page free-text district matching
label-only, while Browse's `filterListings` haystack also contains the raw slug
(`lib/query.ts:59`).

**Failure:** typing `hai-chau` (or unaccented `hai`) in the saved-page search:
Browse matches Hải Châu listings via the slug in its haystack, but the saved
page's label→slug expansion only matches the diacritic label "Hải Châu", so the
`district.in` condition is never added and results show 0 for a query Browse
resolves. (Not a regression — the old `district.ilike` errored the whole
query — but the stated parity goal isn't met.)

**Fix:** extend the expansion to also match on the slug:
`DISTRICTS.filter((d) => districtLabel(d).toLowerCase().includes(lower) || d.includes(lower))`.

## 9. 🟠 `area > 0` enforced at exactly one write path; legacy null-area rows now block edits

`schemas/listing/index.ts:173`

The invariant lives only in the client zod form — where it also hard-blocks
editing legacy null-area listings — while the DB column stays nullable with no
CHECK constraint.

**Failure:** an owner of a legacy row (`area` null → `listingToForm` maps to
`""`) changes only the price and submits: validation fails with "Enter an area
above 0" and the save is blocked until they invent a value. Meanwhile any
non-form write path (direct PostgREST insert under valid RLS, seed script) can
still store null/0 area. The refine also accepts `1e999`
(`Number → Infinity > 0` passes).

**Fix:** a DB `CHECK (area > 0)` after backfilling legacy rows — enforcing the
invariant at the trust boundary the way this same commit did for `owner_id` —
plus `Number.isFinite` in the refine. Decide explicitly whether legacy-row
edits should force an area entry (current behavior) or grandfather nulls.

## 10. 🟡 Third private copy of the UTC+7 offset; sibling device-clock bugs left in place

`app/[lang]/(app)/apartments/[id]/constants/tours.ts:52`

`DA_NANG_OFFSET_MS` is the third private copy of the Da Nang offset
(`tour/lib/calendar.ts` has `DA_NANG_OFFSET_MIN`; `schemas/filters`
`availCutoffISO` and `lib/data/listings` `availInfo` still use the device
clock — the same bug class this commit fixes, flagged in its own findings doc
as honorable-mention B).

**Failure:** a user west of UTC+7 filtering "available within 1 week" still
gets a device-local cutoff one day behind Da Nang (and SSR disagrees with the
client), so availability filtering contradicts the now-correct tour-slot logic.
Each future date fix must be reasoned through per-copy.

**Fix:** one shared `lib/` Da Nang-time helper (offset constant +
`nowInDaNang`/`todayYmd`) consumed by tours, calendar, filters, and the edge
function.

---

## Verified and cleared (checked, no issue)

- `replace_owner_availability` RPC matches `database.types.ts` and the hook's
  payload; rolls back atomically; `security invoker` keeps RLS in force;
  `"HH:mm"` casts cleanly to `::time`.
- The trigger's `BEFORE INSERT OR UPDATE OF listing_id, owner_id` covers
  tampering-by-update; no legitimate update path sets those columns;
  accept-reschedule copies proposed→date/time so the new `occupiedSet` keying
  stays consistent.
- `escapeHtml` covers every query-derived interpolation in the alert email
  (title, name, location, chips, image src/alt, title tag, seeAllUrl);
  remaining hrefs are built from UUID/env values.
- The `>=`/`<=` NaN mirroring now matches the app exactly for price/area.
- The fail-closed empty-secret check in the edge function is correct
  (`!ALERT_TRIGGER_SECRET ||` rejects when unset).
- Listing-form error wiring (`FieldError`, `aria-invalid`) matches the existing
  title/price field pattern; vi/en message catalogs both gained the `area` key.

## Dropped after verification

- **"RPC missing in unmigrated environments"** — the migration is committed and
  applied to prod, and the failure mode is a loud 404, not silent corruption.
- **Unconditional `InStock` for future-dated listings in JSON-LD** — schema.org
  offers no better-supported enum and `availabilityStarts` carries the date.
- **Micro-efficiency**: `todayYmd()`/`nowInDaNang()` recomputed per cell/slot in
  the calendar render loop (~hundreds of throwaway Dates per render) — real but
  trivial; worth hoisting only if touching the file anyway.
- **Minor cleanups noted, below the cap**: `use-availability.ts` builds full
  rows via `toAvailabilityRows(ownerId, next)` then strips `owner_id` back off
  (build the `{weekday, time}` pairs directly); the
  `replace_owner_availability` entry was hand-patched into the generated
  `lib/database.types.ts` (regenerate instead); the ALERT_TRIGGER_SECRET
  rationale is written out in full in three places (function header, serve()
  comment, README) — keep one canonical copy and point at it.
