# 4. Post-tour next step ("express interest")

**Impact: high (converts tours into outcomes).** Today the renter journey
dead-ends after a tour: browse → save → tour → …nothing. There is no way to
say "I want this place" inside the app, so the handoff to an actual rental
happens (or doesn't) invisibly, off-platform.

## The flow

1. Renter completes a tour. Once the tour's date/time is in the past and its
   status is `confirmed`, its card on `/tour` (history section) grows a
   primary action: **"I'm interested"** — plus a quiet secondary
   "Not for me" that just archives the card visually.
2. Tapping "I'm interested" opens a small dialog prefilled from what the app
   already knows: the move-in date and party size they entered when booking
   (`moveIn`, `people` on the tour row), plus a free-text message
   ("We'd love to take it from Aug 1…").
3. Submit creates an **application/interest record** tied to the tour and
   listing. The renter's card now shows "Interest sent ✓ — waiting for
   {owner}".
4. Owner side: the dashboard tours page shows these as a distinct state
   ("interested") with the renter's message and move-in date. Owner can
   respond **Accept** ("let's proceed — here's my contact / next steps") or
   **Pass** (with an optional canned reason).
5. Renter sees the owner's response on `/tour` (and via #2's notification
   channel). On accept, show the owner's contact info / next-steps text —
   the app's job ends at a successful introduction; leases and deposits stay
   out of scope.

## Why this matters

- The marketplace can't tell which tours led anywhere; this makes the
  funnel's last step observable (and later, rankable — "responsive owner").
- For renters, it removes the awkward "so… how do I actually get this
  apartment?" moment. There is exactly one obvious next action after every
  tour.

## Integration points

- **Tour cards & status machinery:** `tour/components/renter-tour-card.tsx`
  and `hooks/use-my-tours.ts` already render per-status actions
  (accept/decline reschedule) — "interested" is one more action + state on
  the same card, not a new page.
- **Data:** either a new `applications` table
  (`tour_id, listing_id, renter, message, move_in, status`) or new statuses
  on `tours`. A separate table is cleaner — a tour is an appointment, an
  application is a decision — and keeps the `tours` status enum meaning one
  thing. Schema mirror lives in `schemas/tour/` sibling `schemas/application/`.
- **Owner dashboard:** `owner/dashboard/tours` already lists tours per
  status; add an "Interested" tab/section using the same card grammar.

## Scope notes

- Explicitly *not* building: lease documents, payments, deposits, identity
  verification. The deliverable is a structured introduction.
- Guard rails: one active interest per tour; renter can withdraw; owner
  accept doesn't auto-decline other renters' interests (owners may juggle).
