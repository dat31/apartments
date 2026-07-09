# 7. Similar listings on the detail page

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

- **Data:** `getActiveListings()` in `lib/services/listings.ts` is already
  cached (`"use cache"`, `cacheTag("listings")`) — the similar-row
  computation is a cheap in-memory scan on top of it, done server-side in
  `DetailContent` (`apartments/[id]/components/detail-content.tsx`) and
  passed to a small presentational component.
- **Streaming:** the detail page already streams below a Suspense boundary;
  the similar row lives inside the same boundary (it needs no extra
  round-trips) or its own — same boundary is simpler.
- **Cards:** `components/listing-card.tsx` + `listing-card-link.tsx` as-is.
- **Seed fallback:** detail pages for seed ids (`l1`…) should compute
  similarity over the same pool the page itself came from — mirror the
  existing "Supabase, else seed" fallback at the top of `DetailContent`.

## Scope notes

- 3 cards, one row, no carousel, no pagination.
- "Back to results" (`back-to-results.tsx`) stays — these solve different
  intents (resume my search vs. explore alternatives).
