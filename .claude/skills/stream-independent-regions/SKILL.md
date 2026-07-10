---
name: stream-independent-regions
description: Split a page's independent data fetches into per-region Suspense boundaries so slow/below-the-fold sections don't block the main content. Use when a Server Component fetches several sources and passes them all down, when a page waits on its slowest query, or when asked to defer/stream a section (similar items, related content, an owner/author card, recommendations, comments) in this Next.js 16 + React 19 repo.
---

# Stream Independent Regions (per-region Suspense)

When one Server Component fetches several independent things and passes them all down, the whole subtree blocks on the **slowest** fetch — the fast, above-the-fold content waits on a slow, below-the-fold query. Fix it by pushing each independent fetch *into the component that renders it* and wrapping that component in its own `<Suspense>`. The orchestrator awaits only what the primary content needs (often just the one entity the page is about), and each region streams in on its own.

This is the sibling of [server-first-rendering](../server-first-rendering/SKILL.md): that skill streams **one** re-keyed list; this one streams **several independent regions** of a single page in parallel.

Reference implementation (apartment detail page):
[detail-content.tsx](../../../app/[lang]/(app)/apartments/[id]/components/detail-content.tsx) ·
[detail-view.tsx](../../../app/[lang]/(app)/apartments/[id]/components/detail-view.tsx) ·
[similar-homes.tsx](../../../app/[lang]/(app)/apartments/[id]/components/similar-homes.tsx) ·
[owner-card.tsx](../../../app/[lang]/(app)/apartments/[id]/components/owner-card.tsx) ·
[lib/services/listings.ts](../../../lib/services/listings.ts)

## Core principle

Co-locate the fetch with the render. A self-fetching `async` Server Component + its own `<Suspense>` beats an orchestrator that `Promise.all`s everything and threads resolved objects down. The orchestrator returns as soon as the primary entity resolves; secondary regions paint skeletons and stream in independently.

## When to split a region out

Split when **all** hold:

- **Isolated (or cheaply decoupled).** The data is used in one cohesive section, or its couplings can be cut. In the reference, `owner` was woven through two host cards *and* `<Reviews>` — but Reviews only used it as a truthiness guard for a link, so dropping that guard decoupled it. Weigh the untangling cost against the win.
- **Independent of the primary content.** The main content can render fully without it (below the fold, sidebar, a related-items row).
- **Slow or uncached.** A fresh multi-query read is the biggest win. Cached (`"use cache"`) or synchronous data gives little — split it only if it's also cleanly isolated (see the owner card: cheap, but split anyway because it was self-contained and the code got simpler).

**Don't split** data the primary content genuinely needs to render (it has to be awaited anyway), or data still threaded through many places where cutting the couplings would be a net complexity loss.

## Mechanics

### Self-fetching async Server Component

The region owns its query instead of receiving a prop. Because it's `async`, it **cannot use the `useTranslations` hook** — use `await getTranslations(...)` instead. Run the query and translations together:

```tsx
// similar-homes.tsx — async Server Component, owns its data
export async function SimilarHomes({ listing }: { listing: Listing }) {
  const [t, { picks, districtScoped }] = await Promise.all([
    getTranslations("detail.similar"),
    getSimilarListings(listing), // dedicated, cached service query
  ]);
  if (!picks.length) return null;
  // …render
}
```

### Wrap each region, ship a footprint-matching skeleton

Export a skeleton next to the component and wrap the region where it renders. A Server Component (like `DetailView`) can render `<Suspense>` around an async child directly:

```tsx
<Suspense fallback={<SimilarHomesSkeleton />}>
  <SimilarHomes listing={listing} />
</Suspense>
```

The skeleton must mirror the real layout's footprint (reuse existing skeleton pieces — e.g. `SkeletonListingCard`) so nothing shifts when content lands. Note: `<Suspense>` needs `import { Suspense } from "react"`.

### The orchestrator stops awaiting the region

Remove the fetch and the resolved prop from the parent; pass only the identifier the region needs (`listing`, an id). In the reference, `DetailContent` dropped both `getSimilarListings` and `getOwnerProfile` and now awaits only `getListingById` (the entity the page is about) plus the auth check.

### Rendered in several positions? Each gets its own Suspense

The owner card renders twice (inline on mobile, sticky sidebar on desktop). Each usage has its own `<Suspense>`; the underlying `"use cache"` service call dedups the query, so two boundaries ≠ two DB reads.

### Cache lives in the service, not the component

Keep `"use cache"` + `cacheTag` on the service function (`getSimilarListings`, `getOwnerProfile`) so it's shared and invalidatable. The component stays a thin async wrapper. This also means a delay added *inside the component* fires every render, while one inside the cached service only fires on a cache miss — which matters for testing (below).

## Testing the skeletons

Preview the fallbacks with a temporary delay **in the component** (outside the cache boundary, so it fires on every load). Stagger delays across regions to watch them stream independently:

```tsx
// TEMP: preview the Suspense skeleton — remove before merge.
await new Promise((r) => setTimeout(r, 2000));
```

Remove all TEMP delays before committing (`grep -rn "TEMP\|setTimeout"` the feature dir). Use a real (uuid) entity id so cached queries actually run.

## Refactor checklist (blocking orchestrator → streamed regions)

1. **List the orchestrator's fetches.** Mark which the primary content needs vs. which feed an isolated/secondary region.
2. **For each secondary region:** move its fetch into a self-fetching `async` Server Component; swap `useTranslations` → `getTranslations`.
3. **Cut weak couplings** that force the parent to keep fetching (e.g. a truthiness-only prop → drop it / render unconditionally).
4. **Wrap each region in `<Suspense>`** with a skeleton that matches its footprint; export the skeleton alongside the component.
5. **Strip the fetch + resolved prop from the orchestrator;** pass only ids/primitives. It should await only the page's core entity.
6. **Keep `"use cache"` + `cacheTag` on the service fn** so multiple boundaries dedup.
7. **Verify** with `npm run build`, `npx tsc --noEmit`, and `npm run lint`; preview skeletons with a TEMP staggered delay, then remove it.

## Anti-patterns

- ❌ Orchestrator `Promise.all`s independent regions and passes resolved objects down — the whole subtree blocks on the slowest.
- ❌ Awaiting a region's data in the parent "just for one boolean/label," keeping the blocking fetch alive. Cut the coupling instead.
- ❌ Skeleton that doesn't match the real footprint → layout shift when it streams in.
- ❌ Putting the artificial test delay in the `"use cache"` service (only fires on cache miss) instead of the component.
- ❌ Splitting cheap cached/synchronous data that's woven through many spots — the untangling costs more than it saves.
- ❌ Leaving a `useTranslations` hook in a component you just made `async` (hooks can't run in async components) — use `getTranslations`.

## Definition of done

- The orchestrator awaits only the page's core entity; secondary regions self-fetch.
- Each independent region has its own `<Suspense>` + footprint-matching skeleton and streams in separately.
- `"use cache"` + `cacheTag` stay on the service functions; repeated boundaries dedup.
- No TEMP delays remain; `npm run build`, `tsc --noEmit`, and `npm run lint` pass.
