# 5. Add-to-calendar for confirmed tours

**Impact: medium, effort: small.** A tour is a real-world appointment, but
the renter has to copy it into their calendar by hand. Missed tours hurt
both sides.

## The flow

1. A tour reaches `confirmed` status. Its card on `/tour` shows an
   **"Add to calendar"** action next to the existing details.
2. Tapping it offers two paths (small dropdown or two inline links):
   - **Google Calendar** — a prebuilt `calendar.google.com/render?action=TEMPLATE`
     URL (pure link, no API) with title, start/end, and location.
   - **Download .ics** — works for Apple/Outlook/everything else.
3. The event contains: title "Tour: {listing title}", start = `date` +
   `time`, duration = the same `TOUR_DURATION_MIN = 30` assumption the route
   planner already uses, location = the listing's address/coords (Apple/Google
   Maps can route from coords), description = link back to the listing and
   to `/tour`, plus the owner's name.
4. If a reschedule is later accepted, the card simply offers the action
   again for the new time (no attempt to update a previously exported
   event — out of scope, and .ics UID reuse is unreliable across clients).

## Why it's worth doing early

It's a leaf feature: no schema changes, no new dependencies, no server work
(the `.ics` can be generated client-side as a `data:` URL or via a tiny route
handler). High perceived polish for roughly a day of work.

## Integration points

- **Card UI:** `tour/components/renter-tour-card.tsx` — the action only
  renders for `status === "confirmed"` and future dates (the card already
  distinguishes these; see `parseYmd` usage in `renter-tours.tsx`).
- **Event fields** all exist on `TourRequest` (`schemas/tour/index.ts`):
  `date`, `time`, listing via `listingId`. Coordinates via the same
  `lat`/`lng` → `coordsOf()` fallback the maps use.
- **Locale:** event title/description strings go through the existing
  `tour` message namespace (vi/en).

## Scope notes

- Skip calendar-sync APIs (OAuth, Google Calendar API) entirely — the
  template-URL + .ics combo covers every mainstream calendar with zero auth.
- A natural companion to #2 (notifications): the confirmation email should
  embed the same two links.
