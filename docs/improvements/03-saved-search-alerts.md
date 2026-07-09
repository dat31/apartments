# 3. Saved-search alerts

**Impact: high (retention).** The browse page already remembers the renter's
last search (`remember-search.tsx`, `schemas/search-memory.ts`) — but it only
replays it on return. The renter still has to keep coming back to check for
new inventory. Flip that: let new inventory come to them.

## The flow

1. Renter dials in a search — "Apartment, Hải Châu, ≤ $2,000, pets" — and
   sees 3 results, none quite right.
2. Above the results (or in the filters panel footer) a button appears once
   ≥1 filter is active: **"Save this search"**. Signed-out renters get the
   same sign-in gate the book-tour dialog already uses.
3. A small dialog confirms: auto-generated name from the filters
   ("Apartments in Hải Châu under $2,000"), editable, plus a toggle
   **"Email me when new homes match"**.
4. Saved searches live as a chip row on `/apartments` (and/or a small section
   on the Saved page — chips on browse is the better first cut since that's
   where searching happens). Tapping a chip applies the whole filter set —
   which is just navigating to its stored URL query string.
5. When an owner publishes a listing that matches a saved search, the renter
   gets an email: new listing card + "See all matches" linking to the saved
   search URL. Digest per listing-publish event is fine at current volume;
   batching is a later concern.
6. Chips have an ✕ to delete, and the dialog can toggle alerts off without
   deleting the search.

## Why this beats remember-search

Remember-search helps the renter *resume*; saved searches let them *stop
checking*. In a market where good listings go fast, "first to know" is the
single most valuable thing the app can offer a renter.

## Integration points

- **Filters are already fully URL-serializable** (`apartments/lib/query.ts`
  — `parseFilters`/`parseSort`). A saved search is literally
  `{ id, user_id, name, query_string, alert: boolean, created_at }`. No new
  filter model needed.
- **Matching on publish:** the owner publish path (listing create/edit →
  `status: "active"`) is the trigger point. A Supabase trigger → Edge
  Function loads saved searches with `alert = true`, runs the same filter
  predicate server-side, and emails matches. The predicate logic in
  `filterListings()` is small and pure — port it or share it.
- **UI slots in** next to `remember-search.tsx` in
  `apartments/components/`; remember-search itself stays (they solve
  different problems, and a "save this search?" nudge can piggyback on it).
- Email infra is shared with #2 (tour notifications) — build #2 first so the
  provider setup is done.

## Scope notes

- Guests: don't build localStorage saved searches — alerts need an email
  anyway, so gating on sign-in is honest and simpler.
- Cap saved searches per user (e.g. 10) to keep the publish-time matching
  loop trivially cheap.
