---
name: server-first-rendering
description: Build or refactor App Router UI so it renders on the server by default, with the smallest possible client islands. Use when asked to make a page/feature server-side, reduce "use client", move filtering/sorting/pagination to the server, drive state from the URL, add Suspense streaming with skeletons, or split a client-heavy component into server + client parts in this Next.js 16 + React 19 repo.
---

# Server-First Rendering (RSC)

How to make a feature render on the server as much as possible, keeping `"use client"` confined to leaf interactivity. Default to a Server Component; reach for a client island only when something needs a hook, an event handler, or a browser API.

Reference implementation (the apartments browse page):
[browse.tsx](../../../app/(app)/apartments/components/browse.tsx) ·
[listing.tsx](../../../app/(app)/apartments/components/listing.tsx) ·
[lib/query.ts](../../../app/(app)/apartments/lib/query.ts) ·
[filters-panel.tsx](../../../app/(app)/apartments/components/filters-panel.tsx) ·
[use-filter-nav.ts](../../../app/(app)/apartments/components/use-filter-nav.ts) ·
[listing-card.tsx](../../../components/listing-card.tsx) ·
[save-button.tsx](../../../components/save-button.tsx)

## Core principles

1. **Server by default.** A file with no `"use client"` is a Server Component. Keep `page.tsx`, layout/orchestration, data shaping, lists, and list items on the server. Add `"use client"` only at the leaf that genuinely needs `useState`/`useEffect`/`useRef`, an `onClick`/`onChange`, `useRouter`/`useSearchParams`, or `window`/`localStorage`.
2. **Push the boundary down, not up.** When a component is "mostly static with one interactive bit," don't mark the whole thing client. Extract the interactive bit into its own client component and keep the parent on the server. A server component can freely render client components as children.
3. **URL is the source of truth for view state.** Filters, sort, and pagination live in `searchParams`, not React state. The server reads them; client islands write them. This makes state shareable, bookmarkable, back-button-friendly, and removes a whole class of `useState`.
4. **Stream the dynamic part.** Wrap the async/dynamic region in `<Suspense>` with a skeleton fallback so the static shell renders instantly and the list streams in.

## Patterns

### page.tsx awaits searchParams (Next 16)

`searchParams` is a Promise. Keep the page thin — await and hand off.

```tsx
// page.tsx (Server Component)
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <Browse searchParams={await searchParams} />;
}
```

`type SearchParams = Record<string, string | string[] | undefined>`.

### Parsing + query logic in a plain server module

Put pure functions (`parseFilters`, `parseSort`, `parsePage`, `filterListings`, derived option lists, active-count) in `lib/<feature>.ts`. No `"use client"`, no React. The server orchestrator and the streamed list both import them; the URL stays the single source of truth. See [lib/query.ts](../../../app/(app)/apartments/lib/query.ts).

### Suspense + skeleton, re-keyed on the query

The orchestrator (server) renders the static shell and wraps only the dynamic list:

```tsx
<Suspense key={JSON.stringify(searchParams)} fallback={<SkeletonGrid count={6} />}>
  <Listing searchParams={searchParams} />
</Suspense>
```

- Make the list an **`async` Server Component** so Suspense actually suspends and streams.
- **Re-key the boundary on `searchParams`** so the skeleton re-shows while the new result set streams on each filter/sort/page change.
- The fallback should mirror the real layout's footprint (reuse the route's existing skeleton component).

### Client islands write to the URL

Centralize query-string writes in one client hook so islands stay tiny. See [use-filter-nav.ts](../../../app/(app)/apartments/components/use-filter-nav.ts):

```tsx
"use client";
export function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setParams = useCallback((patch, opts) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) v == null || v === "" ? params.delete(k) : params.set(k, v);
    if (opts?.resetPage !== false) params.delete("page"); // filter change invalidates page
    router.push(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);
  return { searchParams, setParams, reset: () => router.push(pathname, { scroll: false }) };
}
```

- `{ scroll: false }` to avoid jumping on filter changes; pagination opts out of the page-reset and scrolls to top itself.
- **Debounce text inputs** (search, min/max price) before writing — keep a local controlled value, push after ~350ms, and resync when the URL changes underneath (reset/back). See [filters-panel.tsx](../../../app/(app)/apartments/components/filters-panel.tsx).
- Drop a param (`set …: null`) when it equals its default (`type=All`, `sort=featured`, `page=1`) to keep URLs clean.
- **Pagination** uses real `href`s (crawlable/middle-clickable) plus an `onClick` that `preventDefault`s and routes via the hook.

### Keep clickable cards on the server (stretched link)

A whole-card link normally forces `useRouter` and `"use client"`. Instead, keep the card a Server Component and overlay a stretched `<Link>`; raise interactive islands above it.

```tsx
// listing-card.tsx — Server Component
<Card className="group relative ...">
  <Link href={href} aria-label={title} className="absolute inset-0 z-10 focus-ring" />
  {/* media / text render beneath the transparent link (z auto) → click navigates */}
  <SaveButton id={id} /> {/* client island, absolute z-20 → above the link */}
</Card>
```

- The link is the only positioned `z-10` element, so it sits above the static (`z auto`) media/text — those areas navigate.
- Interactive islands get `z-20` and `e.preventDefault(); e.stopPropagation()` so their clicks stay local.
- The anchor gives native keyboard focus/Enter for free — no `tabIndex`/`onKeyDown`.

### Self-contained client islands (don't thread state props)

Shrink the client boundary by giving an island the minimal identifier and letting it own its own state/hook, instead of threading `value`/`onChange` from a client parent. [save-button.tsx](../../../components/save-button.tsx) takes only `id` and calls `useSaved()` itself — so [listing-card.tsx](../../../components/listing-card.tsx) and every list around it (browse, saved, owner profile) stay server-renderable and prop-free. This also removes a client parent that previously existed only to fan `saved`/`onToggleSave` down.

## Refactor checklist (client-heavy → server-first)

1. **Find the real interactivity.** List every hook / handler / browser API in the component. Everything else can be server.
2. **Lift view state into the URL.** Replace `useState` for filters/sort/page with `searchParams` reads (server) + a client nav hook (writes).
3. **Move pure logic to `lib/<feature>.ts`** (parse + filter + derive). Import from server components.
4. **Split the leaves into client islands** — one per interactive concern (filter panel, sort menu, pagination, empty-state reset, save button). One component per file.
5. **Make the list an `async` Server Component** and wrap it in `<Suspense>` with a re-keyed skeleton fallback.
6. **Convert the orchestrator + list item to Server Components** (stretched-link for navigation; islands for the interactive bits).
7. **Keep `page.tsx` thin** — `await searchParams`, render the orchestrator.
8. **Verify** with `npm run build` (`/route` should report Partial Prerender `◐` — static shell + streamed dynamic content) and `npm run lint`.

## Anti-patterns

- ❌ `"use client"` at the top of a page/orchestrator/list to satisfy one button. Extract the button.
- ❌ Mirroring URL state into `useState` and syncing with effects. Read `searchParams` directly on the server.
- ❌ Whole-card `onClick={() => router.push()}`. Use a stretched `<Link>`.
- ❌ Threading `value`/`onToggle` callbacks down to a leaf when the leaf could own its own hook.
- ❌ `<Suspense>` around a synchronous component (never suspends) or without re-keying (skeleton won't re-show on navigation).
- ❌ Writing the URL on every keystroke. Debounce text inputs.

## Definition of done

- The route builds as Partial Prerender (`◐`) — static shell, dynamic list streamed.
- `"use client"` appears only on true leaf islands; orchestrator, list, and list item are Server Components.
- Filter/sort/pagination state lives entirely in the URL; no `useState` mirrors it.
- Pure parse/filter logic sits in `lib/<feature>.ts` with no React import.
- `npm run build` and `npm run lint` pass.
