# 2. Tour status notifications

**Impact: high.** When an owner confirms, declines, or proposes a new time,
nothing tells the renter. They only find out by re-opening `/tour`. For a
time-sensitive event (a viewing appointment) this is the app's biggest gap.

## The flow

### In-app (build first)

1. Renter books a tour and goes about their day, browsing other listings.
2. Owner confirms the tour from their dashboard.
3. Next time the renter loads any page, the **"My tours" nav item shows a
   count badge** — "tours that changed since I last looked": newly
   `confirmed`, `declined`, or `reschedule` proposals. `reschedule` is the
   loudest state since it needs a decision (the `/tour` page already sorts it
   first — this badge extends that same priority out to the header).
4. Renter opens `/tour`; changed tours carry a subtle "updated" marker; the
   badge clears (persist a `lastSeenAt` per tour or a single page-visit
   timestamp — single timestamp is simpler and good enough).

### Email (build second)

1. On any owner action that changes a tour's status, an email goes to
   `renter_email` (already stored on the `tours` row): "Your tour of
   *Garden loft by the Hàn River* is confirmed — Sat Jul 12, 10:00", with a
   link to `/tour`. Reschedule emails link straight to the accept/decline
   card.
2. Localize with the renter's locale (store it on the tour row at booking
   time, or on the profile) using the existing `messages/` + next-intl
   server-side machinery.

## Why this closes the loop

Booking → owner action → renter response (especially for reschedules) is a
three-step handshake. Today steps 2→3 rely on the renter polling the page.
Every hour of delay is an hour the owner's slot sits unconfirmed — bad for
both sides of the marketplace.

## Integration points

- **Status data already flows:** `hooks/use-my-tours.ts` reads the renter's
  tours; the badge is a cheap derived count from the same query, surfaced in
  `components/site-header.tsx` / `components/mobile-nav.tsx`.
- **Owner actions** already mutate the `tours` table (see
  `hooks/use-owner-tours.ts` and the dashboard tours page) — the email hook
  is a Supabase **database webhook / trigger → Edge Function** on
  `tours.status` updates. No new client code paths.
- Sending email needs a provider (Resend is the usual Supabase pairing) —
  this is the only new external dependency in the whole improvements list,
  so the in-app badge ships first and is independently valuable.

## Scope notes

- Don't build a generic notifications center/table for this — a derived
  badge + email covers the need. A notifications table only becomes worth it
  if/when messaging (#12) lands.
- Renter-side actions (accept/decline reschedule) should symmetrically
  notify the owner — same trigger, opposite direction; the owner dashboard
  already has a tours view to link to.
