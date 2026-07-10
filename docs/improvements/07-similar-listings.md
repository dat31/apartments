# 7. Similar listings on the detail page

> **Status: ✅ completed 2026-07-10 (PR #54, branch `feat/similar-homes`).**
> Shipped a full-width "Similar homes" row below the detail layout. The picks
> come from a dedicated, per-listing Supabase query (`getSimilarListings`)
> scoped to the same district, broadening to the city only when the district
> can't fill the row, then ranked by likeness (type, price, beds, area) — not a
> scan of every active listing. Rendered as the exact browse `ListingCard`, and
> streamed in its own `<Suspense>` boundary (alongside the now-split owner card)
> so it never blocks the main content. Heading scopes to the district when
> enough same-district matches exist, else the city.

**Impact: medium, effort: small.** A detail page is where interest peaks —
and where the journey currently dead-ends if this particular home isn't
right. "Back to results" is the only continuation.

## The flow

1. Renter reads a detail page, decides the place isn't quite it (too
   expensive, wrong floor, already snapped up).
2. Below the reviews section: **"Similar homes"** — a row of 3 listing cards
   (the exact `ListingCard` used on browse, so save buttons, price
   formatting, and availability labels all come along for free).
3. Section heading is specific, not generic: *"More in Hải Châu"* when
   matches share the district, falling back to *"Similar homes in Da Nang"*.
4. Each card navigates to that detail page, which shows its own similar row —
   renters can hop laterally through comparable inventory without returning
   to browse.

## Similarity heuristic (keep it dumb)

Score all other **active** listings; take the top 3:

- same district: +3
- same type: +2
- price within ±25%: +2
- beds within ±1: +1

Exclude the current listing and (ideally) other listings by the same owner
from dominating — cap at 2 per owner. No embeddings, no ML; with the current
inventory a transparent scorer is better and debuggable.

## Integration points

- **Data:** `getSimilarListings(listing)` in `lib/services/listings.ts` runs a
  dedicated, per-listing Supabase query — active listings in the same district,
  broadening to the same city only when the district can't fill the row — then
  ranks the candidates and returns the top 3. It is `"use cache"`d and tagged
  `similar:<id>` (plus the shared `listings` tag), so it refreshes whenever a
  listing changes, and it reads only the relevant slice rather than scanning
  every active listing. Called server-side in `DetailContent`
  (`apartments/[id]/components/detail-content.tsx`) — in parallel with the
  owner load — and passed to a small presentational component.
- **Streaming:** the detail page already streams below a Suspense boundary;
  the similar row lives inside the same boundary (it needs no extra
  round-trips) or its own — same boundary is simpler.
- **Cards:** `components/listing-card.tsx` + `listing-card-link.tsx` as-is.

## Scope notes

- 3 cards, one row, no carousel, no pagination.
- "Back to results" (`back-to-results.tsx`) stays — these solve different
  intents (resume my search vs. explore alternatives).
