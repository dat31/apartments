# Renter-experience improvements — index

> Written 2026-07-09 from a full review of the app's current flows. One file
> per suggestion, ranked by impact. Each file explains the user flow first,
> then how it hooks into the existing code. None of these are started —
> pick one, read its file, then plan/implement.

## Current renter flow (baseline)

Landing (role chooser) → Browse `/apartments` (URL-driven filters, sort,
pagination) → Detail page (gallery, amenities, map, owner card, reviews) →
Book tour (calendar + owner slots, sign-in gate) → Saved `/apartments/saved`
(shortlist) → My tours `/tour` (day grouping, route planner, reschedule
accept/decline).

The core loop is solid. The gaps: **discovery by location**, **staying
informed without re-checking pages**, and **what happens after the tour**.

## High impact

1. [Map view on browse](01-map-view-browse.md) — list ⇄ map toggle on `/apartments`
2. [Tour status notifications](02-tour-status-notifications.md) — badge + email when an owner acts
3. [Saved-search alerts](03-saved-search-alerts.md) — "notify me when a new listing matches"
4. [Post-tour next step](04-post-tour-next-step.md) — "express interest" after a confirmed tour

## Medium impact, low effort

5. [Add-to-calendar for tours](05-tour-add-to-calendar.md) — `.ics` / Google Calendar link
6. ~~[Filter gaps](06-filter-gaps.md)~~ — **done** (PR #53): availability + min-area chips, "Newest" sort
7. ~~[Similar listings](07-similar-listings.md)~~ — **done** (PR #54): dedicated district/city query, ranked cards, streamed in its own Suspense boundary
8. ~~[Recently viewed](08-recently-viewed.md)~~ — **done** (PR #56): localStorage ring buffer, full-width compact strip above browse results, hydrated client-side via `useSyncExternalStore`
9. [Share listing](09-share-listing.md) — copy link / native share on detail

## Bigger bets

10. ~~[Compare saved homes](10-compare-saved-homes.md)~~ — **done** (PR #60): selection mode on Saved, URL-driven `/apartments/saved/compare?ids=…` column-per-home table (price, area, distance-from-you rows), guest-public by design
11. [Commute anchor](11-commute-anchor.md) — one pin, distance on every card
12. [Renter ↔ owner messaging](12-renter-owner-messaging.md) — per-tour message thread
13. [Cost transparency](13-cost-transparency.md) — deposit, utilities, lease terms on listings

## Suggested sequence

Map view (#1) → tour notifications (#2) → the small wins (#5, #6) → then
reassess. #12 (messaging) is the largest build and should come after the
loop-closing items.
