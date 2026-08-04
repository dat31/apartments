# Server-owned auth — retiring `useHydrated()`

> Written **2026-08-03**. Design only — nothing here is built. Comes out of a
> review of the `useHydrated()` gate added to `listings-tab.tsx` during the
> listing-translations work, which turned into a review of all eight call
> sites. The conclusion: the gate is a band-aid over one architectural
> decision, and Next 16's Cache Components already gives us the real fix.

---

## 1. The immediate finding: the `listings-tab.tsx` gate is a no-op

The shape that prompted this:

```tsx
const hydrated = useHydrated()
...
if (!ready) return null;
if (shown.length === 0) { return <empty state/> }   // ungated
return hydrated && ( <div>…</div> )                  // gated
```

Two things are wrong with it as a fix.

**It guards one of three return paths.** The `!ready` and empty-state branches
render before the gate is reached, so a mismatch in either would sail past it.
It also returns `false` from a component rather than `null`.

**It cannot change anything.** `ready` is `!userPending && !query.isLoading`
(`hooks/use-listings.tsx`). During SSR both are pending, so the component
renders `null`. During the hydration render the react-query cache is empty, so
both are *still* pending and it renders `null` again. There is no reachable
state where the server emits the list and the first client render doesn't —
`hydrated` is false exactly when `ready` is already false.

The mismatch that was actually observed on that page came from a sibling:
`dashboard-header.tsx` baked `"Welcome back, Host"` into the static HTML and
swapped in the owner's real name on hydration. That one is real, and is fixed
in the same change. The `listings-tab.tsx` hunk should simply be dropped.

---

## 2. The systemic cause

`useHydrated()` is in eight places today:

| File | Gated on |
|---|---|
| `components/site-header.tsx` | auth (`isSignedIn`) |
| `components/messaging/unread-badge.tsx` | unread count |
| `components/messaging/message-owner-button.tsx` | auth |
| `app/[lang]/(app)/owner/[id]/components/write-review-button.tsx` | auth (`isSelf`) |
| `app/[lang]/(app)/apartments/[id]/components/book-tour-button.tsx` | active tour |
| `app/[lang]/(app)/owner/dashboard/components/dashboard-header.tsx` | profile |
| `app/[lang]/(app)/owner/dashboard/components/listings-tab.tsx` | — (no-op, see §1) |
| `hooks/use-saved.ts` | saved shortlist |

and the same fix keeps recurring in the log — `#36` (book-tour CTA), `#92`
(saved shortlist), now `dashboard-header`. All of it traces to one decision:

**The server never resolves auth for rendering.** `app/[lang]/(app)/layout.tsx`
reads no cookies, so every route prerenders as anonymous. Identity — and
everything keyed off it: profile, saved ids, listings, unread count, active
tour — arrives only through react-query in the browser. Any client component
that renders real state on its *first* client render therefore disagrees with
the HTML it is hydrating into. `useHydrated()` resolves that by forcing the
first client render to also be anonymous, then revealing on the second.

This was a deliberate trade (see the comment in `site-header.tsx:32-37`, and
`messaging-nav-badge.md`'s "the header is statically prerenderable"
constraint). What it costs:

- **Unenforceable.** Every new auth-aware component has to rediscover the
  rule, and it is easy to half-apply — §1 is the proof.
- **A wasted round trip.** `proxy.ts` already refreshes *and verifies* the
  session on the same request (`lib/supabase/middleware.ts`, `getClaims()`).
  The server knew who the visitor was and threw it away, so signed-in users
  always pay a skeleton → content double paint.
- **It leaks into data hooks.** `hooks/use-saved.ts:79-82` overrides the query
  result with an empty array plus a paragraph explaining selective hydration —
  purely so a late-hydrating Suspense boundary doesn't read a cache that an
  earlier-hydrating boundary already filled. That is a rendering concern that
  has ended up inside a data hook.
- **Authenticated content is invisible in the HTML** — nothing for a crawler
  or a no-JS client, and the reveal lands after hydration rather than with the
  stream.

---

## 3. The approach

Both halves already exist and are simply not connected:

- `getSessionUser()` — `lib/services/session.ts`, `react.cache()`-memoized per
  request, verified via `getUser()`.
- `cacheComponents: true` — `next.config.ts`.

Cache Components *is* the server-side version of what `useHydrated()` fakes: a
static shell with a streamed dynamic hole. The difference is that the server
and the client agree by construction instead of by convention.

### 3a. Server-owned user, seeded into react-query

Put a **tight** Suspense boundary around the auth-dependent island — not
around whole pages, or public routes get pulled dynamic for no reason.

```tsx
// app/[lang]/(app)/layout.tsx
<Suspense fallback={<SiteHeader user={null} />}>
  <SiteHeaderSlot />
</Suspense>

// server component
async function SiteHeaderSlot() {
  return <SiteHeader user={await getSessionUser()} />;   // SiteHeader stays "use client"
}
```

Then hand that user down a context and feed it to `useUser()` as
`initialData`:

```tsx
// hooks/auth/use-user.ts
export function useUser() {
  const serverUser = useContext(ServerUserContext);   // undefined ⇒ no seed, today's behaviour
  return useQuery<User | null>({
    queryKey: authKeys.user,
    queryFn: …,
    staleTime: Infinity,
    initialData: serverUser,
  });
}
```

With `initialData` present, `isPending` is false on the first render on *both*
sides. Every `ready` gate downstream flips at the same moment on the server
and in the browser, so there is nothing to mismatch — and the signed-in header
ships inside the HTML instead of appearing after hydration. The Suspense
fallback is the same signed-out shell we render today, so anonymous visitors
are unaffected and the shell outside the boundary stays prerendered.

`AuthListener` in `components/providers.tsx` keeps its job unchanged: it still
writes auth changes into the cache. It just no longer has to be the *first*
thing that puts a user there.

### 3b. Seed the queries that hang off identity

Prefetch on the server and wrap in react-query's `HydrationBoundary`:
profile, saved ids, unread count, active tour. Each in its own Suspense
boundary so a slow one doesn't hold up the rest (same pattern as the
similar-listings slot from PR #54).

Where a query is *not* prefetched, both sides start from an empty cache and
render the same loading state — still mismatch-free, just without the win.

### 3c. Delete the gate

Remove `hooks/use-hydrated.ts` and all eight call sites. Once it is gone, an
eslint `no-restricted-imports` entry keeps it gone.

---

## 4. Migration order

Each step is independently shippable and removes call sites as it lands.

1. **`ServerUserContext` + `initialData` + the layout Suspense boundary.**
   Drops the gate from `site-header.tsx`, `message-owner-button.tsx`,
   `write-review-button.tsx`.
2. **Seed the profile** (prefetch `getMyProfile`). Drops
   `dashboard-header.tsx`'s gate; the greeting renders server-side, so the
   `h-9` skeleton it currently reserves goes away with it.
3. **Seed the saved shortlist.** The hardest one — but `use-saved.ts`'s empty
   array override and its comment dissolve, because the cache now holds
   exactly what the server rendered.
4. **Seed unread count + active tour.** Drops `unread-badge.tsx` and
   `book-tour-button.tsx`. Check this one against
   `chat-implementation-plan.md` §3 — the constraint is *no websocket while
   browsing*, and a server-side `getUnreadCount` in a Suspense hole respects
   that (`messaging-nav-badge.md` rejected a server-rendered count only
   because it would have forced the whole layout dynamic; a tight boundary
   under Cache Components does not).
5. **Delete `hooks/use-hydrated.ts`** + add the lint rule.

Independently of all of the above: **drop the `listings-tab.tsx` hunk** (§1).

---

## 5. What we are trading away

Honest accounting, because §2's decision was made for a reason:

- **The `(app)` layout stops being fully static.** The shell outside the
  boundary still prerenders; the header slot becomes per-request. On a route
  that is otherwise cached this adds one `getSessionUser()` call — a JWT
  verification, already paid for in middleware on the same request.
- **Boundary discipline matters.** A boundary drawn too wide pulls a public
  page (browse, listing detail) dynamic. Keep them around the islands:
  header, save button, book-tour CTA, message-owner button.
- **`getSessionUser()` uses `getUser()`, not `getClaims()`.** That is a
  network call to the auth server. If it shows up in the trace, the read path
  can move to `getClaims()` (local asymmetric verification, what middleware
  already does) — but only for the *identity* read; anything that authorizes a
  write keeps `getUser()`.

## 6. The cheaper alternative, and why it isn't the recommendation

Keep everything client-only, but replace the eight hand-rolled gates with one
`<ClientOnly fallback={…}>` wrapper so the pattern cannot be half-applied.

That makes the codebase consistent, not correct. The double paint stays, the
server still discards a session it already verified, and every new auth-aware
component still has to remember a rule. Worth doing only if §3 is blocked on
something else.
