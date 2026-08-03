# Owner dashboard: client-fetched → server-rendered

> Written **2026-08-03**. **All of it is built.** Phases 0–2 (chrome + the
> three listing tabs) landed first; phases 3–4 (tours, availability) followed.

---

## 1. What the dashboard does today

`layout.tsx` and all five tab pages are already Server Components, but every
one of them renders directly into a `"use client"` child that fetches its own
data after hydration:

| Surface | Client component | Data source |
|---|---|---|
| layout | `dashboard-header` | `useProfile` + a `useHydrated` gate |
| layout | `dashboard-stats` | `useListings` + `useOwnerTours` |
| layout | `dashboard-nav` | `useListings` + `useOwnerTours` |
| overview / active / drafts | `listings-tab` → `listing-row` | `useListings` |
| tours | `owner-tours` → `owner-tour-card` | `useOwnerTours` + `useAvailability` |
| availability | `availability-editor` | `useAvailability` |

So the HTML that ships is an empty shell. The greeting is an `h-9` skeleton,
`listings-tab` returns `null` until `ready`, and the whole page arrives on a
second paint — after hydration, after `useUser()` resolves, after four
round trips through the Server Actions in `lib/actions/**`.

None of that is necessary here. `/owner/dashboard` is auth-gated in
`lib/supabase/middleware.ts`, so a Server Component on this route can call the
`requireUser()`-backed services directly. **This needs no new auth plumbing**
and does not block on `server-owned-auth-hydration.md` — it is a strict subset
of it, and it retires that doc's step 2 (`dashboard-header`'s gate) and its §1
finding (the no-op gate in `listings-tab`) along the way.

---

## 2. Target shape

- **Static shell, prerendered per locale**: layout chrome, headings, nav
  labels. The route should build as `◐` (Partial Prerender).
- **Every cookie-bound read inside its own `<Suspense>`.** Not a style
  preference — under `cacheComponents: true`, uncached data outside a boundary
  fails the build.
- **Reads on the server. Writes stay client islands** calling the same Server
  Actions they call today, with `useOptimistic` + `router.refresh()` in place
  of react-query's optimistic cache blocks.
- **Islands are self-contained.** A row's toggle takes `listingId` and
  `status` and owns its own action call, rather than having `onToggleStatus`
  threaded down from a client parent — the same reasoning as `save-button.tsx`
  in the `server-first-rendering` skill.

---

## Phase 0 — foundations

**Memoize the per-request reads.** The layout and the page both need the
owner's listings, and the layout needs them three times over (stats, sidebar
nav, mobile chips). Wrap the owner-scoped service reads in `react.cache()`,
exactly as `getSessionUser()` already is in `lib/services/session.ts`:

| Service | Function |
|---|---|
| `lib/services/listings.ts` | `listMyListings` |
| `lib/services/tours.ts` | `listTours` (memoizes per scope) |
| `lib/services/profiles.ts` | `getMyProfile` |

All three are cookie-bound and uncached, so there is no interaction with the
`"use cache"` boundaries elsewhere in those files — `cache()` deliberately does
not reach inside one. The existing actions in `lib/actions/**` keep calling
them unchanged and simply inherit the memoization.

`getAvailability` is **not** on that list: it is already a `"use cache"`
boundary tagged `availability:<ownerId>`, because availability is a public
read a renter also makes. It is deduped across requests, not just within one,
and `cache()` around it would do nothing.

**Call `setRequestLocale(lang)` in the layout _and in every page_.** Without
it next-intl resolves the locale dynamically and the shell cannot prerender —
the same failure the comments in `apartments/[id]/edit/page.tsx` and
`virtual-tour/edit/page.tsx` already document for their routes.

The layout alone is **not** enough, and getting that wrong is what produced

> Route "/[lang]/owner/dashboard/overview": Runtime data such as `cookies()`,
> `headers()`, `params`, or `searchParams` was accessed outside of
> `<Suspense>`.

Two things make that error hard to read. It is attributed to
`<NextIntlClientProvider>` in the **root** layout — that is where the delay
surfaces, not where the offending read is. And the runtime data it means is
**not** the cookies: `listMyListings()` inside a boundary is fine, verified by
bisection. It is `getTranslations()` in a segment that never pinned its
locale, so next-intl falls back to reading the request, and that read is
attributed to the enclosing render rather than to the `<Suspense>` the caller
sits inside.

Bisected against a live dev server (with the middleware gate lifted locally so
the route could be driven anonymously): a page with `<Suspense>` +
`getTranslations()` errors, the same page plus `setRequestLocale` is clean,
removing it again brings the error back. Cookie reads in a boundary are clean
either way.

**The rule for this repo:** a page whose subtree calls `getTranslations()` or
`useTranslations()` on the server must call `setRequestLocale(lang)` itself.
The build does not catch it — all six routes reported `◐` while the error was
firing on every request.

**Skeletons.** One per streamed region, mirroring the footprint it replaces:
the greeting keeps its current `h-9 w-72`, the stats grid gets four
`StatCard`-shaped tiles, the listing rows get a `min-h-36` row skeleton.

---

## Phase 1 — layout chrome

Each of the three is a `<Suspense>` whose **fallback is the same component
without its data**, not a bare skeleton block. Navigation stays usable from
the first paint and the numbers fill in behind it — the pattern
`server-owned-auth-hydration.md` §3a describes for `SiteHeader`.

```tsx
<Suspense fallback={<DashboardHeader name={null} />}>
  <DashboardHeaderSlot />
</Suspense>
```

- **`dashboard-header`** → Server Component. The greeting comes from
  `getMyProfile()`; `name={null}` renders today's skeleton. The "New listing"
  button is `router.push` today, so it becomes a `<Link>` and the file drops
  `"use client"` entirely. `useHydrated` and `useProfile` both go.
- **`dashboard-stats`** → async Server Component. `stat-card.tsx` is already
  a Server Component and doesn't change.
- **`dashboard-nav`** → keeps `"use client"` (it needs `usePathname` for the
  active state) but stops calling data hooks: it takes `counts` as a prop and
  renders the count slot empty when they haven't arrived. An async
  `DashboardNavSlot` server component supplies them.

---

## Phase 2 — the three listing tabs

**`listings-tab.tsx`** → async Server Component. It already takes `filter` as
a prop and does its own filtering; that logic moves as-is. The empty state and
the language-summary line (`writtenLocales` across the owner's whole set) are
static markup and render server-side unchanged. Each tab page wraps it:

```tsx
export default function OverviewPage() {
  return (
    <Suspense fallback={<ListingRowsSkeleton />}>
      <ListingsTab filter="all" />
    </Suspense>
  );
}
```

**`listing-row.tsx`** → Server Component. `useTranslations`, `useFormatter`
and `useMoney` all work there — that is what the "works in client and shared
(server-rendered) components" note in `hooks/use-money.ts` is about. `Image`,
`Badge` and `Link` are already server-safe. Two client leaves remain:

- **`listing-row-menu.tsx`** (exists) — drops the `onDelete` prop, takes
  `listingId` only, and calls `deleteListingAction` itself inside a
  `useTransition`, then `router.refresh()`. Failures get a sonner toast; today
  a failed delete is silent, since `use-listings`' `removeMutation` only rolls
  the cache back.
- **`listing-status-toggle.tsx`** (new) — takes `listingId` and `status`,
  holds `useOptimistic` for the pause/publish flip and keeps the
  `posthog.capture("listing_status_toggled")` call. The optimistic value
  reverts when the transition ends, which is exactly when `router.refresh()`
  has delivered the real one.

`hooks/use-listings.tsx` stays — `listing-form.tsx` still uses it for prefill
and for create/update. After this phase that is its only consumer.

---

## Phase 3 — tours

`owner-tours.tsx` fetches tours and the availability template, and
`owner-tour-card.tsx` becomes a Server Component. Accept / decline / propose
move into one island per card (`tour-actions.tsx`) calling
`acceptTourAction` / `declineTourAction` / `proposeTourTimeAction` directly.
`propose-time-modal.tsx` stays client, and `MessagingProvider` wraps
server-rendered cards as children — a client component may.

**No optimistic status flip here**, unlike the listing toggle. A tour's status
also shows in a `StatusTag` at the top of its card, which the server renders,
so an optimistic value in the button row would leave the badge and the buttons
disagreeing. These are one-at-a-time decisions rather than a switch someone
flicks back and forth: the buttons disable while the transition runs, and the
refreshed server render is what changes them.

Two things fell out that weren't in the original plan:

- **The grouping is pure, so it moved to `lib/tours.ts` and got a unit test**
  (`groupOwnerTours`, `occupiedSlotsExcluding`). Per `AGENTS.md` the services
  around it can't be unit-tested, which makes this the piece worth pinning —
  the sort is on the slot a tour *holds*, so a proposed reschedule sorts by
  its proposed time, and that is easy to break silently.
- **`propose-time-modal.tsx` lost two props and its auth dependency.** It took
  the owner's entire tour list plus `useUser()` purely to compute which slots
  were taken. The server already has both when it renders the card, so it
  passes `occupied: string[]` instead — and `listingTitle` rather than a whole
  `Listing`.

`hooks/use-owner-tours.ts` had no other consumer and is deleted.

---

## Phase 4 — availability

The week grid is genuinely stateful — 63 chips under a rapid pointer, three
presets — so `availability-editor.tsx` stays `"use client"` and keeps
react-query coalescing its optimistic writes. What changed is the start: it
takes a `seed` (`{ ownerId, template }`) that its page read on the server, so
the grid renders filled in the HTML instead of painting empty and correcting
itself once `useUser()` resolves.

The seed carries the **owner id as well as the week**, and that is the load-
bearing half: `useMyAvailability()` derived the id from `useUser()`, so
without it the query key isn't even known until after mount and no amount of
`initialData` would help. The mutations are unaffected either way — the
actions take the owner from the session, and the id here is only a cache key.

`hooks/use-availability.ts` stays: `book-tour-dialog.tsx` reads a *public*
owner's availability through it, which is a different concern. Both its
signatures gained an optional trailing argument, so that caller is untouched.

---

## Phase 5 — verify

- `pnpm build` — `/[lang]/owner/dashboard/*` should report `◐`, not `ƒ`. A `ƒ`
  means a boundary is drawn too wide and the shell went dynamic. ✅ all six
  dashboard routes report `◐`.

  **`◐` is necessary but not sufficient.** The blocking-route error in Phase 0
  fired on every request while the build reported `◐` for all six. A route
  that renders on the server needs to be *loaded* once, with the dev server's
  log watched — see `.next/dev/logs/next-development.log`.
- `pnpm lint`, `pnpm test` ✅ (545 unit tests), `pnpm test:e2e` ✅ (36 passed,
  8 skipped — the authed project, see below).
- `"use client"` in the dashboard went from ten files to six, and every one
  that remains is a real island: the row menu, the status toggle, the tour
  action row, the propose-a-time modal, the availability grid, and the nav
  (which needs `usePathname` and nothing else).
- This is a data-access change, and per `AGENTS.md` the unit suite
  deliberately does not cover `lib/services/**` or `lib/actions/**`.
  `e2e/auth-guard.spec.ts` only asserted the signed-out redirect, so
  `e2e/authed/dashboard.spec.ts` is added. It stays **read-only**, matching
  `authed/saved.spec.ts`'s rule about the shared Supabase project — so it
  covers the reads, not the write islands. Its load-bearing assertion fetches
  the page over HTTP with the session cookies and no JavaScript, and asserts
  the greeting and the nav labels are in that HTML: if the dashboard ever
  regresses to fetching itself after hydration, that fails.

**Still unverified:** the authed specs skip without `E2E_EMAIL` /
`E2E_PASSWORD` in `.env.local`, so no signed-in run has exercised the real
service → component path end to end.

What has been checked instead is the rendering itself, via a throwaway harness
route mounting the components with fixture data — which does execute them as
Server Components, something `pnpm build` does not (it prerenders the shell,
not the dynamic holes). Both passes came back with **zero console or hydration
errors**:

- Phase 1–2: `DashboardHeader`, `DashboardStats` and `ListingRow` — copy,
  VND prices, per-locale badges (`EN · VI` vs `EN`), both `null` fallback
  states — and the row menu island opening after hydration.
- Phase 3–4: all four tour statuses with the right action set each, the
  move-in/people/note blocks, the chat panels under `MessagingProvider`, the
  propose-a-time modal opening from a per-card island with the calendar
  correctly marking the seeded week's open days — and the availability grid
  rendering **pre-filled from its seed**, which is the whole point of phase 4.

---

## 3. What we are trading away

**Nav and stat counts stop updating optimistically.** Today the sidebar count
and the rows share one react-query cache, so pausing a listing moves the count
in the same frame. Server-side they update when `router.refresh()` lands — a
beat later. `router.refresh()` does re-render the layout, so they do update;
they just aren't instant.

**A tab switch no longer re-renders the layout.** That is unchanged in effect
from today (client navigation preserves layouts either way), but it is now the
reason the counts are as fresh as the last full load or refresh, rather than
the react-query cache being the reason.

**One `getUser()` per dashboard request.** `getSessionUser()` verifies against
the auth server rather than using `getClaims()`. Every Server Action on this
page already pays that, so the count doesn't rise — but it moves onto the
render path. If it shows up in a trace, the identity read can move to
`getClaims()`; anything authorizing a write keeps `getUser()`.

---

## 4. Two things that must not regress

**Owner listings stay unlocalized.** `listMyListings` deliberately skips
`localizeListings`, and the comment on `fetchMyListings` explains the stakes:
resolving copy here puts the English translation into the edit form of a
Vietnamese listing, and saving writes it back over the original. Moving the
read to the server must not "helpfully" add a `localizeListings` call.

**Services never take a user id.** Per `AGENTS.md`, the session decides whose
data this is. Server Components on this route call the services exactly as
they are — they do not pass `user.id` down from a page.

---

## 5. Follow-up, out of scope

`listing-form.tsx` gets its edit prefill by pulling the owner's entire list
through `useListings()` and calling `getById`. Once the dashboard no longer
needs that hook, the edit page could fetch the one listing server-side and pass
it in — but that route prerenders a static shell per id on purpose
(see its `generateStaticParams` comment), so it needs its own think.
