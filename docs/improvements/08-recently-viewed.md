# 8. Recently viewed

> **Status: ✅ completed 2026-07-12 (PR #56, branch `claude/next-docs-review-weolfm`).**
> Shipped a localStorage ring buffer (`hooks`-free lib under `apartments/lib`,
> 12 ids, deduped, most-recent-first) written on mount by a null-rendering
> `RecordRecentlyViewed` island in `DetailView`, so the detail page stays
> server-first. The browse page shows a full-width strip above the filters +
> results (a client island below the static shell) that hydrates ids the same
> way the guest Saved page does — a browser Supabase read mapped with
> `toListing`, seed ids falling back to `lib/data/listings` — and reads storage
> via `useSyncExternalStore` (no setState-in-effect; the Clear link is reactive
> and syncs across tabs). Cards are a dedicated compact variant (price, title,
> district — no save button) matching the Claude Design spec, which showed the
> full buffer in a horizontal scroll rather than capping at ~6. Inactive or
> removed ids drop out on hydration.

**Impact: medium, effort: small.** Apartment hunting is a multi-session
compare loop — renters open a dozen detail pages across days and lose track
of "that loft with the terrace I saw on Tuesday". Saving is deliberate;
viewing history is free.

## The flow

1. Renter opens any detail page → its listing id is pushed to the front of a
   small **localStorage ring buffer** (say, 12 ids, deduped, most recent
   first). No sign-in required, no server write.
2. On `/apartments`, when the buffer has ≥1 entry (excluding whatever page
   they're on), a compact horizontal strip renders **above the results**:
   *"Recently viewed"* + small listing cards, scrollable on mobile.
3. Tapping a card returns to that detail page. From there, the existing save
   button is one tap — recently-viewed is deliberately a feeder for the
   shortlist, not a second shortlist.
4. A quiet "Clear" link empties the buffer. Listings that are no longer
   active simply drop out when hydration finds no matching row.

## Why localStorage, not the DB

- Works for guests — who are exactly the users without a Saved list yet.
- Zero schema, zero RLS, zero sync questions. The precedent already exists:
  guest shortlists live in localStorage today (`hooks/use-saved.ts`).
- Cross-device history isn't worth the complexity for a compare aid.

## Integration points

- **Recording:** a tiny client component mounted from the detail page
  (`apartments/[id]/components/` — it can live inside `DetailView`'s tree)
  that writes on mount. It renders nothing; the page stays server-first
  (matches the repo's server-first-rendering conventions).
- **Rendering:** hydrate ids → listings client-side the same way the guest
  Saved page does — fetch by id via the browser Supabase client and
  `toListing` from `lib/services/listings-map.ts` (seed ids fall back to
  `lib/data/listings.ts`, mirroring `DetailContent`'s fallback).
- **Cards:** reuse `components/listing-card.tsx` (or the skeleton
  `skeleton-listing-card.tsx` while hydrating); the strip is a client
  island below the browse page's static shell, so the shell stays
  prerenderable.
- **Placement:** `apartments/components/browse.tsx`, above results, below
  the filter/sort header row. Could also appear on the landing showcase
  later — start with browse only.

## Scope notes

- Don't intersect this with remember-search or saved searches; it's a
  separate, dumber memory with a different job.
- Cap the strip at ~6 visible cards even if the buffer holds 12.
