# 12. Renter ↔ owner messaging

**Impact: high, effort: the largest on this list — build after #2/#4.**
Today the only renter→owner channel is the one-shot note on a tour request,
and there is no owner→renter channel at all beyond status changes. Every
real question ("is the deposit negotiable?", "can I bring a cat?", "I'm
running 10 minutes late") has nowhere to go.

## The flow (deliberately scoped: per-tour threads, not open DMs)

1. Every tour request creates a **message thread** between that renter and
   that owner, anchored to the tour. The renter's booking note becomes the
   thread's first message — the feature retrofits naturally.
2. Renter side: each tour card on `/tour` gains a **"Messages"** affordance
   with an unread count. Tapping expands the thread inline (matching how the
   day-route view expands inline rather than navigating away).
3. Owner side: the dashboard tours page mirrors it — thread per tour
   request, unread counts, reply inline.
4. Messages are plain text in v1. Timestamps, sender name, that's it.
5. Unread state feeds the same header badge as #2 — by this point a real
   `notifications`/unread model is justified; #2's "derived badge" approach
   gets upgraded rather than duplicated.
6. Thread goes read-only some period after the tour date passes or when the
   tour is declined (keeps threads from becoming indefinite open DMs and
   bounds moderation surface).

## Why tour-anchored, not open chat

- **Spam/abuse containment:** you can only message someone you have a real
  appointment with. No cold-contact harassment problem, no need for
  blocking/reporting machinery in v1.
- **Context for free:** every thread has a listing, a date, and a purpose —
  the UI never needs a "which apartment is this about?" affordance.
- It reuses the tour lifecycle as its permission model, which RLS can
  express directly (thread participants = tour's renter + listing's owner).

## Integration points

- **Data:** `messages` table: `id, tour_id, sender_id, body, created_at,
  read_at`. RLS: sender/recipient derived from the `tours` row. Schema
  mirror in `schemas/message/`.
- **Live updates:** Supabase Realtime subscription on the thread while it's
  open; the repo already uses TanStack Query (`hooks/use-*`), so the
  subscription invalidates/appends to a `useMessages(tourId)` query. Polling
  fallback is acceptable for v1 if Realtime adds friction.
- **UI:** thread component shared by `tour/components/renter-tour-card.tsx`
  and the owner dashboard tours view — same component, two mount points.
- **Email nudge:** "New message about your tour" via the provider set up in
  #2, throttled (max one email per thread per N hours).

## Scope notes / risks

- No attachments, no typing indicators, no message editing in v1.
- Decide early whether the tour `note`/`reschedule` proposals should
  *become* messages (unified timeline) or stay separate fields with the
  thread alongside. Recommendation: keep them separate in v1, render them
  as inline system events in the thread UI — no data migration, full
  timeline readability.
- This is the feature that most increases operational surface (abuse,
  retention policy). The tour-anchored scoping is what keeps it shippable.
